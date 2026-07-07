import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  CHROMA_HOST: z.string().default('chroma'),
  CHROMA_PORT: z.coerce.number().default(8000),
  RAG_TOP_K: z.coerce.number().int().positive().default(8),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(5),
  GEMINI_GENERATION_MODEL: z.string().default('gemini-2.5-flash'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }

  return result.data;
}
