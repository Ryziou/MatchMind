import { extractUrlFromJobInput, isUrlOnlyJobInput, type ApplyRequest } from '@matchmind/shared';

/**
 * Normalize Apply input so a bare URL in jobDescription is never used as JD text.
 * Promotes URL-only JD into jobUrl for fetching.
 */
export function normalizeApplyRequest(input: ApplyRequest): ApplyRequest {
  const jobUrl = input.jobUrl?.trim();
  const jobDescription = input.jobDescription?.trim();

  if (jobUrl) {
    return {
      ...input,
      jobUrl,
      jobDescription:
        jobDescription && !isUrlOnlyJobInput(jobDescription) ? jobDescription : undefined,
      companyName: input.companyName?.trim() || undefined,
      companyUrl: input.companyUrl?.trim() || undefined,
    };
  }

  if (jobDescription && isUrlOnlyJobInput(jobDescription)) {
    const extracted = extractUrlFromJobInput(jobDescription);
    if (!extracted) {
      return input;
    }
    return {
      ...input,
      jobUrl: extracted,
      jobDescription: undefined,
      companyName: input.companyName?.trim() || undefined,
      companyUrl: input.companyUrl?.trim() || undefined,
    };
  }

  return {
    ...input,
    jobUrl: undefined,
    jobDescription: jobDescription || undefined,
    companyName: input.companyName?.trim() || undefined,
    companyUrl: input.companyUrl?.trim() || undefined,
  };
}
