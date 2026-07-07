import { z } from 'zod';
import { analysisResultSchema } from './analysis.js';

export const analyzeSessionRequestSchema = z.object({
  jobDescription: z.string().trim().min(1, 'Job description is required'),
});

export const analysisProgressStageSchema = z.enum([
  'retrieving',
  'analyzing',
  'complete',
  'error',
]);

export const analysisProgressEventSchema = z.object({
  stage: analysisProgressStageSchema,
  message: z.string().optional(),
});

export const analysisCompleteEventSchema = z.object({
  stage: z.literal('complete'),
  sessionId: z.string().uuid(),
  analysis: analysisResultSchema,
  retrievedChunkIds: z.array(z.string()),
});

export type AnalyzeSessionRequest = z.infer<typeof analyzeSessionRequestSchema>;
export type AnalysisProgressStage = z.infer<typeof analysisProgressStageSchema>;
export type AnalysisProgressEvent = z.infer<typeof analysisProgressEventSchema>;
export type AnalysisCompleteEvent = z.infer<typeof analysisCompleteEventSchema>;
