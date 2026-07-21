import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { AppError } from '../middleware/errorHandler.js';
import { isHardToFetchJobHost, jobFetchFallbackMessage } from './jobFetchHosts.js';
import { fetchLinkedInJobPosting, isLinkedInJobUrl } from './linkedinGuestFetch.js';

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_BYTES = 1_500_000;

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.google',
]);

function isPrivateIp(ip: string): boolean {
  if (ip.includes(':')) {
    const normalized = ip.toLowerCase();
    return (
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe80')
    );
  }

  const parts = ip.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return true;
  }

  const a = parts[0]!;
  const b = parts[1]!;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

export async function assertSafePublicUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new AppError(400, 'Invalid URL');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new AppError(400, 'Only http and https URLs are allowed');
  }

  if (parsed.username || parsed.password) {
    throw new AppError(400, 'URLs with credentials are not allowed');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new AppError(400, 'That host is not allowed');
  }

  const literalIp = isIP(hostname) ? hostname : null;
  if (literalIp && isPrivateIp(literalIp)) {
    throw new AppError(400, 'Private network addresses are not allowed');
  }

  if (!literalIp) {
    let addresses: string[];
    try {
      const lookedUp = await lookup(hostname, { all: true });
      addresses = lookedUp.map((entry) => entry.address);
    } catch {
      throw new AppError(400, 'Could not resolve that host');
    }

    if (addresses.length === 0 || addresses.some((address) => isPrivateIp(address))) {
      throw new AppError(400, 'That host resolves to a private network address');
    }
  }

  return parsed;
}

export async function fetchUrlText(
  rawUrl: string,
  options: { timeoutMs?: number; maxBytes?: number } = {},
): Promise<string> {
  const parsed = await assertSafePublicUrl(rawUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

  // LinkedIn jobs/view pages are blocked; use the public jobs-guest API
  // (same approach as ai-job-search linkedin-search).
  if (isLinkedInJobUrl(parsed.toString())) {
    const { text } = await fetchLinkedInJobPosting(parsed.toString());
    return text;
  }

  if (isHardToFetchJobHost(parsed.hostname)) {
    throw new AppError(400, jobFetchFallbackMessage(parsed.hostname));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(parsed.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'MatchMindApplyBot/1.0',
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new AppError(400, jobFetchFallbackMessage(parsed.hostname, response.status));
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (
      contentType &&
      !contentType.includes('text/') &&
      !contentType.includes('json') &&
      !contentType.includes('html') &&
      !contentType.includes('xml')
    ) {
      throw new AppError(400, 'That link did not return a readable job posting. Paste the job description instead.');
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > maxBytes) {
      throw new AppError(400, 'That page is too large to fetch. Paste the job description instead.');
    }

    const text = new TextDecoder('utf-8').decode(buffer);
    const stripped = htmlToReadableText(text);
    if (stripped.trim().length < 80) {
      throw new AppError(
        400,
        'Could not extract a usable job posting from that link. Paste the job description instead.',
      );
    }

    return stripped;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError(400, 'Timed out opening that link. Paste the job description instead.');
    }

    throw new AppError(400, 'Could not open that link. Paste the job description instead.');
  } finally {
    clearTimeout(timer);
  }
}

export function htmlToReadableText(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');

  const withBreaks = withoutScripts
    .replace(/<\/(p|div|h1|h2|h3|h4|li|tr|br|section|article)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n');

  const noTags = withBreaks.replace(/<[^>]+>/g, ' ');
  return noTags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
