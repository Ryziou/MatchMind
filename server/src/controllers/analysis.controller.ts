import type { NextFunction, Request, Response } from 'express';
import { analyzeSessionRequestSchema, analysisProgressEventSchema } from '@matchmind/shared';
import type { AppContainer } from '../container.js';
import { AppError } from '../middleware/errorHandler.js';
import { initSseResponse, writeSseEvent } from '../utils/sse.js';

function getRouteParam(value: string | string[] | undefined): string {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && value[0]) {
    return value[0];
  }

  throw new AppError(400, 'Missing route parameter');
}

export function createAnalysisController(container: AppContainer) {
  return {
    analyzeSession: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const sessionId = getRouteParam(req.params.sessionId);
        const body = analyzeSessionRequestSchema.parse(req.body);

        initSseResponse(res);

        const result = await container.analysisService.analyzeSession(
          sessionId,
          body.jobDescription,
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
