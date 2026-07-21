import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import {
  applyCompleteEventSchema,
  applyFitSummarySchema,
  applyProgressEventSchema,
  applyResultSchema,
  atsKeywordRowSchema,
  interviewQuestionSchema,
  reviewerFeedbackSchema,
  type ApplyCompleteEvent,
  type ApplyProgressEvent,
  type ApplyRequest,
  type ApplyResult,
  type AtsKeywordRow,
  type CompanyBrief,
  type ReviewerFeedback,
} from '@matchmind/shared';
import type { AIProviders } from '../ai/providers/types.js';
import type { AppContainer } from '../container.js';
import { AppError } from '../middleware/errorHandler.js';
import { sessionCollectionExists } from '../db/chroma/collections.js';
import { RetrievalService } from '../rag/retrieval/retrieval.service.js';
import { generateValidatedJson } from '../utils/generateValidatedJson.js';
import { logger } from '../utils/logger.js';
import {
  buildApplyDraftPrompt,
  draftContentSchema,
  type DraftContent,
} from '../ai/prompts/apply-draft.prompt.js';
import { buildApplyFitPrompt } from '../ai/prompts/apply-fit.prompt.js';
import { buildApplyInterviewPrompt } from '../ai/prompts/apply-interview.prompt.js';
import { buildApplyReviewPrompt } from '../ai/prompts/apply-review.prompt.js';
import { JobPostingService } from './jobPosting.service.js';
import { CompanyResearchService } from './companyResearch.service.js';
import {
  buildCoverContactLine,
  buildModerncvContactCommands,
  coverClosingForTemplate,
  educationBlocksToLatex,
  experienceBlocksToLatex,
  markdownishToLatexBody,
  projectsSectionToLatex,
  renderCoverLetterTex,
  renderCvTex,
  skillsBlocksToLatex,
  splitCandidateName,
} from './latexTemplates.js';
import {
  ensureCleanDir,
  extractPdfText,
  LatexCompileService,
} from './latexCompile.service.js';
import { normalizeApplyRequest } from '../utils/normalizeApplyRequest.js';
import {
  formatCoverLetterPlainText,
  formatCvPlainText,
} from '../utils/draftPlainText.js';
import { z } from 'zod';

export type ApplyProgressHandler = (event: ApplyProgressEvent) => void;

export interface StoredApplyArtifacts {
  result: ApplyResult;
  cvTex: string;
  coverLetterTex: string;
  cvPdfPath: string | null;
  coverPdfPath: string | null;
  workDir: string;
}

const keywordItemSchema = z.object({
  keyword: z.string().min(1),
  priority: z.enum(['required', 'preferred']),
});

const keywordExtractObjectSchema = z.object({
  keywords: z.array(keywordItemSchema).max(12),
});

/** Accept object or bare array (Gemini often returns the latter). */
export const keywordExtractSchema = z.union([
  keywordExtractObjectSchema,
  z.array(keywordItemSchema).max(12),
]);

export function normalizeKeywordExtract(
  value: z.infer<typeof keywordExtractSchema>,
): z.infer<typeof keywordExtractObjectSchema> {
  return Array.isArray(value) ? { keywords: value } : value;
}

const trimDraftSchema = draftContentSchema;

const interviewBundleSchema = z.object({
  interviewQuestions: z.array(interviewQuestionSchema).min(1).max(8),
});

export class ApplyService {
  private readonly retrieval: RetrievalService;
  private readonly jobPosting: JobPostingService;
  private readonly companyResearch: CompanyResearchService;
  private readonly latex: LatexCompileService;
  private readonly artifacts = new Map<string, StoredApplyArtifacts>();

  constructor(private readonly container: AppContainer) {
    this.retrieval = new RetrievalService(container);
    this.jobPosting = new JobPostingService();
    this.companyResearch = new CompanyResearchService(container.env);
    this.latex = new LatexCompileService();
  }

  getArtifacts(sessionId: string): StoredApplyArtifacts | undefined {
    return this.artifacts.get(sessionId);
  }

  async applySession(
    sessionId: string,
    request: ApplyRequest,
    onProgress: ApplyProgressHandler,
  ): Promise<ApplyCompleteEvent> {
    const exists = await sessionCollectionExists(this.container.chroma, sessionId);
    if (!exists) {
      throw new AppError(404, 'Session not found');
    }

    const provider = await this.container.sessionService.getSessionProvider(sessionId);
    const ai = this.container.getAiProvider(provider);
    const normalized = normalizeApplyRequest(request);

    onProgress(applyProgressEventSchema.parse({ stage: 'fetching_posting' }));

    const posting = await this.jobPosting.resolvePosting(normalized, ai);

    onProgress(applyProgressEventSchema.parse({ stage: 'retrieving_sections' }));
    const chunks = await this.retrieval.retrieveForApply(
      sessionId,
      posting.jobDescription,
      ai,
    );
    if (chunks.length === 0) {
      throw new AppError(400, 'No relevant CV chunks were retrieved for this session');
    }
    if (chunks.length > this.container.env.APPLY_MAX_CHUNKS) {
      throw new AppError(500, 'Retrieved chunk count exceeded APPLY_MAX_CHUNKS');
    }

    const retrievedChunkIds = chunks.map((chunk) => chunk.id);
    logger.info(
      { sessionId, retrievedChunkCount: chunks.length, chunkIds: retrievedChunkIds },
      'Apply retrieval complete',
    );

    const fitPrompt = buildApplyFitPrompt(
      posting.jobDescription,
      posting.companyName,
      posting.roleTitle,
      chunks,
    );
    const { data: fitSummary } = await generateValidatedJson(ai, fitPrompt, applyFitSummarySchema, {
      label: `apply-fit:${sessionId}`,
    });

    onProgress(applyProgressEventSchema.parse({ stage: 'drafting' }));
    const draftPrompt = buildApplyDraftPrompt(
      posting.jobDescription,
      posting.companyName,
      posting.roleTitle,
      posting.postingLanguage,
      chunks,
    );
    const { data: draft } = await generateValidatedJson(ai, draftPrompt, draftContentSchema, {
      label: `apply-draft:${sessionId}`,
    });

    onProgress(applyProgressEventSchema.parse({ stage: 'researching_company' }));
    const companyBrief = await this.companyResearch.researchCompany(
      posting.companyName,
      posting.companyUrl,
      ai,
    );

    onProgress(applyProgressEventSchema.parse({ stage: 'reviewing' }));
    const reviewPrompt = buildApplyReviewPrompt(
      posting.jobDescription,
      draft,
      companyBrief,
      chunks,
    );
    const { data: feedback } = await generateValidatedJson(
      ai,
      reviewPrompt,
      reviewerFeedbackSchema,
      { label: `apply-review:${sessionId}` },
    );

    onProgress(applyProgressEventSchema.parse({ stage: 'revising' }));
    let revised = applyReviewerEdits(draft, feedback, companyBrief);

    onProgress(applyProgressEventSchema.parse({ stage: 'compiling' }));
    const workDir = path.join('uploads', sessionId, 'apply');
    await ensureCleanDir(workDir);

    let cvTex = await this.buildCvTex(revised);
    let coverTex = await this.buildCoverTex(revised);
    let cvCompile = await this.latex.writeAndCompile(workDir, 'cv', cvTex);
    let coverCompile = await this.latex.writeAndCompile(workDir, 'cover_letter', coverTex);
    const compileWarnings: string[] = [];

    if (cvCompile.warning) compileWarnings.push(cvCompile.warning);
    if (coverCompile.warning) compileWarnings.push(coverCompile.warning);

    if (
      (cvCompile.compiled && cvCompile.pageCount > 2) ||
      (coverCompile.compiled && coverCompile.pageCount > 1)
    ) {
      const trimPrompt = `The tailored application overflows page limits (CV must be <= 2 pages, cover letter exactly 1 page preferred).
Current pages: CV=${cvCompile.pageCount}, cover=${coverCompile.pageCount}.
Shorten the draft JSON without inventing new facts. Prefer cutting lowest-relevance bullets first.
Return the full DraftContent JSON again.

Current draft:
${JSON.stringify(revised, null, 2)}

Job description for relevance:
"""
${posting.jobDescription.slice(0, 8000)}
"""`;
      const { data: trimmed } = await generateValidatedJson(ai, trimPrompt, trimDraftSchema, {
        label: `apply-trim:${sessionId}`,
      });
      revised = trimmed;
      cvTex = await this.buildCvTex(revised);
      coverTex = await this.buildCoverTex(revised);
      cvCompile = await this.latex.writeAndCompile(workDir, 'cv', cvTex);
      coverCompile = await this.latex.writeAndCompile(workDir, 'cover_letter', coverTex);
      if (cvCompile.warning) compileWarnings.push(cvCompile.warning);
      if (coverCompile.warning) compileWarnings.push(coverCompile.warning);
    }

    onProgress(applyProgressEventSchema.parse({ stage: 'ats_check' }));
    const cvText = formatCvPlainText(revised);
    const coverLetterText = formatCoverLetterPlainText(revised);
    const atsTable = await this.buildAtsTable(
      ai,
      posting.jobDescription,
      cvCompile.pdfPath,
      cvText,
    );

    const interviewPrompt = buildApplyInterviewPrompt(
      posting.jobDescription,
      posting.companyName,
      posting.roleTitle,
      chunks,
    );
    const { data: interviewBundle } = await generateValidatedJson(
      ai,
      interviewPrompt,
      interviewBundleSchema,
      { label: `apply-interview:${sessionId}` },
    );

    const result = applyResultSchema.parse({
      fitSummary,
      companyBrief,
      cvText,
      coverLetterText,
      reviewerNotes: feedback,
      atsTable,
      interviewQuestions: interviewBundle.interviewQuestions,
      jobDescription: posting.jobDescription,
      cvPageCount: cvCompile.pageCount,
      coverLetterPageCount: coverCompile.pageCount,
      retrievedChunkIds,
      tailoringDecisions: revised.tailoringDecisions,
      resolvedCompanyName: posting.companyName,
      resolvedRoleTitle: posting.roleTitle,
      compileWarnings,
      downloadsAvailable: {
        cvPdf: Boolean(cvCompile.pdfPath),
        coverLetterPdf: Boolean(coverCompile.pdfPath),
        sourcesZip: true,
      },
    });

    this.artifacts.set(sessionId, {
      result,
      cvTex,
      coverLetterTex: coverTex,
      cvPdfPath: cvCompile.pdfPath,
      coverPdfPath: coverCompile.pdfPath,
      workDir,
    });

    await writeFile(path.join(workDir, 'apply-result.json'), JSON.stringify(result, null, 2));

    const complete = applyCompleteEventSchema.parse({
      stage: 'complete',
      sessionId,
      apply: result,
    });

    onProgress(applyProgressEventSchema.parse({ stage: 'complete' }));
    return complete;
  }

  private async buildCvTex(draft: DraftContent): Promise<string> {
    const { first, last } = splitCandidateName(draft.candidateName);
    return renderCvTex({
      nameFirst: first,
      nameLast: last,
      headline: draft.headline?.trim() || 'Software Developer',
      contactCommands: buildModerncvContactCommands(draft.contact),
      profile: draft.profile,
      experience: experienceBlocksToLatex(draft.experience),
      projectsSection: projectsSectionToLatex(draft.projects ?? []),
      skills: skillsBlocksToLatex(draft.skills),
      education: educationBlocksToLatex(draft.education),
    });
  }

  private async buildCoverTex(draft: DraftContent): Promise<string> {
    return renderCoverLetterTex({
      candidateName: draft.candidateName,
      contactLine: buildCoverContactLine(draft.contact),
      greeting: draft.coverGreeting,
      body: markdownishToLatexBody(draft.coverBodyMarkdown),
      closing: coverClosingForTemplate(draft.coverClosing, draft.candidateName),
    });
  }

  private async buildAtsTable(
    ai: AIProviders,
    jobDescription: string,
    cvPdfPath: string | null,
    cvPlainText: string,
  ): Promise<AtsKeywordRow[]> {
    const { data: extracted } = await generateValidatedJson(
      ai,
      `Extract up to 12 important skills/keywords from this job description for ATS coverage scoring.

Return ONLY a JSON object with this exact shape (not a top-level array):
{"keywords":[{"keyword":"TypeScript","priority":"required"},{"keyword":"React","priority":"preferred"}]}

priority must be "required" or "preferred".

"""
${jobDescription.slice(0, 10000)}
"""`,
      keywordExtractSchema,
      { label: 'apply-ats-keywords' },
    );
    const data = normalizeKeywordExtract(extracted);

    let haystack = cvPlainText.toLowerCase();
    if (cvPdfPath) {
      const extractedText = await extractPdfText(cvPdfPath);
      if (extractedText) {
        haystack = extractedText.toLowerCase();
      }
    }

    return data.keywords.map((row) => {
      const needle = row.keyword.toLowerCase();
      const covered = haystack.includes(needle);
      return atsKeywordRowSchema.parse({
        keyword: row.keyword,
        priority: row.priority,
        status: covered ? 'covered' : 'missing_gap',
        note: covered
          ? 'Found in CV text layer / plain text'
          : 'Not found in CV; do not stuff if unsupported by profile',
      });
    });
  }
}

export function applyReviewerEdits(
  draft: DraftContent,
  feedback: ReviewerFeedback,
  companyBrief: CompanyBrief,
): DraftContent {
  const next: DraftContent = structuredClone(draft);
  const briefBlob = JSON.stringify(companyBrief).toLowerCase();

  for (const edit of feedback.structuredEdits) {
    const lowerNew = edit.newText.toLowerCase();
    const looksLikeCompanyClaim =
      lowerNew.includes('company') ||
      lowerNew.includes(companyBrief.companyName.toLowerCase());

    if (
      companyBrief.researchStatus === 'skipped' &&
      looksLikeCompanyClaim &&
      !briefBlob.includes(lowerNew.slice(0, 40))
    ) {
      continue;
    }

    if (edit.target === 'coverLetterTex') {
      if (next.coverBodyMarkdown.includes(edit.oldText)) {
        next.coverBodyMarkdown = next.coverBodyMarkdown.replace(edit.oldText, edit.newText);
      }
      if (next.coverGreeting.includes(edit.oldText)) {
        next.coverGreeting = next.coverGreeting.replace(edit.oldText, edit.newText);
      }
      if (next.coverRecipientBlock.includes(edit.oldText)) {
        next.coverRecipientBlock = next.coverRecipientBlock.replace(edit.oldText, edit.newText);
      }
      continue;
    }

    if (next.profile.includes(edit.oldText)) {
      next.profile = next.profile.replace(edit.oldText, edit.newText);
    }
    for (const group of next.skills) {
      group.items = group.items.map((item) =>
        item.includes(edit.oldText) ? item.replace(edit.oldText, edit.newText) : item,
      );
      if (group.category.includes(edit.oldText)) {
        group.category = group.category.replace(edit.oldText, edit.newText);
      }
    }
    for (const role of next.experience) {
      role.bullets = role.bullets.map((bullet) =>
        bullet.includes(edit.oldText) ? bullet.replace(edit.oldText, edit.newText) : bullet,
      );
    }
    for (const entry of next.education) {
      if (entry.details?.includes(edit.oldText)) {
        entry.details = entry.details.replace(edit.oldText, edit.newText);
      }
    }
    for (const project of next.projects ?? []) {
      if (project.description.includes(edit.oldText)) {
        project.description = project.description.replace(edit.oldText, edit.newText);
      }
    }
  }

  return next;
}
