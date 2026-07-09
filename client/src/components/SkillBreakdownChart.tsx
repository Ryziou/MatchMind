import type { SkillBreakdown } from '@matchmind/shared';
import { Chart } from 'primereact/chart';
import { useMemo } from 'react';
import { useTheme } from '../theme/useTheme';
import { getScoreSeverity, getSeverityColor } from '../utils/severity';

const SKILL_LABELS: Array<{ key: keyof SkillBreakdown; label: string }> = [
  { key: 'commercialExperience', label: 'Commercial' },
  { key: 'aiExperience', label: 'AI' },
  { key: 'cloudExperience', label: 'Cloud' },
  { key: 'communication', label: 'Communication' },
  { key: 'problemSolving', label: 'Problem solving' },
];

interface SkillBreakdownChartProps {
  skills: SkillBreakdown;
}

export function SkillBreakdownChart({ skills }: SkillBreakdownChartProps) {
  const { theme } = useTheme();

  const chartData = useMemo(() => {
    const labels = SKILL_LABELS.map((item) => item.label);
    const values = SKILL_LABELS.map((item) => skills[item.key]);
    const colors = values.map((value) => getSeverityColor(getScoreSeverity(value), theme));

    return {
      labels,
      datasets: [
        {
          label: 'Skill score',
          data: values,
          backgroundColor: colors.map((color) => `${color}33`),
          borderColor: colors,
          borderWidth: 2,
          pointBackgroundColor: colors,
          pointBorderColor: theme === 'dark' ? '#0f172a' : '#ffffff',
          pointHoverBackgroundColor: colors,
        },
      ],
    };
  }, [skills, theme]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: {
            display: false,
            stepSize: 20,
          },
          grid: {
            color: theme === 'dark' ? 'rgba(148, 163, 184, 0.25)' : 'rgba(100, 116, 139, 0.2)',
          },
          angleLines: {
            color: theme === 'dark' ? 'rgba(148, 163, 184, 0.25)' : 'rgba(100, 116, 139, 0.2)',
          },
          pointLabels: {
            color: theme === 'dark' ? '#e2e8f0' : '#334155',
            font: { size: 12, family: 'Source Sans 3, sans-serif' },
          },
        },
      },
    }),
    [theme],
  );

  return (
    <section id="skill-breakdown" className="result-panel">
      <div className="result-panel__header">
        <h2 className="section-title m-0">Skill breakdown</h2>
        <p className="section-subtitle m-0">Scores based only on the most relevant parts of your CV.</p>
      </div>
      <div className="skill-chart">
        <Chart type="radar" data={chartData} options={options} />
      </div>
      <ul className="skill-bars">
        {SKILL_LABELS.map((item) => {
          const value = skills[item.key];
          const severity = getScoreSeverity(value);
          return (
            <li key={item.key} className="skill-bar">
              <div className="skill-bar__meta">
                <span>{item.label}</span>
                <strong>{Math.round(value)}</strong>
              </div>
              <div className="skill-bar__track">
                <div
                  className={`skill-bar__fill skill-bar__fill--${severity}`}
                  style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
