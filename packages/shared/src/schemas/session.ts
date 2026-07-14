import { z } from 'zod';
import { aiProviderSchema } from './provider.js';

export const chunkMetadataSchema = z.object({
  section: z.string(),
  sourceFile: z.string(),
  chunkIndex: z.number().int().nonnegative(),
});

export const createSessionResponseSchema = z.object({
  sessionId: z.string().uuid(),
  chunkCount: z.number().int().nonnegative(),
  fileName: z.string(),
  fileType: z.enum(['pdf', 'docx']),
  provider: aiProviderSchema,
});

export const sessionQueryResponseSchema = z.object({
  sessionId: z.string().uuid(),
  query: z.string(),
  results: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      metadata: chunkMetadataSchema,
      distance: z.number().optional(),
    }),
  ),
});

export type ChunkMetadata = z.infer<typeof chunkMetadataSchema>;
export type CreateSessionResponse = z.infer<typeof createSessionResponseSchema>;
export type SessionQueryResponse = z.infer<typeof sessionQueryResponseSchema>;
