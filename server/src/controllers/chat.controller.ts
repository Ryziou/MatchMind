import type { NextFunction, Request, Response } from 'express';
import { chatResponseSchema, type ChatMessage } from '@matchmind/shared';
import type { AppContainer } from '../container.js';

export function createChatController(container: AppContainer) {
  return {
    chat: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const sessionId = String(req.params.sessionId);
        const message = String(req.body.message ?? '');
        const history = (req.body.history ?? []) as ChatMessage[];
        const jobDescription =
          typeof req.body.jobDescription === 'string' ? req.body.jobDescription : undefined;

        const result = await container.chatService.chat(
          sessionId,
          message,
          history,
          jobDescription,
        );
        res.json(chatResponseSchema.parse(result));
      } catch (error) {
        next(error);
      }
    },
  };
}
