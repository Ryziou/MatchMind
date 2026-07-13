import type { NextFunction, Request, Response } from 'express';
import { chatRequestSchema, chatResponseSchema } from '@matchmind/shared';
import type { AppContainer } from '../container.js';
import { AppError } from '../middleware/errorHandler.js';

function getRouteParam(value: string | string[] | undefined): string {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && value[0]) {
    return value[0];
  }

  throw new AppError(400, 'Missing route parameter');
}

export function createChatController(container: AppContainer) {
  return {
    chat: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const sessionId = getRouteParam(req.params.sessionId);
        const body = chatRequestSchema.parse(req.body);
        const result = await container.chatService.chat(
          sessionId,
          body.message,
          body.history,
          body.jobDescription,
        );
        res.json(chatResponseSchema.parse(result));
      } catch (error) {
        next(error);
      }
    },
  };
}
