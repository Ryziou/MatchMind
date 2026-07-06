import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { loadEnv } from './config/env.js';
import { createContainer } from './container.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createHealthRouter } from './routes/health.routes.js';

const env = loadEnv();
const container = createContainer(env);
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api', createHealthRouter(container));

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`MatchMind server listening on port ${env.PORT}`);
});
