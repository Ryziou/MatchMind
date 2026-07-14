import { Router } from 'express';
import {
  analyzeSessionRequestSchema,
  chatRequestSchema,
  sessionIdParamsSchema,
  sessionQueryRequestSchema,
} from '@matchmind/shared';
import {
  createSessionController,
  mapUploadError,
} from '../controllers/session.controller.js';
import { createAnalysisController } from '../controllers/analysis.controller.js';
import { createChatController } from '../controllers/chat.controller.js';
import { createUploadMiddleware } from '../middleware/upload.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import type { AppContainer } from '../container.js';

export function createSessionRouter(container: AppContainer): Router {
  const router = Router();
  const controller = createSessionController(container);
  const analysisController = createAnalysisController(container);
  const chatController = createChatController(container);
  const upload = createUploadMiddleware(container.env);
  const requireSessionId = validateParams(sessionIdParamsSchema);

  router.get('/providers', controller.listProviders);

  router.post('/sessions', (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        mapUploadError(err, next);
        return;
      }

      void controller.createSession(req, res, next);
    });
  });

  router.get(
    '/sessions/:sessionId/debug/query',
    requireSessionId,
    validateQuery(sessionQueryRequestSchema),
    controller.querySession,
  );
  router.post(
    '/sessions/:sessionId/analyze',
    requireSessionId,
    validateBody(analyzeSessionRequestSchema),
    analysisController.analyzeSession,
  );
  router.post(
    '/sessions/:sessionId/chat',
    requireSessionId,
    validateBody(chatRequestSchema),
    chatController.chat,
  );
  router.delete('/sessions/:sessionId', requireSessionId, controller.deleteSession);

  return router;
}
