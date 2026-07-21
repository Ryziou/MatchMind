import type { StoredChunk } from '../../db/chroma/collections.js';

function formatChunks(chunks: StoredChunk[]): string {
  return chunks
    .map(
      (chunk) =>
        `[Chunk ${chunk.id} | Section: ${chunk.metadata.section}]\n${chunk.text}`,
    )
    .join('\n\n');
}

export function buildApplyFitPrompt(
  jobDescription: string,
  companyName: string,
  roleTitle: string | undefined,
  chunks: StoredChunk[],
): string {
  return `Evaluate fit between the candidate (from CV evidence only) and this job.

Company: ${companyName}
Role: ${roleTitle ?? 'Unknown'}

Job description:
"""
${jobDescription.slice(0, 12000)}
"""

CV evidence:
${formatChunks(chunks)}

Return JSON:
- overallMatchScore: 0-100
- strengths: short bullets grounded in chunks
- missingSkills: gaps vs the posting (honest; do not invent CV skills)

Never invent experience not in the chunks.`;
}
