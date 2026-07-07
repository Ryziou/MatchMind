import { IncludeEnum } from 'chromadb';
import type { ChunkMetadata } from '@matchmind/shared';
import type { ChromaClientWrapper } from './client.js';

export interface StoredChunk {
  id: string;
  text: string;
  metadata: ChunkMetadata;
  distance?: number;
}

export function getSessionCollectionName(sessionId: string): string {
  return `cv_${sessionId}`;
}

export async function createSessionCollection(
  chroma: ChromaClientWrapper,
  sessionId: string,
): Promise<void> {
  await chroma.client.getOrCreateCollection({
    name: getSessionCollectionName(sessionId),
    metadata: { sessionId },
  });
}

export async function upsertSessionChunks(
  chroma: ChromaClientWrapper,
  sessionId: string,
  chunks: Array<{ id: string; text: string; embedding: number[]; metadata: ChunkMetadata }>,
): Promise<void> {
  if (chunks.length === 0) {
    throw new Error('Cannot store an empty chunk set');
  }

  const collection = await chroma.client.getOrCreateCollection({
    name: getSessionCollectionName(sessionId),
    metadata: { sessionId },
  });

  await collection.add({
    ids: chunks.map((chunk) => chunk.id),
    embeddings: chunks.map((chunk) => chunk.embedding),
    documents: chunks.map((chunk) => chunk.text),
    metadatas: chunks.map((chunk) => ({
      section: chunk.metadata.section,
      sourceFile: chunk.metadata.sourceFile,
      chunkIndex: chunk.metadata.chunkIndex,
    })),
  });
}

export async function querySessionChunks(
  chroma: ChromaClientWrapper,
  sessionId: string,
  queryEmbedding: number[],
  topK: number,
): Promise<StoredChunk[]> {
  const collection = await chroma.client.getCollection({
    name: getSessionCollectionName(sessionId),
  });

  const result = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: topK,
    include: [IncludeEnum.Documents, IncludeEnum.Metadatas, IncludeEnum.Distances],
  });

  const ids = result.ids[0] ?? [];
  const documents = result.documents[0] ?? [];
  const metadatas = result.metadatas[0] ?? [];
  const distances = result.distances?.[0] ?? [];

  return ids.map((id, index) => {
    const metadata = metadatas[index] as Record<string, string | number> | null;
    const text = documents[index] ?? '';

    return {
      id,
      text,
      metadata: {
        section: String(metadata?.section ?? 'Unknown'),
        sourceFile: String(metadata?.sourceFile ?? 'unknown'),
        chunkIndex: Number(metadata?.chunkIndex ?? index),
      },
      distance: distances[index],
    };
  });
}

export async function deleteSessionCollection(
  chroma: ChromaClientWrapper,
  sessionId: string,
): Promise<void> {
  try {
    await chroma.client.deleteCollection({ name: getSessionCollectionName(sessionId) });
  } catch {
    // Collection may already be gone during cleanup.
  }
}

export async function sessionCollectionExists(
  chroma: ChromaClientWrapper,
  sessionId: string,
): Promise<boolean> {
  try {
    await chroma.client.getCollection({ name: getSessionCollectionName(sessionId) });
    return true;
  } catch {
    return false;
  }
}
