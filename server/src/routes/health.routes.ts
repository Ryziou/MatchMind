import { Router } from 'express';
import type { AppContainer } from '../container.js';
import { createHealthController } from '../controllers/health.controller.js';

export function createHealthRouter(container: AppContainer): Router {
  const router = Router();
  const controller = createHealthController(container);

  router.get('/health', (req, res, next) => {
    controller.getHealth(req, res).catch(next);
  });

  return router;
}
