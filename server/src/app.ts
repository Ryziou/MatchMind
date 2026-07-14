import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { AppContainer } from './container.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createHealthRouter } from './routes/health.routes.js';
import { createSessionRouter } from './routes/session.routes.js';
import { logger } from './utils/logger.js';

export function createApp(container: AppContainer): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(
    pinoHttp({
      logger,
      autoLogging: container.env.NODE_ENV !== 'test',
    }),
  );

  app.use('/api', createHealthRouter(container));
  app.use('/api', createSessionRouter(container));
  app.use(errorHandler);

  return app;
}
