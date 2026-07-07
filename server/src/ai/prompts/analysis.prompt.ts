import type { StoredChunk } from '../../db/chroma/collections.js';

export function buildAnalysisPrompt(jobDescription: string, chunks: StoredChunk[]): string {
  const chunkBlocks = chunks
    .map(
      (chunk) =>
        `[Chunk ${chunk.id} | Section: ${chunk.metadata.section}]\n${chunk.text}`,
    )
    .join('\n\n');

  return `You are an expert technical recruiter and career coach.

Analyze how well the candidate's CV matches the job description below.

IMPORTANT RULES:
- Use ONLY the retrieved CV chunks provided. Do not invent experience that is not supported by the chunks.
- If evidence is missing, reflect that in missingSkills and lower relevant scores.
- Return JSON only, matching the required schema exactly.

Job Description:
${jobDescription.trim()}

Retrieved CV Chunks:
${chunkBlocks}

Return a JSON object with this shape:
{
  "overallMatchScore": number (0-100),
  "skillBreakdown": {
    "commercialExperience": number (0-100),
    "aiExperience": number (0-100),
    "cloudExperience": number (0-100),
    "communication": number (0-100),
    "problemSolving": number (0-100)
  },
  "strengths": string[],
  "missingSkills": string[],
  "cvImprovements": [{ "section": string, "current": string, "suggested": string }],
  "coverLetter": string,
  "interviewQuestions": [{ "question": string, "rationale": string }]
}`;
}
