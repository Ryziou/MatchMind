import type { AIProviderName, AnalysisCompleteEvent, AnalysisProgressStage } from '@matchmind/shared';
import { useCallback, useRef, useState } from 'react';
import { analyzeSession, createSession } from '../services/api';

export type ClientPipelineStage =
  | 'idle'
  | 'uploading'
  | 'retrieving'
  | 'analyzing'
  | 'complete'
  | 'error';

export interface AnalysisRunState {
  stage: ClientPipelineStage;
  sessionId: string | null;
  fileName: string | null;
  chunkCount: number | null;
  result: AnalysisCompleteEvent | null;
  error: string | null;
}

const INITIAL_STATE: AnalysisRunState = {
  stage: 'idle',
  sessionId: null,
  fileName: null,
  chunkCount: null,
  result: null,
  error: null,
};

function mapServerStage(stage: AnalysisProgressStage): ClientPipelineStage {
  if (stage === 'error') {
    return 'error';
  }

  return stage;
}

export function useAnalysis() {
  const [state, setState] = useState<AnalysisRunState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  const runAnalysis = useCallback(
    async (file: File, jobDescription: string, provider: AIProviderName) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({
        ...INITIAL_STATE,
        stage: 'uploading',
        fileName: file.name,
      });

      try {
        const session = await createSession(file, provider);

        if (controller.signal.aborted) {
          return null;
        }

        setState((current) => ({
          ...current,
          stage: 'retrieving',
          sessionId: session.sessionId,
          fileName: session.fileName,
          chunkCount: session.chunkCount,
        }));

        const result = await analyzeSession(
          session.sessionId,
          jobDescription,
          (progress) => {
            setState((current) => ({
              ...current,
              stage: mapServerStage(progress.stage),
              error: progress.stage === 'error' ? (progress.message ?? 'Analysis failed') : null,
            }));
          },
          controller.signal,
        );

        setState((current) => ({
          ...current,
          stage: 'complete',
          result,
          error: null,
        }));

        return result;
      } catch (error) {
        if (controller.signal.aborted) {
          return null;
        }

        const message = error instanceof Error ? error.message : 'Analysis failed';
        setState((current) => ({
          ...current,
          stage: 'error',
          error: message,
        }));
        return null;
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [],
  );

  return {
    ...state,
    isRunning: state.stage === 'uploading' || state.stage === 'retrieving' || state.stage === 'analyzing',
    runAnalysis,
    reset,
  };
}
