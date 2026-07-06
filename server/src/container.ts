import type { Env } from './config/env.js';
import { GeminiProvider } from './ai/providers/gemini.provider.js';
import type { AIProviders } from './ai/providers/types.js';
import { ChromaClientWrapper } from './db/chroma/client.js';

export interface AppContainer {
  env: Env;
  ai: AIProviders;
  chroma: ChromaClientWrapper;
}

export function createContainer(env: Env): AppContainer {
  const ai = new GeminiProvider(env);
  const chroma = new ChromaClientWrapper(env);

  return { env, ai, chroma };
}
