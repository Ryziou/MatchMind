import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { createSessionResponseSchema, sessionQueryResponseSchema } from '@matchmind/shared';
import type { AppContainer } from '../container.js';
import { AppError } from '../middleware/errorHandler.js';
import { getUploadedCv } from '../middleware/upload.js';

function getRouteParam(value: string | string[] | undefined): string {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && value[0]) {
    return value[0];
  }

  throw new AppError(400, 'Missing route parameter');
}

export function createSessionController(container: AppContainer) {
  return {
    createSession: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const file = getUploadedCv(req);
        const result = await container.sessionService.createSession(
          file.buffer,
          file.originalname,
          file.mimetype,
        );
        const payload = createSessionResponseSchema.parse(result);
        res.status(201).json(payload);
      } catch (error) {
        next(error);
      }
    },

    querySession: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const query = typeof req.query.q === 'string' ? req.query.q : '';
        const result = await container.sessionService.querySession(
          getRouteParam(req.params.sessionId),
          query,
        );
        const payload = sessionQueryResponseSchema.parse(result);
        res.json(payload);
      } catch (error) {
        next(error);
      }
    },

    deleteSession: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        await container.sessionService.deleteSession(getRouteParam(req.params.sessionId));
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  };
}

export function mapUploadError(err: unknown, next: NextFunction): void {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      next(new AppError(400, 'File exceeds the maximum upload size'));
      return;
    }

    next(new AppError(400, err.message));
    return;
  }

  next(err);
}
