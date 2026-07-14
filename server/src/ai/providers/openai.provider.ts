import OpenAI from 'openai';
import type { ZodSchema } from 'zod';
import type { Env } from '../../config/env.js';
import { formatProviderError } from '../../utils/aiErrors.js';
import { JsonGenerationError } from '../../utils/generateValidatedJson.js';
import type { AIProviders, LLMResult, LLMUsage } from './types.js';

export class OpenAIProvider implements AIProviders {
  private readonly client: OpenAI;
  private readonly generationModel: string;
  private readonly embeddingModel: string;

  constructor(private readonly env: Env) {
    if (!env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for the OpenAI provider');
    }

    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    this.generationModel = env.OPENAI_GENERATION_MODEL;
    this.embeddingModel = env.OPENAI_EMBEDDING_MODEL;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    try {
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        input: texts,
      });

      const byIndex = new Map(response.data.map((item) => [item.index, item.embedding]));
      return texts.map((_, index) => {
        const embedding = byIndex.get(index);
        if (!embedding || embedding.length === 0) {
          throw new Error(`OpenAI returned an empty embedding for index ${index}`);
        }
        return embedding;
      });
    } catch (error) {
      throw formatProviderError(error, this.embeddingModel);
    }
  }

  async embedQuery(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });
      const embedding = response.data[0]?.embedding;

      if (!embedding || embedding.length === 0) {
        throw new Error('Failed to embed query');
      }

      return embedding;
    } catch (error) {
      throw formatProviderError(error, this.embeddingModel);
    }
  }

  async generateJSON<T>(prompt: string, schema: ZodSchema<T>): Promise<LLMResult<T>> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.generationModel,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'Respond with valid JSON only. Do not include markdown fences or commentary.',
          },
          { role: 'user', content: prompt },
        ],
      });

      const rawText = response.choices[0]?.message?.content ?? '';
      const usage = extractUsage(response.usage);

      try {
        const parsed: unknown = JSON.parse(rawText);
        const data = schema.parse(parsed);
        return { data, usage, rawText };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid JSON response';
        throw new JsonGenerationError(message, rawText);
      }
    } catch (error) {
      if (error instanceof JsonGenerationError) {
        throw error;
      }

      throw formatProviderError(error, this.generationModel);
    }
  }
}

function extractUsage(usage?: {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}): LLMUsage {
  return {
    promptTokens: usage?.prompt_tokens ?? 0,
    completionTokens: usage?.completion_tokens ?? 0,
    totalTokens: usage?.total_tokens ?? 0,
  };
}
