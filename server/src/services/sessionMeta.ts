import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { aiProviderSchema, type AIProviderName } from '@matchmind/shared';
import { AppError } from '../middleware/errorHandler.js';

const sessionMetaSchema = z.object({
  provider: aiProviderSchema,
  createdAt: z.string(),
});

export type SessionMeta = z.infer<typeof sessionMetaSchema>;

export function getSessionMetaPath(sessionDir: string): string {
  return path.join(sessionDir, 'meta.json');
}

export async function writeSessionMeta(
  sessionDir: string,
  provider: AIProviderName,
): Promise<SessionMeta> {
  const meta: SessionMeta = {
    provider,
    createdAt: new Date().toISOString(),
  };
  await writeFile(getSessionMetaPath(sessionDir), JSON.stringify(meta, null, 2), 'utf8');
  return meta;
}

export async function readSessionMeta(sessionDir: string): Promise<SessionMeta> {
  try {
    const raw = await readFile(getSessionMetaPath(sessionDir), 'utf8');
    return sessionMetaSchema.parse(JSON.parse(raw));
  } catch {
    throw new AppError(404, 'Session not found');
  }
}
