import type { AIProviders } from '../../ai/providers/types.js';
import type { StoredChunk } from '../../db/chroma/collections.js';
import { querySessionChunks } from '../../db/chroma/collections.js';
import type { AppContainer } from '../../container.js';

const APPLY_SECTION_QUERIES = [
  'candidate professional summary profile headline',
  'work experience roles responsibilities achievements employment history',
  'skills technologies tools competencies stack',
  'education degrees certifications courses bootcamp',
  'selected projects portfolio github apps shipped',
  'internship placement junior developer roles',
] as const;

export class RetrievalService {
  constructor(private readonly container: AppContainer) {}

  async retrieveForQuery(
    sessionId: string,
    query: string,
    ai: AIProviders,
  ): Promise<StoredChunk[]> {
    const topK = this.container.env.RAG_TOP_K;
    const queryEmbedding = await ai.embedQuery(query);
    return querySessionChunks(this.container.chroma, sessionId, queryEmbedding, topK);
  }

  async retrieveForJobDescription(
    sessionId: string,
    jobDescription: string,
    ai: AIProviders,
  ): Promise<StoredChunk[]> {
    return this.retrieveForQuery(sessionId, jobDescription, ai);
  }

  async retrieveForApply(
    sessionId: string,
    jobDescription: string,
    ai: AIProviders,
  ): Promise<StoredChunk[]> {
    const maxChunks = this.container.env.APPLY_MAX_CHUNKS;
    const perQueryK = this.container.env.RAG_TOP_K;
    const queries = [...APPLY_SECTION_QUERIES, jobDescription.slice(0, 2000)];

    const results = await Promise.all(
      queries.map(async (query) => {
        const embedding = await ai.embedQuery(query);
        return querySessionChunks(this.container.chroma, sessionId, embedding, perQueryK);
      }),
    );

    return dedupeChunksByBestDistance(results.flat(), maxChunks);
  }
}

export function dedupeChunksByBestDistance(
  chunks: StoredChunk[],
  maxChunks: number,
): StoredChunk[] {
  const bestById = new Map<string, StoredChunk>();

  for (const chunk of chunks) {
    const existing = bestById.get(chunk.id);
    if (!existing) {
      bestById.set(chunk.id, chunk);
      continue;
    }

    const existingDistance = existing.distance ?? Number.POSITIVE_INFINITY;
    const nextDistance = chunk.distance ?? Number.POSITIVE_INFINITY;
    if (nextDistance < existingDistance) {
      bestById.set(chunk.id, chunk);
    }
  }

  return [...bestById.values()]
    .sort((a, b) => (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY))
    .slice(0, maxChunks);
}
