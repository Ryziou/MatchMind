import type { CreateSessionResponse } from '@matchmind/shared';
import type { AppContainer } from '../../container.js';
import { upsertSessionChunks } from '../../db/chroma/collections.js';
import { chunkDocument } from '../../rag/chunking/chunker.js';
import { parseDocument, type SupportedFileType } from './parsers/index.js';

export class IngestionService {
  constructor(private readonly container: AppContainer) {}

  async ingestCv(
    sessionId: string,
    buffer: Buffer,
    fileName: string,
    fileType: SupportedFileType,
  ): Promise<CreateSessionResponse> {
    const parsed = await parseDocument(buffer, fileName, fileType);
    const chunks = chunkDocument(parsed.text, parsed.fileName);

    if (chunks.length === 0) {
      throw new Error('Document produced no chunks after parsing');
    }

    const embeddings = await this.container.ai.embedDocuments(chunks.map((chunk) => chunk.text));

    if (embeddings.length !== chunks.length) {
      throw new Error('Embedding count does not match chunk count');
    }

    await upsertSessionChunks(
      this.container.chroma,
      sessionId,
      chunks.map((chunk, index) => ({
        id: `${sessionId}_${chunk.metadata.chunkIndex}`,
        text: chunk.text,
        embedding: embeddings[index]!,
        metadata: chunk.metadata,
      })),
    );

    console.info(
      `[ingestion] session=${sessionId} file=${fileName} chunks=${chunks.length} embedded=true`,
    );

    return {
      sessionId,
      chunkCount: chunks.length,
      fileName: parsed.fileName,
      fileType: parsed.fileType,
    };
  }
}
