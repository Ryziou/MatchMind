import {
  analysisCompleteEventSchema,
  analysisProgressEventSchema,
  createSessionResponseSchema,
  type AnalysisCompleteEvent,
  type AnalysisProgressEvent,
  type CreateSessionResponse,
  type HealthResponse,
} from '@matchmind/shared';

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };
    if (payload.error) {
      return payload.error;
    }
  } catch {
    // Fall through to status text.
  }

  return `Request failed (${response.status})`;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch('/api/health');

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<HealthResponse>;
}

export async function createSession(file: File): Promise<CreateSessionResponse> {
  const formData = new FormData();
  formData.append('cv', file);

  const response = await fetch('/api/sessions', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return createSessionResponseSchema.parse(await response.json());
}

function parseSseBlock(block: string): { event: string; data: string } | null {
  const lines = block.split('\n');
  let event = 'message';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  return { event, data: dataLines.join('\n') };
}

export async function analyzeSession(
  sessionId: string,
  jobDescription: string,
  onProgress: (event: AnalysisProgressEvent) => void,
  signal?: AbortSignal,
): Promise<AnalysisCompleteEvent> {
  const response = await fetch(`/api/sessions/${sessionId}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobDescription }),
    signal,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  if (!response.body) {
    throw new Error('Analysis stream was empty');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let complete: AnalysisCompleteEvent | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';

    for (const block of blocks) {
      const parsed = parseSseBlock(block.trim());
      if (!parsed) {
        continue;
      }

      const payload: unknown = JSON.parse(parsed.data);

      if (parsed.event === 'progress') {
        onProgress(analysisProgressEventSchema.parse(payload));
        continue;
      }

      if (parsed.event === 'complete') {
        complete = analysisCompleteEventSchema.parse(payload);
        onProgress(analysisProgressEventSchema.parse({ stage: 'complete' }));
        continue;
      }

      if (parsed.event === 'error') {
        const errorEvent = analysisProgressEventSchema.parse(payload);
        throw new Error(errorEvent.message ?? 'Analysis failed');
      }
    }
  }

  if (!complete) {
    throw new Error('Analysis ended without a complete event');
  }

  return complete;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const response = await fetch(`/api/sessions/${sessionId}`, {
    method: 'DELETE',
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(await readErrorMessage(response));
  }
}
