import type { AIProviderName, CreateSessionResponse } from '@matchmind/shared';
import type { AppContainer } from '../../container.js';
import { upsertSessionChunks } from '../../db/chroma/collections.js';
import { chunkDocument } from '../../rag/chunking/chunker.js';
import { parseDocument, type SupportedFileType } from './parsers/index.js';
import { logger } from '../../utils/logger.js';

export class IngestionService {
  constructor(private readonly container: AppContainer) {}

  async ingestCv(
    sessionId: string,
    buffer: Buffer,
    fileName: string,
    fileType: SupportedFileType,
    provider: AIProviderName,
  ): Promise<CreateSessionResponse> {
    const ai = this.container.getAiProvider(provider);
    const parsed = await parseDocument(buffer, fileName, fileType);
    const chunks = chunkDocument(parsed.text, parsed.fileName);

    if (chunks.length === 0) {
      throw new Error('Document produced no chunks after parsing');
    }

    const embeddings = await ai.embedDocuments(chunks.map((chunk) => chunk.text));

    if (embeddings.length !== chunks.length) {
      throw new Error('Embedding count does not match chunk count');
    }

    await upsertSessionChunks(
      this.container.chroma,
      sessionId,
      chunks.map((chunk, index) => {
        const embedding = embeddings[index];
        if (!embedding) {
          throw new Error(`Missing embedding for chunk index ${index}`);
        }

        return {
          id: `${sessionId}_${chunk.metadata.chunkIndex}`,
          text: chunk.text,
          embedding,
          metadata: chunk.metadata,
        };
      }),
    );

    logger.info(
      { sessionId, file: fileName, chunks: chunks.length, provider },
      'CV ingestion complete',
    );

    return {
      sessionId,
      chunkCount: chunks.length,
      fileName: parsed.fileName,
      fileType: parsed.fileType,
      provider,
    };
  }
}
