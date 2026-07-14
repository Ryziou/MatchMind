import type { AIProviderName, ProviderOption, ProvidersResponse } from '@matchmind/shared';
import { GeminiProvider, OpenAIProvider } from './ai/providers/index.js';
import type { AIProviders } from './ai/providers/types.js';
import { isProviderConfigured, type Env } from './config/env.js';
import { ChromaClientWrapper } from './db/chroma/client.js';
import { AppError } from './middleware/errorHandler.js';
import { AnalysisService } from './services/analysis.service.js';
import { ChatService } from './services/chat.service.js';
import { SessionService } from './services/session.service.js';

const PROVIDER_LABELS: Record<AIProviderName, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI',
};

export interface AppContainer {
  env: Env;
  chroma: ChromaClientWrapper;
  getAiProvider: (name: AIProviderName) => AIProviders;
  listProviders: () => ProvidersResponse;
  assertProviderAvailable: (name: AIProviderName) => void;
  sessionService: SessionService;
  analysisService: AnalysisService;
  chatService: ChatService;
}

function createProviderInstance(env: Env, name: AIProviderName): AIProviders {
  if (name === 'openai') {
    return new OpenAIProvider(env);
  }

  return new GeminiProvider(env);
}

export function createContainer(
  env: Env,
  overrides?: Partial<Pick<AppContainer, 'chroma'> & { ai: AIProviders }>,
): AppContainer {
  const chroma = overrides?.chroma ?? new ChromaClientWrapper(env);
  const cache = new Map<AIProviderName, AIProviders>();

  const getAiProvider = (name: AIProviderName): AIProviders => {
    if (overrides?.ai) {
      return overrides.ai;
    }

    const cached = cache.get(name);
    if (cached) {
      return cached;
    }

    if (!isProviderConfigured(env, name)) {
      throw new AppError(
        400,
        `${PROVIDER_LABELS[name]} is not configured. Set the matching API key in the server environment.`,
      );
    }

    const provider = createProviderInstance(env, name);
    cache.set(name, provider);
    return provider;
  };

  const listProviders = (): ProvidersResponse => {
    const providers: ProviderOption[] = (['gemini', 'openai'] as const).map((id) => ({
      id,
      label: PROVIDER_LABELS[id],
      available: isProviderConfigured(env, id),
    }));

    const preferredAvailable = providers.find(
      (provider) => provider.id === env.AI_PROVIDER && provider.available,
    );
    const firstAvailable = providers.find((provider) => provider.available);
    const defaultProvider =
      preferredAvailable?.id ?? firstAvailable?.id ?? env.AI_PROVIDER;

    return { providers, defaultProvider };
  };

  const assertProviderAvailable = (name: AIProviderName): void => {
    if (overrides?.ai) {
      return;
    }

    if (!isProviderConfigured(env, name)) {
      throw new AppError(
        400,
        `${PROVIDER_LABELS[name]} is not configured. Set the matching API key in the server environment.`,
      );
    }
  };

  const container = {
    env,
    chroma,
    getAiProvider,
    listProviders,
    assertProviderAvailable,
    sessionService: undefined as unknown as SessionService,
    analysisService: undefined as unknown as AnalysisService,
    chatService: undefined as unknown as ChatService,
  } as AppContainer;

  container.sessionService = new SessionService(container);
  container.analysisService = new AnalysisService(container);
  container.chatService = new ChatService(container);

  return container;
}
