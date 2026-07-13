import {
  chatAnswerSchema,
  chatResponseSchema,
  type ChatMessage,
  type ChatResponse,
} from '@matchmind/shared';
import { buildChatPrompt } from '../ai/prompts/chat.prompt.js';
import type { AppContainer } from '../container.js';
import { sessionCollectionExists } from '../db/chroma/collections.js';
import { AppError } from '../middleware/errorHandler.js';
import { RetrievalService } from '../rag/retrieval/retrieval.service.js';
import { generateValidatedJson } from '../utils/generateValidatedJson.js';

export class ChatService {
  private readonly retrieval: RetrievalService;

  constructor(private readonly container: AppContainer) {
    this.retrieval = new RetrievalService(container);
  }

  async chat(
    sessionId: string,
    message: string,
    history: ChatMessage[],
    jobDescription?: string,
  ): Promise<ChatResponse> {
    const exists = await sessionCollectionExists(this.container.chroma, sessionId);
    if (!exists) {
      throw new AppError(404, 'Session not found');
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      throw new AppError(400, 'Message is required');
    }

    const trimmedJobDescription = jobDescription?.trim();
    const historyLimit = this.container.env.CHAT_HISTORY_TURNS;
    const recentHistory = history.slice(-historyLimit);

    const retrievalQuery = trimmedJobDescription
      ? `${trimmedMessage}\n\nJob description:\n${trimmedJobDescription}`
      : trimmedMessage;

    const retrievedChunks = await this.retrieval.retrieveForQuery(sessionId, retrievalQuery);
    const topK = this.container.env.RAG_TOP_K;

    if (retrievedChunks.length === 0) {
      throw new AppError(400, 'No relevant CV sections were retrieved for this question');
    }

    if (retrievedChunks.length > topK) {
      throw new AppError(500, 'Retrieved chunk count exceeded configured Top-K limit');
    }

    const retrievedChunkIds = retrievedChunks.map((chunk) => chunk.id);
    console.info(
      `[chat] session=${sessionId} retrievedChunkCount=${retrievedChunks.length} chunkIds=${retrievedChunkIds.join(',')} hasJobDescription=${Boolean(trimmedJobDescription)}`,
    );

    const prompt = buildChatPrompt(
      trimmedMessage,
      retrievedChunks,
      recentHistory,
      trimmedJobDescription,
    );
    const { data } = await generateValidatedJson(
      this.container.ai,
      prompt,
      chatAnswerSchema,
      { label: `chat:${sessionId}` },
    );

    const allowedIds = new Set(retrievedChunkIds);
    const citedChunkIds = data.citedChunkIds.filter((id) => allowedIds.has(id));

    return chatResponseSchema.parse({
      sessionId,
      answer: data.answer,
      citedChunkIds,
      retrievedChunkIds,
    });
  }
}
