import { z } from 'zod';
import type { StoredChunk } from '../../db/chroma/collections.js';

export const draftExperienceSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  dates: z.string().min(1),
  location: z.string().optional(),
  bullets: z.array(z.string().min(1)).min(1),
});

export const draftEducationSchema = z.object({
  degree: z.string().min(1),
  school: z.string().min(1),
  dates: z.string().min(1),
  details: z.string().optional(),
});

export const draftProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  link: z.string().optional(),
});

export const draftSkillGroupSchema = z.object({
  category: z.string().min(1),
  items: z.array(z.string().min(1)).min(1),
});

export const draftContactSchema = z.object({
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedinUrl: z.string().optional(),
  githubUrl: z.string().optional(),
  portfolioUrl: z.string().optional(),
});

export const draftContentSchema = z.object({
  candidateName: z.string().min(1),
  headline: z.string().optional(),
  contact: draftContactSchema,
  profile: z.string().min(1),
  experience: z.array(draftExperienceSchema).min(1),
  skills: z.array(draftSkillGroupSchema).min(1),
  education: z.array(draftEducationSchema).min(1),
  projects: z.array(draftProjectSchema),
  coverRecipientBlock: z.string(),
  coverGreeting: z.string(),
  coverBodyMarkdown: z.string().min(1),
  coverClosing: z.string(),
  tailoringDecisions: z.array(z.string()).min(1),
});

export type DraftContent = z.infer<typeof draftContentSchema>;

function formatChunks(chunks: StoredChunk[]): string {
  return chunks
    .map(
      (chunk) =>
        `[Chunk ${chunk.id} | Section: ${chunk.metadata.section}]\n${chunk.text}`,
    )
    .join('\n\n');
}

export function buildApplyDraftPrompt(
  jobDescription: string,
  companyName: string,
  roleTitle: string | undefined,
  postingLanguage: string | undefined,
  chunks: StoredChunk[],
): string {
  return `You are drafting a tailored CV and cover letter for a job application.

Honesty rules (mandatory):
- Only use facts supported by the retrieved CV chunks below. Never invent employers, titles, degrees, skills, metrics, or project outcomes.
- If the posting requires something missing from the chunks, omit it from the CV and do not fake it in the cover letter. You may note honest growth areas in the cover letter.
- Tailor framing and emphasis; do not fabricate.

Relevance rules (mandatory):
- Infer the target role family from the job description (for example software/frontend/backend developer).
- For software or developer roles, omit clearly unrelated careers such as SEO, pure marketing, sales, or retail unless the posting explicitly asks for them.
- Keep engineering-adjacent roles that support the application (QA, software testing, bootcamps, junior/intern software roles, platform ops).
- Prefer concrete, detailed bullets (what you built, stack, outcome) over vague summaries.

Completeness rules (mandatory):
- Include every distinct relevant employment/internship/bootcamp role the chunks support. Do not drop older relevant roles solely for brevity unless you would clearly exceed about two CV pages.
- Include Selected Projects when the chunks support shipped projects or portfolio apps.
- Education must be separate entries (degree, school, dates, optional details).
- Skills must be an array of category groups with items, easy to skim (Frontend, Tooling, Quality, etc.). Never return skills as one long comma-separated paragraph.

Contact rules (mandatory):
- contact.email, contact.phone, contact.location from chunks when available.
- contact.linkedinUrl / githubUrl / portfolioUrl must be full https URLs when present. Do not invent profiles.
- Optional headline: short role title for the CV header (for example "Junior Frontend Developer").

Cover letter rules (mandatory):
- Write in the posting language (${postingLanguage ?? 'English'}).
- Open with the specific role and company (${roleTitle ?? 'the role'} at ${companyName}), then why you fit, then what you would contribute.
- Prefer contribution bullets. You may use **Label:** at the start of a bullet for emphasis.
- coverRecipientBlock can be an empty string; the PDF does not show a hiring-manager address block.
- coverClosing must be ONLY the salutation (for example "Kind regards,"). Do NOT put the candidate name in coverClosing or the body signature.
- Do not repeat the candidate name multiple times in the letter body.

CV content language: English for profile, experience, skills, education, and projects.

Context:
- Company: ${companyName}
- Role: ${roleTitle ?? 'Unknown'}

Job description:
"""
${jobDescription.slice(0, 12000)}
"""

Retrieved CV evidence (only source of truth):
${formatChunks(chunks)}

Return JSON with:
- candidateName, headline?
- contact{email?, phone?, location?, linkedinUrl?, githubUrl?, portfolioUrl?}
- profile
- experience[{title, company, dates, location?, bullets}]
- skills[{category, items[]}]
- education[{degree, school, dates, details?}]
- projects[{name, description, link?}] (empty array if none)
- coverRecipientBlock, coverGreeting, coverBodyMarkdown, coverClosing
- tailoringDecisions: 3-5 short notes on emphasis and any roles you intentionally omitted

Target length: CV about two pages of substance, cover letter about one page.`;
}
