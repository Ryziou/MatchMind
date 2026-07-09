import type { CvImprovement } from '@matchmind/shared';
import { CollapsibleSection } from './CollapsibleSection';

interface CvImprovementsProps {
  improvements: CvImprovement[];
}

export function CvImprovements({ improvements }: CvImprovementsProps) {
  return (
    <CollapsibleSection
      id="cv-improvements"
      title="CV improvements"
      subtitle="Suggested rewrites grounded in your existing content."
      defaultOpen={false}
    >
      {improvements.length === 0 ? (
        <p className="section-subtitle m-0">No rewrite suggestions were returned.</p>
      ) : (
        <div className="improvement-list">
          {improvements.map((item) => (
            <article key={`${item.section}-${item.current.slice(0, 24)}`} className="improvement">
              <h3 className="improvement__section m-0">{item.section}</h3>
              <div className="improvement__columns">
                <div>
                  <p className="improvement__label m-0">Current</p>
                  <p className="improvement__text m-0">{item.current}</p>
                </div>
                <div>
                  <p className="improvement__label m-0">Suggested</p>
                  <p className="improvement__text improvement__text--suggested m-0">
                    {item.suggested}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}
