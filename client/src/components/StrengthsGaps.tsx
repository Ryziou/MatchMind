interface StrengthsGapsProps {
  strengths: string[];
  missingSkills: string[];
}

export function StrengthsGaps({ strengths, missingSkills }: StrengthsGapsProps) {
  return (
    <section id="strengths-gaps" className="result-grid-2">
      <div className="result-panel">
        <div className="result-panel__header">
          <h2 className="section-title m-0">Strengths</h2>
          <p className="section-subtitle m-0">Evidence-backed advantages for this role.</p>
        </div>
        {strengths.length === 0 ? (
          <p className="section-subtitle m-0">No strengths were identified from the matched CV sections.</p>
        ) : (
          <ul className="insight-list">
            {strengths.map((item) => (
              <li key={item} className="insight-list__item insight-list__item--success">
                <i className="pi pi-check-circle" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="result-panel">
        <div className="result-panel__header">
          <h2 className="section-title m-0">Missing skills</h2>
          <p className="section-subtitle m-0">Gaps relative to the job description.</p>
        </div>
        {missingSkills.length === 0 ? (
          <p className="section-subtitle m-0">No clear skill gaps were flagged.</p>
        ) : (
          <ul className="insight-list">
            {missingSkills.map((item) => (
              <li key={item} className="insight-list__item insight-list__item--danger">
                <i className="pi pi-exclamation-circle" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
