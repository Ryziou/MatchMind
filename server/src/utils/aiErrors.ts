export function formatProviderError(error: unknown, model: string): Error {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();

  if (
    lower.includes('503') ||
    lower.includes('high demand') ||
    lower.includes('unavailable') ||
    lower.includes('overloaded')
  ) {
    return new Error(
      `${model} is temporarily unavailable due to high demand. Please try again in a moment.`,
    );
  }

  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('quota')) {
    return new Error(
      `${model} is rate limited right now. Please wait a moment and try again.`,
    );
  }

  if (lower.includes('401') || lower.includes('403') || lower.includes('api key')) {
    return new Error(
      `${model} rejected the request. Check that the API key is valid and has access to this model.`,
    );
  }

  if (lower.includes('googlegenerativeai') || lower.includes('generativelanguage.googleapis.com')) {
    return new Error(
      `${model} could not complete the request. Please try again shortly.`,
    );
  }

  return error instanceof Error ? error : new Error(raw);
}
