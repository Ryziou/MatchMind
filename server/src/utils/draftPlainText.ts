import type { DraftContent } from '../ai/prompts/apply-draft.prompt.js';

/** Strip a trailing signature name so the LaTeX template can add it once. */
export function normalizeCoverClosing(closing: string, candidateName: string): string {
  const name = candidateName.trim();
  const lines = closing
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  while (lines.length > 0) {
    const last = lines[lines.length - 1] ?? '';
    if (name && last.toLowerCase() === name.toLowerCase()) {
      lines.pop();
      continue;
    }
    break;
  }

  let text = lines.join('\n').trim();
  if (name && text.toLowerCase().endsWith(name.toLowerCase())) {
    text = text.slice(0, text.length - name.length).replace(/[,\s]+$/u, '').trim();
  }

  return text || 'Kind regards,';
}

export function formatContactPlainLine(contact: DraftContent['contact']): string {
  const parts: string[] = [];
  if (contact.email?.trim()) parts.push(contact.email.trim());
  if (contact.phone?.trim()) parts.push(contact.phone.trim());
  if (contact.location?.trim()) parts.push(contact.location.trim());
  if (contact.linkedinUrl?.trim()) parts.push('LinkedIn');
  if (contact.githubUrl?.trim()) parts.push('GitHub');
  if (contact.portfolioUrl?.trim()) parts.push('Portfolio');
  return parts.join(' | ');
}

export function formatCvPlainText(draft: DraftContent): string {
  const parts: string[] = [
    draft.candidateName,
    draft.headline?.trim() || '',
    formatContactPlainLine(draft.contact),
    '',
    'Profile',
    draft.profile,
    '',
    'Skills',
  ];

  for (const group of draft.skills) {
    parts.push(`- ${group.category}: ${group.items.join(', ')}`);
  }

  parts.push('', 'Experience');

  for (const role of draft.experience) {
    const location = role.location?.trim() ? ` | ${role.location.trim()}` : '';
    parts.push(`${role.title} | ${role.company} | ${role.dates}${location}`);
    for (const bullet of role.bullets) {
      parts.push(`- ${bullet}`);
    }
    parts.push('');
  }

  if (draft.projects.length > 0) {
    parts.push('Selected Projects');
    for (const project of draft.projects) {
      const link = project.link?.trim() ? ` (${project.link.trim()})` : '';
      parts.push(`- ${project.name}${link}: ${project.description}`);
    }
    parts.push('');
  }

  parts.push('Education');
  for (const entry of draft.education) {
    const detail = entry.details?.trim() ? `: ${entry.details.trim()}` : '';
    parts.push(`- ${entry.degree}, ${entry.school} (${entry.dates})${detail}`);
  }

  return parts.filter((line, index, all) => !(line === '' && all[index - 1] === '')).join('\n').trim();
}

export function formatCoverLetterPlainText(draft: DraftContent): string {
  const closing = normalizeCoverClosing(draft.coverClosing, draft.candidateName);
  return [
    draft.candidateName,
    formatContactPlainLine(draft.contact),
    '',
    draft.coverGreeting,
    '',
    draft.coverBodyMarkdown.trim(),
    '',
    closing,
    draft.candidateName,
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
