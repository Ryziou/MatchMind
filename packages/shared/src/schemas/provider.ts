import { z } from 'zod';

export const aiProviderSchema = z.enum(['gemini', 'openai']);

export const providerOptionSchema = z.object({
  id: aiProviderSchema,
  label: z.string().min(1),
  available: z.boolean(),
});

export const providersResponseSchema = z.object({
  providers: z.array(providerOptionSchema).min(1),
  defaultProvider: aiProviderSchema,
});

export type AIProviderName = z.infer<typeof aiProviderSchema>;
export type ProviderOption = z.infer<typeof providerOptionSchema>;
export type ProvidersResponse = z.infer<typeof providersResponseSchema>;
