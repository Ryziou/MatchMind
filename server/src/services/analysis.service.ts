import {
  analysisCompleteEventSchema,
  analysisProgressEventSchema,
  analysisResultSchema,
  isUrlOnlyJobInput,
  type AnalysisCompleteEvent,
  type AnalysisProgressEvent,
} from '@matchmind/shared';
import { buildAnalysisPrompt } from '../ai/prompts/analysis.prompt.js';
import type { AppContainer } from '../container.js';
import { AppError } from '../middleware/errorHandler.js';
import { sessionCollectionExists } from '../db/chroma/collections.js';
import { RetrievalService } from '../rag/retrieval/retrieval.service.js';
import { generateValidatedJson } from '../utils/generateValidatedJson.js';
import { logger } from '../utils/logger.js';

export type AnalysisProgressHandler = (event: AnalysisProgressEvent) => void;

export class AnalysisService {
  private readonly retrieval: RetrievalService;

  constructor(private readonly container: AppContainer) {
    this.retrieval = new RetrievalService(container);
  }

  async analyzeSession(
    sessionId: string,
    jobDescription: string,
    onProgress: AnalysisProgressHandler,
  ): Promise<AnalysisCompleteEvent> {
    const exists = await sessionCollectionExists(this.container.chroma, sessionId);
    if (!exists) {
      throw new AppError(404, 'Session not found');
    }

    const trimmedJobDescription = jobDescription.trim();
    if (!trimmedJobDescription) {
      throw new AppError(400, 'Job description is required');
    }

    if (isUrlOnlyJobInput(trimmedJobDescription)) {
      throw new AppError(
        400,
        'That looks like a job posting URL, not a job description. Use the job URL field on Home so the posting can be fetched. Never paste only a link as the job description.',
      );
    }

    const provider = await this.container.sessionService.getSessionProvider(sessionId);
    const ai = this.container.getAiProvider(provider);

    onProgress(analysisProgressEventSchema.parse({ stage: 'retrieving' }));

    const retrievedChunks = await this.retrieval.retrieveForJobDescription(
      sessionId,
      trimmedJobDescription,
      ai,
    );
    const topK = this.container.env.RAG_TOP_K;

    if (retrievedChunks.length === 0) {
      throw new AppError(400, 'No relevant CV chunks were retrieved for this session');
    }

    if (retrievedChunks.length > topK) {
      throw new AppError(500, 'Retrieved chunk count exceeded configured Top-K limit');
    }

    const retrievedChunkIds = retrievedChunks.map((chunk) => chunk.id);
    logger.info(
      {
        sessionId,
        provider,
        retrievedChunkCount: retrievedChunks.length,
        chunkIds: retrievedChunkIds,
      },
      'Analysis retrieval complete',
    );

    onProgress(analysisProgressEventSchema.parse({ stage: 'analyzing' }));

    const prompt = buildAnalysisPrompt(trimmedJobDescription, retrievedChunks);
    const { data: analysis } = await generateValidatedJson(ai, prompt, analysisResultSchema, {
      label: `analysis:${sessionId}`,
    });

    const completeEvent = analysisCompleteEventSchema.parse({
      stage: 'complete',
      sessionId,
      analysis,
      retrievedChunkIds,
    });

    onProgress(analysisProgressEventSchema.parse({ stage: 'complete' }));
    return completeEvent;
  }
}
