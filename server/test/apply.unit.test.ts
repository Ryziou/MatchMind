import { describe, expect, it } from 'vitest';
import {
  analyzeSessionRequestSchema,
  extractUrlFromJobInput,
  isUrlOnlyJobInput,
  type CompanyBrief,
  type ReviewerFeedback,
} from '@matchmind/shared';
import { dedupeChunksByBestDistance } from '../src/rag/retrieval/retrieval.service.js';
import { escapeLatex } from '../src/utils/latexEscape.js';
import { assertSafePublicUrl, htmlToReadableText } from '../src/utils/safeFetch.js';
import {
  applyReviewerEdits,
  keywordExtractSchema,
  normalizeKeywordExtract,
} from '../src/services/apply.service.js';
import {
  applyInlineMarkdown,
  extractSocialHandle,
  skillsBlocksToLatex,
} from '../src/services/latexTemplates.js';
import {
  formatCvPlainText,
  normalizeCoverClosing,
} from '../src/utils/draftPlainText.js';
import type { DraftContent } from '../src/ai/prompts/apply-draft.prompt.js';
import { createZipBuffer } from '../src/utils/zipStore.js';
import type { StoredChunk } from '../src/db/chroma/collections.js';
import { normalizeApplyRequest } from '../src/utils/normalizeApplyRequest.js';

describe('keywordExtractSchema', () => {
  it('accepts object form', () => {
    const parsed = normalizeKeywordExtract(
      keywordExtractSchema.parse({
        keywords: [{ keyword: 'TypeScript', priority: 'required' }],
      }),
    );
    expect(parsed.keywords).toHaveLength(1);
  });

  it('normalizes a bare array from the model', () => {
    const parsed = normalizeKeywordExtract(
      keywordExtractSchema.parse([
        { keyword: 'React', priority: 'preferred' },
        { keyword: 'Node', priority: 'required' },
      ]),
    );
    expect(parsed).toEqual({
      keywords: [
        { keyword: 'React', priority: 'preferred' },
        { keyword: 'Node', priority: 'required' },
      ],
    });
  });
});

describe('isUrlOnlyJobInput', () => {
  it('detects bare URLs', () => {
    expect(isUrlOnlyJobInput('https://boards.greenhouse.io/acme/jobs/123')).toBe(true);
    expect(isUrlOnlyJobInput('  http://example.com/job  ')).toBe(true);
  });

  it('rejects real job description prose', () => {
    expect(
      isUrlOnlyJobInput('We are hiring a TypeScript engineer with React and Node experience.'),
    ).toBe(false);
  });
});

describe('normalizeApplyRequest', () => {
  it('promotes URL-only jobDescription to jobUrl', () => {
    const normalized = normalizeApplyRequest({
      jobDescription: 'https://example.com/jobs/42',
    });
    expect(normalized.jobUrl).toBe('https://example.com/jobs/42');
    expect(normalized.jobDescription).toBeUndefined();
  });

  it('keeps real JD text and does not treat it as a URL', () => {
    const normalized = normalizeApplyRequest({
      jobDescription: 'Looking for a backend engineer with TypeScript.',
    });
    expect(normalized.jobUrl).toBeUndefined();
    expect(normalized.jobDescription).toContain('backend engineer');
  });

  it('drops URL-only JD when jobUrl is already set', () => {
    const normalized = normalizeApplyRequest({
      jobUrl: 'https://example.com/jobs/1',
      jobDescription: 'https://example.com/jobs/1',
    });
    expect(normalized.jobUrl).toBe('https://example.com/jobs/1');
    expect(normalized.jobDescription).toBeUndefined();
  });
});

describe('analyzeSessionRequestSchema URL guard', () => {
  it('rejects URL-only jobDescription', () => {
    const result = analyzeSessionRequestSchema.safeParse({
      jobDescription: 'https://linkedin.com/jobs/view/123',
    });
    expect(result.success).toBe(false);
  });

  it('accepts real job description text', () => {
    const result = analyzeSessionRequestSchema.safeParse({
      jobDescription: 'Build APIs in TypeScript and own production incidents.',
    });
    expect(result.success).toBe(true);
  });
});

describe('extractUrlFromJobInput', () => {
  it('extracts leading URL', () => {
    expect(extractUrlFromJobInput('https://example.com/x')).toBe('https://example.com/x');
  });
});

describe('latexEscape', () => {
  it('escapes special characters', () => {
    expect(escapeLatex('100% & #1')).toContain('\\%');
  });
});

describe('inline markdown and skills latex', () => {
  it('converts **bold** to textbf', () => {
    expect(applyInlineMarkdown('**Frontend:** React')).toBe('\\textbf{Frontend:} React');
  });

  it('extracts LinkedIn handles without the host', () => {
    expect(extractSocialHandle('https://www.linkedin.com/in/callum-liu', 'linkedin')).toBe(
      'callum-liu',
    );
  });

  it('renders skill groups as cvitem lines', () => {
    const latex = skillsBlocksToLatex([
      { category: 'Frontend', items: ['React', 'TypeScript'] },
    ]);
    expect(latex).toContain('\\cvitem{Frontend}{React, TypeScript}');
  });
});

describe('dedupeChunksByBestDistance', () => {
  it('keeps the closest copy of each chunk id', () => {
    const chunks: StoredChunk[] = [
      {
        id: 'a',
        text: 'one',
        metadata: { section: 'Experience', chunkIndex: 0, totalChunks: 2 },
        distance: 0.4,
      },
      {
        id: 'a',
        text: 'one-better',
        metadata: { section: 'Experience', chunkIndex: 0, totalChunks: 2 },
        distance: 0.1,
      },
      {
        id: 'b',
        text: 'two',
        metadata: { section: 'Skills', chunkIndex: 1, totalChunks: 2 },
        distance: 0.2,
      },
    ];

    const result = dedupeChunksByBestDistance(chunks, 2);
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe('a');
    expect(result[0]?.text).toBe('one-better');
    expect(result[1]?.id).toBe('b');
  });
});

describe('htmlToReadableText', () => {
  it('strips scripts and tags', () => {
    const text = htmlToReadableText(
      '<html><script>evil()</script><h1>Engineer</h1><p>Build APIs</p></html>',
    );
    expect(text).toContain('Engineer');
    expect(text).toContain('Build APIs');
    expect(text).not.toContain('evil');
  });
});

describe('assertSafePublicUrl', () => {
  it('rejects localhost', async () => {
    await expect(assertSafePublicUrl('http://localhost/admin')).rejects.toThrow(/not allowed/i);
  });

  it('rejects private IP literals', async () => {
    await expect(assertSafePublicUrl('http://127.0.0.1/')).rejects.toThrow(/private/i);
  });
});

describe('applyReviewerEdits', () => {
  it('applies matching cover letter edits and skips when company research skipped', () => {
    const draft: DraftContent = {
      candidateName: 'Ada',
      contact: { email: 'ada@example.com' },
      profile: 'Backend engineer',
      experience: [
        {
          title: 'Engineer',
          company: 'Analytical Engines',
          dates: '2020-2024',
          bullets: ['Shipped APIs'],
        },
      ],
      skills: [{ category: 'Languages', items: ['TypeScript'] }],
      education: [
        {
          degree: 'BSc',
          school: 'University of London',
          dates: '2016-2019',
        },
      ],
      projects: [],
      coverRecipientBlock: 'Hiring Manager',
      coverGreeting: 'Dear Hiring Manager,',
      coverBodyMarkdown: 'I admire the company culture of collaboration.',
      coverClosing: 'Kind regards,',
      tailoringDecisions: ['Emphasized backend'],
    };

    const feedback: ReviewerFeedback = {
      structuredEdits: [
        {
          target: 'coverLetterTex',
          oldText: 'collaboration',
          newText: 'collaboration and open source',
          reason: 'keyword',
        },
      ],
      missedKeywords: [],
      companyAngles: [],
      reframingNotes: [],
      toneNotes: [],
    };

    const brief: CompanyBrief = {
      companyName: 'Acme',
      mission: '',
      productsOrServices: [],
      recentNews: [],
      cultureSignals: [],
      anglesForCoverLetter: [],
      sources: [],
      researchStatus: 'complete',
    };

    const revised = applyReviewerEdits(draft, feedback, brief);
    expect(revised.coverBodyMarkdown).toContain('open source');
  });
});

describe('draftPlainText', () => {
  it('strips a duplicated signature name from the closing', () => {
    expect(normalizeCoverClosing('Kind regards,\nAda Lovelace', 'Ada Lovelace')).toBe(
      'Kind regards,',
    );
  });

  it('formats CV plain text from structured fields', () => {
    const text = formatCvPlainText({
      candidateName: 'Ada Lovelace',
      headline: 'Software Engineer',
      contact: {
        email: 'ada@example.com',
        linkedinUrl: 'https://www.linkedin.com/in/ada-lovelace',
      },
      profile: 'Engineer',
      experience: [
        {
          title: 'Software Engineer',
          company: 'Analytical Engines',
          dates: '2020-2024',
          bullets: ['Built TypeScript services'],
        },
      ],
      skills: [{ category: 'Frontend', items: ['TypeScript'] }],
      education: [
        {
          degree: 'BSc Mathematics',
          school: 'University of London',
          dates: '2016-2019',
        },
      ],
      projects: [
        {
          name: 'MatchMind',
          description: 'Job matching app',
        },
      ],
      coverRecipientBlock: 'Hiring Manager',
      coverGreeting: 'Dear Hiring Manager,',
      coverBodyMarkdown: 'Hello',
      coverClosing: 'Kind regards,',
      tailoringDecisions: ['Emphasized TypeScript'],
    });

    expect(text).toContain('Selected Projects');
    expect(text).toContain('LinkedIn');
    expect(text).not.toContain('linkedin.com');
    expect(text).toContain('Frontend: TypeScript');
    expect(text).toContain('BSc Mathematics, University of London (2016-2019)');
  });
});

describe('createZipBuffer', () => {
  it('builds a non-empty zip', () => {
    const zip = createZipBuffer([{ name: 'cv.tex', data: Buffer.from('hello') }]);
    expect(zip.length).toBeGreaterThan(30);
    expect(zip.readUInt32LE(0)).toBe(0x04034b50);
  });
});
