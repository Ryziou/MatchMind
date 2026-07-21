export function buildCompanyBriefPrompt(
  companyName: string,
  sources: Array<{ title: string; url: string; text: string }>,
): string {
  const sourceBlock = sources
    .map(
      (source, index) =>
        `Source ${index + 1}: ${source.title}\nURL: ${source.url}\n"""\n${source.text}\n"""`,
    )
    .join('\n\n');

  return `You are researching "${companyName}" for a job application cover letter.

Using ONLY the sources below, produce a CompanyBrief JSON:
- mission: short factual summary or empty string if unknown
- productsOrServices: concrete offerings grounded in sources
- recentNews: only if present in sources
- cultureSignals: only if present
- anglesForCoverLetter: 2-4 truthful hooks the applicant could use, each grounded in sources
- sources: list the title+url you actually used
- researchStatus: will be overwritten by the server; set "complete"

Never invent facts not supported by the sources. If sparse, keep arrays short.

${sourceBlock}`;
}
