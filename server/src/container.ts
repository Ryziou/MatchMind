import type { Env } from './config/env.js';
import { GeminiProvider } from './ai/providers/gemini.provider.js';
import type { AIProviders } from './ai/providers/types.js';
import { ChromaClientWrapper } from './db/chroma/client.js';
import { AnalysisService } from './services/analysis.service.js';
import { ChatService } from './services/chat.service.js';
import { SessionService } from './services/session.service.js';

export interface AppContainer {
  env: Env;
  ai: AIProviders;
  chroma: ChromaClientWrapper;
  sessionService: SessionService;
  analysisService: AnalysisService;
  chatService: ChatService;
}

export function createContainer(env: Env): AppContainer {
  const ai = new GeminiProvider(env);
  const chroma = new ChromaClientWrapper(env);
  const partial = { env, ai, chroma };
  const container = {
    ...partial,
    sessionService: null as unknown as SessionService,
    analysisService: null as unknown as AnalysisService,
    chatService: null as unknown as ChatService,
  } as AppContainer;

  container.sessionService = new SessionService(container);
  container.analysisService = new AnalysisService(container);
  container.chatService = new ChatService(container);

  return container;
}
