/** Hosts that commonly block generic HTML fetches (not LinkedIn guest API). */
const HARD_FETCH_HOST_SUFFIXES = [
  'indeed.com',
  'www.indeed.com',
  'glassdoor.com',
  'www.glassdoor.com',
];

export function isHardToFetchJobHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return HARD_FETCH_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

export function jobFetchFallbackMessage(hostname?: string, httpStatus?: number): string {
  if (hostname && isHardToFetchJobHost(hostname)) {
    return (
      `${hostname} blocks automated access to job postings. ` +
      'Copy the full job description from the page and paste it into “Or paste job description”, then try again.'
    );
  }

  if (httpStatus === 403 || httpStatus === 401 || httpStatus === 999) {
    return (
      `Could not open that link (HTTP ${httpStatus}). The site likely blocks automated access. ` +
      'Paste the full job description instead.'
    );
  }

  if (httpStatus) {
    return `Could not open that link (HTTP ${httpStatus}). Paste the job description instead.`;
  }

  return 'Could not open that link. Paste the job description instead.';
}
