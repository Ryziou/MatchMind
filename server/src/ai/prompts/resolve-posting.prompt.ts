export function buildResolvePostingPrompt(rawText: string, jobUrl?: string): string {
  return `Extract structured fields from this job posting text.

Rules:
- jobDescription must be the cleaned full posting text useful for application drafting (keep requirements and responsibilities).
- companyName only if clearly stated or strongly implied by the posting. If anonymized ("a client", "confidential"), leave companyName empty.
- companyUrl only if an official company website is explicitly present (not the job board URL).
- postingLanguage: ISO-ish label like "English" or "Danish".

${jobUrl ? `Job URL (may hint company via path): ${jobUrl}\n` : ''}
Posting text:
"""
${rawText.slice(0, 20000)}
"""

Return JSON only matching the schema.`;
}
