import { z } from 'zod';
import { interviewQuestionSchema } from './analysis.js';

export const applyRequestSchema = z
  .object({
    jobUrl: z.string().url().optional(),
    jobDescription: z.string().optional(),
    companyName: z.string().trim().min(1).optional(),
    companyUrl: z.string().url().optional(),
  })
  .superRefine((value, ctx) => {
    const hasUrl = Boolean(value.jobUrl?.trim());
    const hasJd = Boolean(value.jobDescription?.trim());
    if (!hasUrl && !hasJd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide a job posting URL and/or a pasted job description',
        path: ['jobUrl'],
      });
    }
  });

export const resolvedPostingSchema = z.object({
  roleTitle: z.string().optional(),
  companyName: z.string().min(1),
  companyUrl: z.string().url().optional(),
  jobDescription: z.string().min(1),
  source: z.enum(['url', 'pasted']),
  postingLanguage: z.string().optional(),
});

export const applyDraftSchema = z.object({
  cvTex: z.string().min(1),
  coverLetterTex: z.string().min(1),
  cvPreviewMarkdown: z.string().optional(),
  coverLetterPreviewMarkdown: z.string().optional(),
});

export const companyBriefSourceSchema = z.object({
  title: z.string(),
  url: z.string().url(),
});

export const companyBriefSchema = z.object({
  companyName: z.string(),
  mission: z.string(),
  productsOrServices: z.array(z.string()),
  recentNews: z.array(z.string()),
  cultureSignals: z.array(z.string()),
  anglesForCoverLetter: z.array(z.string()),
  sources: z.array(companyBriefSourceSchema),
  researchStatus: z.enum(['complete', 'partial', 'skipped']),
});

export const reviewerEditSchema = z.object({
  target: z.enum(['cvTex', 'coverLetterTex']),
  oldText: z.string(),
  newText: z.string(),
  reason: z.string(),
});

export const reviewerFeedbackSchema = z.object({
  structuredEdits: z.array(reviewerEditSchema),
  missedKeywords: z.array(z.string()),
  companyAngles: z.array(z.string()),
  reframingNotes: z.array(z.string()),
  toneNotes: z.array(z.string()),
});

export const atsKeywordStatusSchema = z.enum([
  'covered',
  'synonym',
  'missing_have',
  'missing_gap',
]);

export const atsKeywordRowSchema = z.object({
  keyword: z.string(),
  priority: z.enum(['required', 'preferred']),
  status: atsKeywordStatusSchema,
  note: z.string(),
});

export const applyProgressStageSchema = z.enum([
  'fetching_posting',
  'retrieving_sections',
  'drafting',
  'researching_company',
  'reviewing',
  'revising',
  'compiling',
  'ats_check',
  'complete',
  'error',
  'needs_company',
]);

export const applyProgressEventSchema = z.object({
  stage: applyProgressStageSchema,
  message: z.string().optional(),
});

export const applyFitSummarySchema = z.object({
  overallMatchScore: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  missingSkills: z.array(z.string()),
});

export const applyResultSchema = z.object({
  fitSummary: applyFitSummarySchema,
  companyBrief: companyBriefSchema,
  cvText: z.string(),
  coverLetterText: z.string(),
  reviewerNotes: reviewerFeedbackSchema,
  atsTable: z.array(atsKeywordRowSchema),
  interviewQuestions: z.array(interviewQuestionSchema),
  jobDescription: z.string(),
  cvPageCount: z.number().int().nonnegative(),
  coverLetterPageCount: z.number().int().nonnegative(),
  retrievedChunkIds: z.array(z.string()),
  tailoringDecisions: z.array(z.string()),
  resolvedCompanyName: z.string(),
  resolvedRoleTitle: z.string().optional(),
  compileWarnings: z.array(z.string()),
  downloadsAvailable: z.object({
    cvPdf: z.boolean(),
    coverLetterPdf: z.boolean(),
    sourcesZip: z.boolean(),
  }),
});

export const applyCompleteEventSchema = z.object({
  stage: z.literal('complete'),
  sessionId: z.string().uuid(),
  apply: applyResultSchema,
});

export const applyNeedsCompanyEventSchema = z.object({
  stage: z.literal('needs_company'),
  sessionId: z.string().uuid(),
  message: z.string(),
  suggestedCompanyName: z.string().optional(),
  suggestedCompanyUrl: z.string().url().optional(),
  jobDescription: z.string().optional(),
});

export type ApplyRequest = z.infer<typeof applyRequestSchema>;
export type ResolvedPosting = z.infer<typeof resolvedPostingSchema>;
export type ApplyDraft = z.infer<typeof applyDraftSchema>;
export type CompanyBrief = z.infer<typeof companyBriefSchema>;
export type ReviewerFeedback = z.infer<typeof reviewerFeedbackSchema>;
export type AtsKeywordRow = z.infer<typeof atsKeywordRowSchema>;
export type ApplyProgressStage = z.infer<typeof applyProgressStageSchema>;
export type ApplyProgressEvent = z.infer<typeof applyProgressEventSchema>;
export type ApplyFitSummary = z.infer<typeof applyFitSummarySchema>;
export type ApplyResult = z.infer<typeof applyResultSchema>;
export type ApplyCompleteEvent = z.infer<typeof applyCompleteEventSchema>;
export type ApplyNeedsCompanyEvent = z.infer<typeof applyNeedsCompanyEventSchema>;
