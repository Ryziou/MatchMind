import type {
  AIProviderName,
  ApplyNeedsCompanyEvent,
  ApplyProgressStage,
  ApplyRequest,
  ApplyResult,
} from '@matchmind/shared';
import { isUrlOnlyJobInput } from '@matchmind/shared';
import { useCallback, useRef, useState } from 'react';
import { applySession, createSession } from '../services/api';

export type MatchClientStage = 'idle' | 'uploading' | ApplyProgressStage;

export interface MatchRunState {
  stage: MatchClientStage;
  sessionId: string | null;
  fileName: string | null;
  chunkCount: number | null;
  result: ApplyResult | null;
  error: string | null;
  needsCompany: ApplyNeedsCompanyEvent | null;
}

const INITIAL: MatchRunState = {
  stage: 'idle',
  sessionId: null,
  fileName: null,
  chunkCount: null,
  result: null,
  error: null,
  needsCompany: null,
};

const RUNNING: MatchClientStage[] = [
  'uploading',
  'fetching_posting',
  'retrieving_sections',
  'drafting',
  'researching_company',
  'reviewing',
  'revising',
  'compiling',
  'ats_check',
];

export function useMatchPipeline() {
  const [state, setState] = useState<MatchRunState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);
  const sessionRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    sessionRef.current = null;
    setState(INITIAL);
  }, []);

  const runMatch = useCallback(
    async (
      file: File | null,
      request: ApplyRequest,
      provider: AIProviderName,
      options?: { reuseSessionId?: string },
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      let jobUrl = request.jobUrl?.trim();
      let jobDescription = request.jobDescription?.trim();

      if (jobDescription && isUrlOnlyJobInput(jobDescription) && !jobUrl) {
        jobUrl = jobDescription;
        jobDescription = undefined;
      } else if (jobDescription && isUrlOnlyJobInput(jobDescription) && jobUrl) {
        jobDescription = undefined;
      }

      if (!jobUrl && !jobDescription) {
        setState({
          ...INITIAL,
          stage: 'error',
          error: 'Provide a job posting URL and/or a pasted job description.',
        });
        return null;
      }

      if (jobDescription && isUrlOnlyJobInput(jobDescription)) {
        setState({
          ...INITIAL,
          stage: 'error',
          error:
            'That looks like a job link. Put it in Job posting URL so we can fetch the posting.',
        });
        return null;
      }

      const applyBody: ApplyRequest = {
        ...(jobUrl ? { jobUrl } : {}),
        ...(jobDescription ? { jobDescription } : {}),
        ...(request.companyName?.trim() ? { companyName: request.companyName.trim() } : {}),
        ...(request.companyUrl?.trim() ? { companyUrl: request.companyUrl.trim() } : {}),
      };

      try {
        let sessionId = options?.reuseSessionId ?? sessionRef.current;

        if (!sessionId) {
          if (!file) {
            setState({
              ...INITIAL,
              stage: 'error',
              error: 'Upload a CV to start.',
            });
            return null;
          }

          setState({
            ...INITIAL,
            stage: 'uploading',
            fileName: file.name,
          });

          const session = await createSession(file, provider);
          if (controller.signal.aborted) {
            return null;
          }

          sessionId = session.sessionId;
          sessionRef.current = sessionId;
          setState((current) => ({
            ...current,
            stage: 'fetching_posting',
            sessionId,
            fileName: session.fileName,
            chunkCount: session.chunkCount,
          }));
        } else {
          setState((current) => ({
            ...current,
            stage: 'fetching_posting',
            sessionId,
            error: null,
            needsCompany: null,
            result: null,
          }));
        }

        const complete = await applySession(
          sessionId,
          applyBody,
          {
            onProgress: (progress) => {
              setState((current) => ({
                ...current,
                stage: progress.stage,
                error:
                  progress.stage === 'error'
                    ? (progress.message ?? 'Tailored application failed')
                    : null,
              }));
            },
            onNeedsCompany: (event) => {
              setState((current) => ({
                ...current,
                stage: 'needs_company',
                needsCompany: event,
                error: null,
                result: null,
              }));
            },
          },
          controller.signal,
        );

        if (!complete) {
          return null;
        }

        setState((current) => ({
          ...current,
          stage: 'complete',
          result: complete.apply,
          sessionId: complete.sessionId,
          error: null,
          needsCompany: null,
        }));

        return complete;
      } catch (error) {
        if (controller.signal.aborted) {
          return null;
        }

        const message = error instanceof Error ? error.message : 'Tailored application failed';
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
    isRunning: RUNNING.includes(state.stage),
    runMatch,
    reset,
  };
}
