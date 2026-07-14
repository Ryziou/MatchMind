import type { NextFunction, Request, Response } from 'express';
import { analysisProgressEventSchema } from '@matchmind/shared';
import type { AppContainer } from '../container.js';
import { initSseResponse, writeSseEvent } from '../utils/sse.js';

export function createAnalysisController(container: AppContainer) {
  return {
    analyzeSession: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const sessionId = String(req.params.sessionId);
        const jobDescription = String(req.body.jobDescription ?? '');

        initSseResponse(res);

        const result = await container.analysisService.analyzeSession(
          sessionId,
          jobDescription,
          (progress) => {
            writeSseEvent(res, 'progress', progress);
          },
        );

        writeSseEvent(res, 'complete', result);
        res.end();
      } catch (error) {
        if (res.headersSent) {
          const message = error instanceof Error ? error.message : 'Analysis failed';
          writeSseEvent(
            res,
            'error',
            analysisProgressEventSchema.parse({ stage: 'error', message }),
          );
          res.end();
          return;
        }

        next(error);
      }
    },
  };
}
