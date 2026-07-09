import type { InterviewQuestion } from '@matchmind/shared';
import { useId, useState } from 'react';
import { CollapsibleSection } from './CollapsibleSection';

interface InterviewQuestionsProps {
  questions: InterviewQuestion[];
}

function GuidanceToggle({
  label,
  children,
  defaultOpen = false,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <div className="guidance-block">
      <button
        type="button"
        className="guidance-toggle"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{label}</span>
        <i className={`pi ${open ? 'pi-chevron-up' : 'pi-chevron-down'}`} aria-hidden />
      </button>
      {open && (
        <div id={contentId} className="guidance-block__body">
          {children}
        </div>
      )}
    </div>
  );
}

export function InterviewQuestions({ questions }: InterviewQuestionsProps) {
  return (
    <CollapsibleSection
      id="interview-questions"
      title="Interview questions"
      subtitle="Likely prompts based on your experience and the role."
      defaultOpen={false}
    >
      {questions.length === 0 ? (
        <p className="section-subtitle m-0">No interview questions were generated.</p>
      ) : (
        <ol className="question-list">
          {questions.map((item, index) => (
            <li key={item.question} className="question-item">
              <span className="question-item__index">{index + 1}</span>
              <div className="question-item__content">
                <div>
                  <p className="question-item__label m-0">Question</p>
                  <p className="question-item__question m-0">{item.question}</p>
                </div>

                <div className="mt-3">
                  <p className="question-item__label m-0">Why we are asking this</p>
                  <p className="question-item__rationale m-0">{item.rationale}</p>
                </div>

                <div className="mt-3">
                  <p className="question-item__label m-0">Common mistakes</p>
                  <ul className="mistake-list">
                    {item.commonMistakes.map((mistake) => (
                      <li key={mistake}>{mistake}</li>
                    ))}
                  </ul>
                </div>

                <GuidanceToggle label="Example answer" defaultOpen={false}>
                  <p className="question-item__example m-0">{item.exampleAnswer}</p>
                </GuidanceToggle>
              </div>
            </li>
          ))}
        </ol>
      )}
    </CollapsibleSection>
  );
}
