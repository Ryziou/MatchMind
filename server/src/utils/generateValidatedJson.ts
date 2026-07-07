import type { ZodSchema } from 'zod';
import type { AIProviders, LLMResult } from '../ai/providers/types.js';

const DEFAULT_MAX_RETRIES = 2;

export interface GenerateValidatedJsonOptions {
  maxRetries?: number;
  label?: string;
}

function buildRetryPrompt(originalPrompt: string, rawText: string, errorMessage: string): string {
  return `${originalPrompt}

Your previous response failed validation.
Error: ${errorMessage}
Previous output:
${rawText}

Return ONLY valid JSON that matches the required schema. Do not include markdown fences or commentary.`;
}

export async function generateValidatedJson<T>(
  ai: AIProviders,
  prompt: string,
  schema: ZodSchema<T>,
  options: GenerateValidatedJsonOptions = {},
): Promise<LLMResult<T>> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const label = options.label ?? 'llm';
  let currentPrompt = prompt;
  let lastError = 'Unknown validation error';

  for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
    try {
      const result = await ai.generateJSON(currentPrompt, schema);
      console.info(
        `[${label}] attempt=${attempt} promptTokens=${result.usage.promptTokens} completionTokens=${result.usage.completionTokens} totalTokens=${result.usage.totalTokens}`,
      );
      return result;
    } catch (error) {
      if (!(error instanceof JsonGenerationError)) {
        throw error;
      }

      lastError = error.message;
      const rawText = error.rawText;

      console.warn(`[${label}] attempt=${attempt} validation failed: ${lastError}`);

      if (attempt > maxRetries) {
        break;
      }

      currentPrompt = buildRetryPrompt(prompt, rawText ?? '', lastError);
    }
  }

  throw new Error(`Failed to generate valid JSON after ${maxRetries + 1} attempts: ${lastError}`);
}

export class JsonGenerationError extends Error {
  constructor(
    message: string,
    readonly rawText?: string,
  ) {
    super(message);
    this.name = 'JsonGenerationError';
  }
}
