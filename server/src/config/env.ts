import { z } from 'zod';

const optionalApiKey = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  });

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3001),
    GEMINI_API_KEY: optionalApiKey,
    OPENAI_API_KEY: optionalApiKey,
    CHROMA_HOST: z.string().default('chroma'),
    CHROMA_PORT: z.coerce.number().default(8000),
    RAG_TOP_K: z.coerce.number().int().positive().default(8),
    MAX_UPLOAD_MB: z.coerce.number().int().positive().default(5),
    GEMINI_GENERATION_MODEL: z.string().default('gemini-2.5-flash'),
    OPENAI_GENERATION_MODEL: z.string().default('gpt-4o-mini'),
    OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
    CHAT_HISTORY_TURNS: z.coerce.number().int().positive().max(20).default(6),
    AI_PROVIDER: z.enum(['gemini', 'openai']).default('gemini'),
    LOG_LEVEL: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.GEMINI_API_KEY && !value.OPENAI_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one of GEMINI_API_KEY or OPENAI_API_KEY is required',
        path: ['GEMINI_API_KEY'],
      });
    }

    if (value.AI_PROVIDER === 'gemini' && !value.GEMINI_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'GEMINI_API_KEY is required when AI_PROVIDER=gemini',
        path: ['GEMINI_API_KEY'],
      });
    }

    if (value.AI_PROVIDER === 'openai' && !value.OPENAI_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'OPENAI_API_KEY is required when AI_PROVIDER=openai',
        path: ['OPENAI_API_KEY'],
      });
    }
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

export function isProviderConfigured(env: Env, provider: 'gemini' | 'openai'): boolean {
  if (provider === 'gemini') {
    return Boolean(env.GEMINI_API_KEY);
  }

  return Boolean(env.OPENAI_API_KEY);
}
