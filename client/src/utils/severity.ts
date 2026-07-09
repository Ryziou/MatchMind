export type ScoreSeverity = 'success' | 'warning' | 'danger';

export function getScoreSeverity(score: number): ScoreSeverity {
  if (score >= 80) {
    return 'success';
  }

  if (score >= 50) {
    return 'warning';
  }

  return 'danger';
}

export function getScoreLabel(score: number): string {
  if (score >= 80) {
    return 'Strong match';
  }

  if (score >= 50) {
    return 'Partial match';
  }

  return 'Weak match';
}

export function getSeverityColor(severity: ScoreSeverity, theme: 'light' | 'dark'): string {
  if (severity === 'success') {
    return theme === 'dark' ? '#4ade80' : '#16a34a';
  }

  if (severity === 'warning') {
    return theme === 'dark' ? '#fbbf24' : '#d97706';
  }

  return theme === 'dark' ? '#f87171' : '#dc2626';
}
