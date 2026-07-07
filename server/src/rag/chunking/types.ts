import type { ChunkMetadata } from '@matchmind/shared';

export interface TextChunk {
  text: string;
  metadata: ChunkMetadata;
}

export interface ChunkerOptions {
  maxChars?: number;
  overlapChars?: number;
}
