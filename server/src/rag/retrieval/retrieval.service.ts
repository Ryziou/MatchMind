import type { StoredChunk } from '../../db/chroma/collections.js';
import { querySessionChunks } from '../../db/chroma/collections.js';
import type { AppContainer } from '../../container.js';

export class RetrievalService {
  constructor(private readonly container: AppContainer) {}

  async retrieveForQuery(sessionId: string, query: string): Promise<StoredChunk[]> {
    const topK = this.container.env.RAG_TOP_K;
    const queryEmbedding = await this.container.ai.embedQuery(query);
    return querySessionChunks(this.container.chroma, sessionId, queryEmbedding, topK);
  }

  async retrieveForJobDescription(
    sessionId: string,
    jobDescription: string,
  ): Promise<StoredChunk[]> {
    return this.retrieveForQuery(sessionId, jobDescription);
  }
}
