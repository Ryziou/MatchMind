import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createContainer } from './container.js';
import { logger } from './utils/logger.js';

const rootEnvPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env');
dotenv.config({ path: rootEnvPath });

const env = loadEnv();
const container = createContainer(env);
const app = createApp(container);

app.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      defaultProvider: env.AI_PROVIDER,
      availableProviders: container.listProviders().providers.filter((p) => p.available).map((p) => p.id),
    },
    'MatchMind server listening',
  );
});
