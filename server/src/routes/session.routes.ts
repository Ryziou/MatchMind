import { Router } from 'express';
import {
  createSessionController,
  mapUploadError,
} from '../controllers/session.controller.js';
import { createAnalysisController } from '../controllers/analysis.controller.js';
import { createUploadMiddleware } from '../middleware/upload.js';
import type { AppContainer } from '../container.js';

export function createSessionRouter(container: AppContainer): Router {
  const router = Router();
  const controller = createSessionController(container);
  const analysisController = createAnalysisController(container);
  const upload = createUploadMiddleware(container.env);

  router.post('/sessions', (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        mapUploadError(err, next);
        return;
      }

      void controller.createSession(req, res, next);
    });
  });

  router.get('/sessions/:sessionId/debug/query', controller.querySession);
  router.post('/sessions/:sessionId/analyze', analysisController.analyzeSession);
  router.delete('/sessions/:sessionId', controller.deleteSession);

  return router;
}
