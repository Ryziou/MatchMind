/**
 * True when the input is only a bare URL (or URL with negligible whitespace),
 * not real job-description prose. Such input must never be treated as JD text.
 */
export function isUrlOnlyJobInput(text: string | undefined | null): boolean {
  if (!text) {
    return false;
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }

  // Single-token URL
  if (/^https?:\/\/\S+$/i.test(trimmed)) {
    return true;
  }

  // URL plus only tiny noise (punctuation/whitespace) still counts as URL-only
  const withoutUrl = trimmed.replace(/^https?:\/\/\S+/i, '').trim();
  if (/^https?:\/\/\S+/i.test(trimmed) && withoutUrl.length < 8) {
    return true;
  }

  return false;
}

export function extractUrlFromJobInput(text: string): string | null {
  const trimmed = text.trim();
  const match = trimmed.match(/^https?:\/\/\S+/i);
  return match ? match[0]!.replace(/[),.;]+$/, '') : null;
}
