import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('matchmind-server'),
  timestamp: z.string(),
  chroma: z.object({
    reachable: z.boolean(),
  }),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
