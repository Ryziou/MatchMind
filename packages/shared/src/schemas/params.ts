import { z } from 'zod';

export const sessionIdParamsSchema = z.object({
  sessionId: z.string().uuid('Session id must be a valid UUID'),
});

export const sessionQueryRequestSchema = z.object({
  q: z.string().trim().min(1, 'Query is required'),
});

export type SessionIdParams = z.infer<typeof sessionIdParamsSchema>;
export type SessionQueryRequest = z.infer<typeof sessionQueryRequestSchema>;
