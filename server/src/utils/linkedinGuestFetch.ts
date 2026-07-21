import { AppError } from '../middleware/errorHandler.js';

/** Same public endpoint used by ai-job-search linkedin-search skill. */
export const LINKEDIN_DETAIL_URL =
  'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting';

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export function isLinkedInJobUrl(rawUrl: string): boolean {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    return host === 'linkedin.com' || host.endsWith('.linkedin.com');
  } catch {
    return false;
  }
}

/** Accept a raw job ID, a job-view URL, or a job URN (ai-job-search normalizeId). */
export function extractLinkedInJobId(input: string): string | null {
  const urn = input.match(/urn:li:jobPosting:(\d+)/);
  if (urn?.[1]) return urn[1];

  const fromView = input.match(/\/jobs\/view\/[^/?#]*?(\d{6,})/i);
  if (fromView?.[1]) return fromView[1];

  const fromDash = input.match(/-(\d{6,})(?:\?|$|\/)/);
  if (fromDash?.[1]) return fromDash[1];

  const fromPath = input.match(/\/(\d{6,})(?:\?|$|\/)/);
  if (fromPath?.[1]) return fromPath[1];

  const bare = input.match(/^\d{6,}$/);
  if (bare) return input;

  return null;
}

function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : '';
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec: string) => numericEntity(parseInt(dec, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex: string) => numericEntity(parseInt(hex, 16)))
    .replace(/&nbsp;/g, ' ');
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function clean(html: string): string {
  return decodeHtmlEntities(stripTags(html));
}

export interface LinkedInJobDetail {
  id: string;
  title: string;
  company: string | null;
  companyUrl: string | null;
  location: string | null;
  description: string | null;
  seniority: string | null;
  employmentType: string | null;
  url: string;
}

export function parseLinkedInJobDetail(html: string, id: string): LinkedInJobDetail {
  const title = html.match(
    /class="(?:top-card-layout__title|topcard__title)[^"]*"[^>]*>([\s\S]*?)<\/h[12]>/i,
  )?.[1];
  const orgMatch = html.match(
    /class="topcard__org-name-link[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i,
  );
  const company = orgMatch ? clean(orgMatch[2]!) || null : null;
  const companyUrl = orgMatch ? decodeHtmlEntities(orgMatch[1]!).split('?')[0]! : null;

  const locMatch = html.match(
    /class="topcard__flavor topcard__flavor--bullet"[^>]*>([\s\S]*?)<\/span>/i,
  );
  const location = locMatch ? clean(locMatch[1]!) || null : null;

  let description: string | null = null;
  const desc = html.match(
    /class="(?:show-more-less-html__markup|description__text[^"]*)"[^>]*>([\s\S]*?)<\/div>/i,
  );
  if (desc?.[1]) {
    const withBreaks = desc[1]
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, '\n');
    description =
      decodeHtmlEntities(stripTags(withBreaks)).replace(/\n{3,}/g, '\n\n').trim() || null;
  }

  const criteria: Record<string, string> = {};
  const itemRe =
    /class="description__job-criteria-subheader"[^>]*>([\s\S]*?)<\/h3>[\s\S]*?class="description__job-criteria-text[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
  let cm: RegExpExecArray | null;
  while ((cm = itemRe.exec(html)) !== null) {
    criteria[clean(cm[1]!).toLowerCase()] = clean(cm[2]!);
  }

  return {
    id,
    title: title ? clean(title) : '(untitled)',
    company,
    companyUrl,
    location,
    description,
    seniority: criteria['seniority level'] ?? null,
    employmentType: criteria['employment type'] ?? null,
    url: `https://www.linkedin.com/jobs/view/${id}`,
  };
}

export function linkedInJobToPostingText(job: LinkedInJobDetail): string {
  const lines = [
    `Title: ${job.title}`,
    job.company ? `Company: ${job.company}` : null,
    job.location ? `Location: ${job.location}` : null,
    job.seniority ? `Seniority: ${job.seniority}` : null,
    job.employmentType ? `Employment: ${job.employmentType}` : null,
    '',
    job.description || '',
    '',
    `Source: ${job.url}`,
  ].filter((line): line is string => line !== null);

  return lines.join('\n').trim();
}

/** Fetch a LinkedIn job via the public jobs-guest detail endpoint. */
export async function fetchLinkedInJobPosting(rawUrlOrId: string): Promise<{
  text: string;
  job: LinkedInJobDetail;
}> {
  const id = extractLinkedInJobId(rawUrlOrId);
  if (!id) {
    throw new AppError(
      400,
      'Could not parse a LinkedIn job ID from that URL. Paste the job description instead.',
    );
  }

  const response = await fetch(`${LINKEDIN_DETAIL_URL}/${id}`, {
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'X-Requested-With': 'XMLHttpRequest',
    },
    redirect: 'follow',
  });

  if (response.status === 404) {
    throw new AppError(400, 'LinkedIn job not found. Paste the job description instead.');
  }

  if (!response.ok) {
    throw new AppError(
      400,
      `LinkedIn guest fetch failed (HTTP ${response.status}). Paste the job description instead.`,
    );
  }

  const html = await response.text();
  const job = parseLinkedInJobDetail(html, id);
  if (!job.description || job.description.length < 40) {
    throw new AppError(
      400,
      'Could not extract a usable description from LinkedIn. Paste the job description instead.',
    );
  }

  return { text: linkedInJobToPostingText(job), job };
}
