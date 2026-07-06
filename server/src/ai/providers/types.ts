import type { ZodSchema } from 'zod';

export interface LLMUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMResult<T> {
  data: T;
  usage: LLMUsage;
  rawText: string;
}

export interface EmbeddingProvider {
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

export interface LLMProvider {
  generateJSON<T>(prompt: string, schema: ZodSchema<T>): Promise<LLMResult<T>>;
}

export interface AIProviders extends EmbeddingProvider, LLMProvider {}

export type AIProviderName = 'gemini' | 'openai';
