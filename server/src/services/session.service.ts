import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AIProviderName, CreateSessionResponse, SessionQueryResponse } from '@matchmind/shared';
import { AppError } from '../middleware/errorHandler.js';
import type { AppContainer } from '../container.js';
import {
  deleteSessionCollection,
  querySessionChunks,
  sessionCollectionExists,
} from '../db/chroma/collections.js';
import { IngestionService } from '../rag/ingestion/ingestion.service.js';
import type { SupportedFileType } from '../rag/ingestion/parsers/index.js';
import { readSessionMeta, writeSessionMeta } from './sessionMeta.js';

const UPLOADS_DIR = 'uploads';

export class SessionService {
  private readonly ingestion: IngestionService;

  constructor(private readonly container: AppContainer) {
    this.ingestion = new IngestionService(container);
  }

  async createSession(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    provider: AIProviderName,
  ): Promise<CreateSessionResponse> {
    this.container.assertProviderAvailable(provider);

    const fileType = this.resolveFileType(originalName, mimeType);
    const sessionId = randomUUID();
    const safeName = path.basename(originalName);
    const sessionDir = path.join(UPLOADS_DIR, sessionId);

    await mkdir(sessionDir, { recursive: true });
    await writeFile(path.join(sessionDir, safeName), buffer);
    await writeSessionMeta(sessionDir, provider);

    try {
      return await this.ingestion.ingestCv(sessionId, buffer, safeName, fileType, provider);
    } catch (error) {
      await deleteSessionCollection(this.container.chroma, sessionId);
      await rm(sessionDir, { recursive: true, force: true });
      throw error;
    }
  }

  async getSessionProvider(sessionId: string): Promise<AIProviderName> {
    const meta = await readSessionMeta(path.join(UPLOADS_DIR, sessionId));
    return meta.provider;
  }

  async querySession(sessionId: string, query: string): Promise<SessionQueryResponse> {
    const exists = await sessionCollectionExists(this.container.chroma, sessionId);
    if (!exists) {
      throw new AppError(404, 'Session not found');
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      throw new AppError(400, 'Query is required');
    }

    const provider = await this.getSessionProvider(sessionId);
    const ai = this.container.getAiProvider(provider);
    const queryEmbedding = await ai.embedQuery(trimmedQuery);
    const results = await querySessionChunks(
      this.container.chroma,
      sessionId,
      queryEmbedding,
      this.container.env.RAG_TOP_K,
    );

    return {
      sessionId,
      query: trimmedQuery,
      results,
    };
  }

  async deleteSession(sessionId: string): Promise<void> {
    const exists = await sessionCollectionExists(this.container.chroma, sessionId);
    if (!exists) {
      throw new AppError(404, 'Session not found');
    }

    await deleteSessionCollection(this.container.chroma, sessionId);
    await rm(path.join(UPLOADS_DIR, sessionId), { recursive: true, force: true });
  }

  private resolveFileType(originalName: string, mimeType: string): SupportedFileType {
    const extension = path.extname(originalName).toLowerCase();

    if (extension === '.pdf' || mimeType === 'application/pdf') {
      return 'pdf';
    }

    if (
      extension === '.docx' ||
      mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return 'docx';
    }

    throw new AppError(400, 'Only PDF and DOCX files are supported');
  }
}
