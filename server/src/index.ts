import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import { loadEnv } from './config/env.js';
import { createContainer } from './container.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createHealthRouter } from './routes/health.routes.js';
import { createSessionRouter } from './routes/session.routes.js';

// Always load the monorepo root .env, even when cwd is server/
const rootEnvPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env');
dotenv.config({ path: rootEnvPath });

const env = loadEnv();
const container = createContainer(env);
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api', createHealthRouter(container));
app.use('/api', createSessionRouter(container));

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`MatchMind server listening on port ${env.PORT}`);
});
