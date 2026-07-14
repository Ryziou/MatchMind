import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import {
  aiProviderSchema,
  createSessionResponseSchema,
  providersResponseSchema,
  sessionQueryResponseSchema,
  type AIProviderName,
} from '@matchmind/shared';
import type { AppContainer } from '../container.js';
import { AppError } from '../middleware/errorHandler.js';
import { getUploadedCv } from '../middleware/upload.js';

function resolveProvider(req: Request, container: AppContainer): AIProviderName {
  const raw = req.body?.provider;
  if (raw === undefined || raw === null || raw === '') {
    return container.listProviders().defaultProvider;
  }

  const parsed = aiProviderSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError(400, 'Provider must be gemini or openai');
  }

  return parsed.data;
}

export function createSessionController(container: AppContainer) {
  return {
    listProviders: (_req: Request, res: Response): void => {
      const payload = providersResponseSchema.parse(container.listProviders());
      res.json(payload);
    },

    createSession: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const file = getUploadedCv(req);
        const provider = resolveProvider(req, container);
        const result = await container.sessionService.createSession(
          file.buffer,
          file.originalname,
          file.mimetype,
          provider,
        );
        const payload = createSessionResponseSchema.parse(result);
        res.status(201).json(payload);
      } catch (error) {
        next(error);
      }
    },

    querySession: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const sessionId = String(req.params.sessionId);
        const query = String(req.query.q ?? '');
        const result = await container.sessionService.querySession(sessionId, query);
        const payload = sessionQueryResponseSchema.parse(result);
        res.json(payload);
      } catch (error) {
        next(error);
      }
    },

    deleteSession: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        await container.sessionService.deleteSession(String(req.params.sessionId));
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
