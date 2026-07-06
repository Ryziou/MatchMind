import type { Request, Response } from 'express';
import { healthResponseSchema } from '@matchmind/shared';
import type { AppContainer } from '../container.js';

export function createHealthController(container: AppContainer) {
  return {
    getHealth: async (_req: Request, res: Response): Promise<void> => {
      const chromaReachable = await container.chroma.isReachable();

      const payload = healthResponseSchema.parse({
        status: 'ok',
        service: 'matchmind-server',
        timestamp: new Date().toISOString(),
        chroma: { reachable: chromaReachable },
      });

      res.json(payload);
    },
  };
}
