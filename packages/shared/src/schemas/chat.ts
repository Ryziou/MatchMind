import { z } from 'zod';

export const chatRoleSchema = z.enum(['user', 'assistant']);

export const chatMessageSchema = z.object({
  role: chatRoleSchema,
  content: z.string().trim().min(1),
});

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1, 'Message is required'),
  history: z.array(chatMessageSchema).max(20).default([]),
  jobDescription: z.string().trim().min(1).optional(),
});

export const chatAnswerSchema = z.object({
  answer: z.string().min(1),
  citedChunkIds: z.array(z.string()),
});

export const chatResponseSchema = z.object({
  sessionId: z.string().uuid(),
  answer: z.string().min(1),
  citedChunkIds: z.array(z.string()),
  retrievedChunkIds: z.array(z.string()),
});

export type ChatRole = z.infer<typeof chatRoleSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatAnswer = z.infer<typeof chatAnswerSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
