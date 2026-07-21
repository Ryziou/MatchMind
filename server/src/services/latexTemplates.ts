import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DraftContent } from '../ai/prompts/apply-draft.prompt.js';
import { escapeLatex, escapeLatexMultiline } from '../utils/latexEscape.js';
import { normalizeCoverClosing } from '../utils/draftPlainText.js';

const LATEX_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../latex');

export interface CvTemplateFields {
  nameFirst: string;
  nameLast: string;
  headline: string;
  contactCommands: string;
  profile: string;
  experience: string;
  projectsSection: string;
  skills: string;
  education: string;
}

export interface CoverLetterTemplateFields {
  candidateName: string;
  contactLine: string;
  greeting: string;
  body: string;
  closing: string;
}

async function loadTemplate(name: string): Promise<string> {
  return readFile(path.join(LATEX_DIR, name), 'utf8');
}

function fill(template: string, replacements: Record<string, string>): string {
  let output = template;
  for (const [key, value] of Object.entries(replacements)) {
    output = output.split(key).join(value);
  }
  return output;
}

export function splitCandidateName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { first: 'Candidate', last: '' };
  }
  if (parts.length === 1) {
    return { first: parts[0] ?? 'Candidate', last: '' };
  }
  return { first: parts[0] ?? 'Candidate', last: parts.slice(1).join(' ') };
}

export function extractSocialHandle(url: string, kind: 'linkedin' | 'github'): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (kind === 'linkedin') {
      return segments[segments.length - 1] ?? url;
    }
    return segments[0] ?? url;
  } catch {
    return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  }
}

export function buildModerncvContactCommands(contact: DraftContent['contact']): string {
  const lines: string[] = [];
  if (contact.phone?.trim()) {
    lines.push(`\\phone[mobile]{${escapeLatex(contact.phone.trim())}}`);
  }
  if (contact.email?.trim()) {
    lines.push(`\\email{${escapeLatex(contact.email.trim())}}`);
  }
  if (contact.location?.trim()) {
    lines.push(`\\address{${escapeLatex(contact.location.trim())}}{}{}`);
  }
  if (contact.linkedinUrl?.trim()) {
    const url = contact.linkedinUrl.trim();
    const handle = extractSocialHandle(url, 'linkedin');
    lines.push(`\\social[linkedin][${url}]{${escapeLatex(handle)}}`);
  }
  if (contact.githubUrl?.trim()) {
    const url = contact.githubUrl.trim();
    const handle = extractSocialHandle(url, 'github');
    lines.push(`\\social[github][${url}]{${escapeLatex(handle)}}`);
  }
  if (contact.portfolioUrl?.trim()) {
    lines.push(`\\homepage{${contact.portfolioUrl.trim()}}`);
  }
  return lines.join('\n');
}

export function buildCoverContactLine(contact: DraftContent['contact']): string {
  const parts: string[] = [];
  if (contact.email?.trim()) {
    const email = contact.email.trim();
    parts.push(`\\faEnvelope~\\href{mailto:${email}}{${escapeLatex(email)}}`);
  }
  if (contact.phone?.trim()) {
    const phone = contact.phone.trim();
    const tel = phone.replace(/[^\d+]/g, '');
    parts.push(`\\faPhone~\\href{tel:${tel}}{${escapeLatex(phone)}}`);
  }
  if (contact.linkedinUrl?.trim()) {
    parts.push(`\\faLinkedin~\\href{${contact.linkedinUrl.trim()}}{LinkedIn}`);
  }
  if (contact.githubUrl?.trim()) {
    parts.push(`\\faGithub~\\href{${contact.githubUrl.trim()}}{GitHub}`);
  }
  if (contact.portfolioUrl?.trim()) {
    parts.push(`\\faGlobe~\\href{${contact.portfolioUrl.trim()}}{Portfolio}`);
  }
  if (contact.location?.trim()) {
    parts.push(`\\faMapMarker~${escapeLatex(contact.location.trim())}`);
  }
  return parts.join(' \\quad ');
}

/** Convert plain bullets / paragraphs into LaTeX body fragments, including **bold**. */
export function markdownishToLatexBody(text: string): string {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      out.push('\\end{itemize}');
      inList = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeList();
      out.push('');
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        out.push('\\begin{itemize}');
        inList = true;
      }
      out.push(`\\item ${applyInlineMarkdown(line.slice(2).trim())}`);
      continue;
    }

    closeList();
    out.push(`${applyInlineMarkdown(line)}\\\\`);
  }

  closeList();
  return out.join('\n');
}

export function applyInlineMarkdown(text: string): string {
  const parts: string[] = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match = pattern.exec(text);
  while (match) {
    parts.push(escapeLatex(text.slice(lastIndex, match.index)));
    parts.push(`\\textbf{${escapeLatex(match[1] ?? '')}}`);
    lastIndex = match.index + match[0].length;
    match = pattern.exec(text);
  }
  parts.push(escapeLatex(text.slice(lastIndex)));
  return parts.join('');
}

export function experienceBlocksToLatex(roles: DraftContent['experience']): string {
  return roles
    .map((role) => {
      const location = role.location?.trim() ? escapeLatex(role.location.trim()) : '';
      const items =
        role.bullets.length === 0
          ? ''
          : `\\begin{itemize}\n${role.bullets
              .map((bullet) => `\\item ${applyInlineMarkdown(bullet)}`)
              .join('\n')}\n\\end{itemize}`;
      return `\\cventry{${escapeLatex(role.dates)}}{${escapeLatex(role.title)}}{${escapeLatex(role.company)}}{${location}}{}{${items}}`;
    })
    .join('\n');
}

export function educationBlocksToLatex(entries: DraftContent['education']): string {
  return entries
    .map((entry) => {
      const details = entry.details?.trim() ? escapeLatex(entry.details.trim()) : '';
      return `\\cventry{${escapeLatex(entry.dates)}}{${escapeLatex(entry.degree)}}{${escapeLatex(entry.school)}}{}{}{${details}}`;
    })
    .join('\n');
}

export function skillsBlocksToLatex(groups: DraftContent['skills']): string {
  return groups
    .map(
      (group) =>
        `\\cvitem{${escapeLatex(group.category)}}{${escapeLatex(group.items.join(', '))}}`,
    )
    .join('\n');
}

export function projectsSectionToLatex(projects: DraftContent['projects']): string {
  if (!projects || projects.length === 0) {
    return '';
  }

  const items = projects
    .map((project) => {
      const rawLink = project.link?.trim();
      let link = '';
      if (rawLink) {
        link = /^https?:\/\//i.test(rawLink)
          ? ` (\\href{${rawLink}}{${escapeLatex(rawLink.replace(/^https?:\/\//i, ''))}})`
          : ` (${escapeLatex(rawLink)})`;
      }
      return `\\cvitem{${escapeLatex(project.name)}}{${escapeLatex(project.description)}${link}}`;
    })
    .join('\n');

  return `\\section{Selected Projects}\n${items}`;
}

export async function renderCvTex(fields: CvTemplateFields): Promise<string> {
  const template = await loadTemplate('cv_template.tex');
  return fill(template, {
    '@@NAME_FIRST@@': escapeLatex(fields.nameFirst),
    '@@NAME_LAST@@': escapeLatex(fields.nameLast),
    '@@HEADLINE@@': escapeLatex(fields.headline),
    '@@CONTACT_COMMANDS@@': fields.contactCommands,
    '@@PROFILE@@': escapeLatexMultiline(fields.profile),
    '@@EXPERIENCE@@': fields.experience,
    '@@PROJECTS_SECTION@@': fields.projectsSection,
    '@@SKILLS@@': fields.skills,
    '@@EDUCATION@@': fields.education,
  });
}

export async function renderCoverLetterTex(fields: CoverLetterTemplateFields): Promise<string> {
  const template = await loadTemplate('cover_letter_template.tex');
  return fill(template, {
    '@@CANDIDATE_NAME@@': escapeLatex(fields.candidateName),
    '@@CONTACT_LINE@@': fields.contactLine,
    '@@GREETING@@': escapeLatex(fields.greeting),
    '@@BODY@@': fields.body,
    '@@CLOSING@@': escapeLatex(fields.closing),
  });
}

export function coverClosingForTemplate(closing: string, candidateName: string): string {
  return normalizeCoverClosing(closing, candidateName);
}
