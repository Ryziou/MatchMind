import { z } from 'zod';
import {
  extractUrlFromJobInput,
  isUrlOnlyJobInput,
  type ResolvedPosting,
} from '@matchmind/shared';
import type { AIProviders } from '../ai/providers/types.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateValidatedJson } from '../utils/generateValidatedJson.js';
import { fetchUrlText } from '../utils/safeFetch.js';
import { buildResolvePostingPrompt } from '../ai/prompts/resolve-posting.prompt.js';

const extractedPostingSchema = z.object({
  roleTitle: z.string().optional(),
  companyName: z.string().optional(),
  companyUrl: z.string().url().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
  jobDescription: z.string().min(1),
  postingLanguage: z.string().optional(),
});

export interface ResolvePostingInput {
  jobUrl?: string;
  jobDescription?: string;
  companyName?: string;
  companyUrl?: string;
}

export class NeedsCompanyError extends Error {
  readonly code = 'NEEDS_COMPANY' as const;

  constructor(
    message: string,
    readonly suggestedCompanyName?: string,
    readonly suggestedCompanyUrl?: string,
    readonly jobDescription?: string,
  ) {
    super(message);
    this.name = 'NeedsCompanyError';
  }
}

export class JobPostingService {
  async resolvePosting(input: ResolvePostingInput, ai: AIProviders): Promise<ResolvedPosting> {
    let jobUrl = input.jobUrl?.trim();
    let pasted = input.jobDescription?.trim();

    // Never treat a bare URL string as job-description prose.
    if (pasted && isUrlOnlyJobInput(pasted)) {
      const extracted = extractUrlFromJobInput(pasted);
      if (!jobUrl && extracted) {
        jobUrl = extracted;
      }
      pasted = undefined;
    }

    let rawText: string;
    let source: 'url' | 'pasted';

    if (jobUrl) {
      try {
        rawText = await fetchUrlText(jobUrl);
        source = 'url';
      } catch (error) {
        if (pasted && !isUrlOnlyJobInput(pasted)) {
          rawText = pasted;
          source = 'pasted';
        } else {
          throw error;
        }
      }
    } else if (pasted) {
      if (isUrlOnlyJobInput(pasted)) {
        throw new AppError(
          400,
          'That looks like a job posting URL, not a job description. Put it in the job URL field so we can fetch the posting.',
        );
      }
      rawText = pasted;
      source = 'pasted';
    } else {
      throw new AppError(400, 'Provide a job posting URL and/or a pasted job description');
    }

    if (isUrlOnlyJobInput(rawText)) {
      throw new AppError(
        400,
        'Could not load a real job posting from that link. Paste the full job description text instead.',
      );
    }

    const prompt = buildResolvePostingPrompt(rawText, jobUrl);
    const { data: extracted } = await generateValidatedJson(ai, prompt, extractedPostingSchema, {
      label: 'resolve-posting',
    });

    if (isUrlOnlyJobInput(extracted.jobDescription)) {
      throw new AppError(
        400,
        'Could not extract a usable job description from that input. Paste the full posting text.',
      );
    }

    const companyName = input.companyName?.trim() || extracted.companyName?.trim() || '';
    const companyUrl = input.companyUrl?.trim() || extracted.companyUrl;

    if (!companyName) {
      throw new NeedsCompanyError(
        'Could not determine the company name from the posting. Enter the company name to continue.',
        extracted.companyName,
        companyUrl,
        extracted.jobDescription,
      );
    }

    return {
      roleTitle: extracted.roleTitle,
      companyName,
      companyUrl,
      jobDescription: extracted.jobDescription,
      source,
      postingLanguage: extracted.postingLanguage,
    };
  }
}
