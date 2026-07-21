import type { StoredChunk } from '../../db/chroma/collections.js';

export function buildApplyInterviewPrompt(
  jobDescription: string,
  companyName: string,
  roleTitle: string | undefined,
  chunks: StoredChunk[],
): string {
  const evidence = chunks
    .map((chunk) => `[Chunk ${chunk.id} | ${chunk.metadata.section}]\n${chunk.text}`)
    .join('\n\n');

  return `You are preparing interview questions for a candidate applying to ${roleTitle ?? 'a role'} at ${companyName}.

Use only the job description and CV evidence below. Do not invent employers or skills.

Return JSON:
{
  "interviewQuestions": [
    {
      "question": string,
      "rationale": string,
      "exampleAnswer": string,
      "commonMistakes": string[]
    }
  ]
}

Provide 4-6 likely questions grounded in the posting and the candidate's evidenced background.
exampleAnswer must stay consistent with CV evidence (no fabricated metrics).

Job description:
"""
${jobDescription.slice(0, 10000)}
"""

CV evidence:
${evidence}`;
}
