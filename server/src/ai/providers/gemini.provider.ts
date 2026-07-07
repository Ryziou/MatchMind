import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';
import type { ZodSchema } from 'zod';
import type { Env } from '../../config/env.js';
import type { AIProviders, LLMResult, LLMUsage } from './types.js';
import { JsonGenerationError } from '../../utils/generateValidatedJson.js';

const EMBEDDING_MODEL = 'gemini-embedding-001';

export class GeminiProvider implements AIProviders {
  private readonly client: GoogleGenerativeAI;
  private readonly generationModel: string;

  constructor(private readonly env: Env) {
    this.client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    this.generationModel = env.GEMINI_GENERATION_MODEL;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const model = this.client.getGenerativeModel({ model: EMBEDDING_MODEL });
    const embeddings: number[][] = [];

    for (const text of texts) {
      const result = await model.embedContent({
        content: { role: 'user', parts: [{ text }] },
        taskType: TaskType.RETRIEVAL_DOCUMENT,
      });
      const values = result.embedding.values;

      if (!values || values.length === 0) {
        throw new Error('Gemini returned an empty embedding');
      }

      embeddings.push(values);
    }

    return embeddings;
  }

  async embedQuery(text: string): Promise<number[]> {
    const model = this.client.getGenerativeModel({ model: EMBEDDING_MODEL });
    const result = await model.embedContent({
      content: { role: 'user', parts: [{ text }] },
      taskType: TaskType.RETRIEVAL_QUERY,
    });
    const values = result.embedding.values;

    if (!values || values.length === 0) {
      throw new Error('Failed to embed query');
    }

    return values;
  }

  async generateJSON<T>(prompt: string, schema: ZodSchema<T>): Promise<LLMResult<T>> {
    const model = this.client.getGenerativeModel({
      model: this.generationModel,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const usage = extractUsage(result.response.usageMetadata);

    try {
      const parsed: unknown = JSON.parse(rawText);
      const data = schema.parse(parsed);
      return { data, usage, rawText };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON response';
      throw new JsonGenerationError(message, rawText);
    }
  }
}

function extractUsage(metadata?: {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}): LLMUsage {
  return {
    promptTokens: metadata?.promptTokenCount ?? 0,
    completionTokens: metadata?.candidatesTokenCount ?? 0,
    totalTokens: metadata?.totalTokenCount ?? 0,
  };
}
