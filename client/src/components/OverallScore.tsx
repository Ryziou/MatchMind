import { Tag } from 'primereact/tag';
import { getScoreLabel, getScoreSeverity } from '../utils/severity';

interface OverallScoreProps {
  score: number;
}

export function OverallScore({ score }: OverallScoreProps) {
  const severity = getScoreSeverity(score);
  const clamped = Math.max(0, Math.min(100, score));

  return (
    <section id="overall-match" className="score-hero">
      <div className="score-hero__ring" style={{ ['--score' as string]: clamped }}>
        <div className="score-hero__inner">
          <span className="score-hero__value">{Math.round(score)}</span>
          <span className="score-hero__unit">/ 100</span>
        </div>
      </div>
      <div className="score-hero__copy">
        <h2 className="section-title m-0">Overall match</h2>
        <p className="section-subtitle m-0 mt-2">
          How closely the most relevant parts of your CV align with this role.
        </p>
        <Tag className="mt-3" severity={severity} value={getScoreLabel(score)} />
      </div>
    </section>
  );
}
