import type { MatchClientStage } from '../hooks/useMatchPipeline';

const STEPS: Array<{ id: Exclude<MatchClientStage, 'idle' | 'error' | 'needs_company'>; label: string }> = [
  { id: 'uploading', label: 'Prepare CV' },
  { id: 'fetching_posting', label: 'Fetch posting' },
  { id: 'retrieving_sections', label: 'Retrieve CV evidence' },
  { id: 'drafting', label: 'Draft CV + cover letter' },
  { id: 'researching_company', label: 'Research company' },
  { id: 'reviewing', label: 'Reviewer critique' },
  { id: 'revising', label: 'Revise' },
  { id: 'compiling', label: 'Compile LaTeX' },
  { id: 'ats_check', label: 'Finalize' },
  { id: 'complete', label: 'Complete' },
];

const STAGE_ORDER = Object.fromEntries(
  STEPS.map((step, index) => [step.id, index]),
) as Record<(typeof STEPS)[number]['id'], number>;

interface ProgressStepperProps {
  stage: MatchClientStage;
  error?: string | null;
}

export function ProgressStepper({ stage, error }: ProgressStepperProps) {
  if (stage === 'idle') {
    return null;
  }

  const activeIndex =
    stage === 'error' || stage === 'needs_company'
      ? -1
      : (STAGE_ORDER[stage as (typeof STEPS)[number]['id']] ?? -1);

  return (
    <section className="progress-panel" aria-live="polite">
      <div className="progress-panel__header">
        <h2 className="section-title m-0">Application progress</h2>
        <p className="section-subtitle m-0">
          {stage === 'error'
            ? 'Something went wrong'
            : stage === 'needs_company'
              ? 'Company name needed to continue'
              : stage === 'complete'
                ? 'Your tailored package is ready'
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
