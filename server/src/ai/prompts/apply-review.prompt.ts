import type { CompanyBrief } from '@matchmind/shared';
import type { StoredChunk } from '../../db/chroma/collections.js';
import type { DraftContent } from './apply-draft.prompt.js';

function formatChunks(chunks: StoredChunk[]): string {
  return chunks
    .map((chunk) => `[Chunk ${chunk.id} | Section: ${chunk.metadata.section}]\n${chunk.text}`)
    .join('\n\n');
}

export function buildApplyReviewPrompt(
  jobDescription: string,
  draft: DraftContent,
  companyBrief: CompanyBrief,
  chunks: StoredChunk[],
): string {
  return `You are a hiring-manager proxy reviewing a tailored job application draft.

Critique the draft using:
1) the job description
2) CV evidence chunks (facts only)
3) the company brief (company claims only from here; cite source URLs in companyAngles notes)

Rules:
- Never suggest fabricating skills, employers, or metrics absent from CV chunks.
- Never suggest company facts absent from the company brief.
- Prefer structuredEdits with exact oldText/newText substrings from the draft fields below.
- target is "cvTex" for CV-side fields (profile, experience bullets, skills items, education details, project descriptions) or "coverLetterTex" for cover letter fields (coverBodyMarkdown, coverGreeting, coverRecipientBlock).
- If the draft still includes clearly unrelated careers for a software/developer posting (SEO, pure marketing, etc.), call that out in reframingNotes and prefer structuredEdits that remove those experience bullets/roles when oldText matches.

Job description:
"""
${jobDescription.slice(0, 10000)}
"""

Company brief (researchStatus=${companyBrief.researchStatus}):
${JSON.stringify(companyBrief, null, 2)}

CV evidence:
${formatChunks(chunks)}

Draft JSON:
${JSON.stringify(draft, null, 2)}

Return ReviewerFeedback JSON with structuredEdits, missedKeywords, companyAngles, reframingNotes, toneNotes.`;
}
