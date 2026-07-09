import type { ClientPipelineStage } from '../hooks/useAnalysis';

const STEPS: Array<{ id: Exclude<ClientPipelineStage, 'idle' | 'error'>; label: string }> = [
  { id: 'uploading', label: 'Preparing your CV' },
  { id: 'retrieving', label: 'Finding relevant sections' },
  { id: 'analyzing', label: 'Building your match report' },
  { id: 'complete', label: 'Complete' },
];

const STAGE_ORDER: Record<Exclude<ClientPipelineStage, 'idle' | 'error'>, number> = {
  uploading: 0,
  retrieving: 1,
  analyzing: 2,
  complete: 3,
};

interface ProgressStepperProps {
  stage: ClientPipelineStage;
  error?: string | null;
}

export function ProgressStepper({ stage, error }: ProgressStepperProps) {
  if (stage === 'idle') {
    return null;
  }

  const activeIndex = stage === 'error' ? -1 : STAGE_ORDER[stage];

  return (
    <section className="progress-panel" aria-live="polite">
      <div className="progress-panel__header">
        <h2 className="section-title m-0">Analysis progress</h2>
        <p className="section-subtitle m-0">
          {stage === 'error'
            ? 'Something went wrong'
            : stage === 'complete'
              ? 'Your results are ready'
              : 'Each stage advances only when it is confirmed'}
        </p>
      </div>

      <ol className="progress-stepper">
        {STEPS.map((step, index) => {
          const isComplete = stage === 'complete' || (activeIndex > index && stage !== 'error');
          const isActive = activeIndex === index && stage !== 'error';

          return (
            <li
              key={step.id}
              className={`progress-step ${isComplete ? 'progress-step--complete' : ''} ${isActive ? 'progress-step--active' : ''}`}
            >
              <span className="progress-step__marker" aria-hidden>
                {isComplete ? <i className="pi pi-check" /> : index + 1}
              </span>
              <span className="progress-step__label">{step.label}</span>
            </li>
          );
        })}
      </ol>

      {error && <p className="field-error m-0 mt-3">{error}</p>}
    </section>
  );
}
