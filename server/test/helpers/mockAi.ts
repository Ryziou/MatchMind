import type { ZodSchema } from 'zod';
import type { AIProviders, LLMResult } from '../../src/ai/providers/types.js';
import type { AnalysisResult } from '@matchmind/shared';

const EMBEDDING_DIM = 8;

function hashText(text: string): number[] {
  const values = Array.from({ length: EMBEDDING_DIM }, () => 0);
  for (let i = 0; i < text.length; i += 1) {
    const index = i % EMBEDDING_DIM;
    values[index] = (values[index]! + text.charCodeAt(i)) % 97;
  }
  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0)) || 1;
  return values.map((value) => value / magnitude);
}

const sampleAnalysis: AnalysisResult = {
  overallMatchScore: 80,
  skillBreakdown: {
    commercialExperience: 70,
    aiExperience: 75,
    cloudExperience: 65,
    communication: 80,
    problemSolving: 85,
  },
  strengths: ['TypeScript experience'],
  missingSkills: [],
  cvImprovements: [
    {
      section: 'Summary',
      current: 'Developer',
      suggested: 'TypeScript developer with RAG experience',
    },
  ],
  coverLetter:
    'Dear Hiring Manager,\n\nI am writing to apply for this role.\n\nSincerely,\nCandidate',
  interviewQuestions: [
    {
      question: 'Tell me about a RAG project.',
      rationale: 'Checks applied RAG experience.',
      exampleAnswer: 'I built a retrieval pipeline with TypeScript and Chroma.',
      commonMistakes: ['Speaking only in generalities'],
    },
  ],
};

const sampleDraft = {
  candidateName: 'Ada Lovelace',
  headline: 'Software Engineer',
  contact: {
    email: 'ada@example.com',
    phone: '+44 7700 900123',
    location: 'London',
    linkedinUrl: 'https://www.linkedin.com/in/ada-lovelace',
    githubUrl: 'https://github.com/ada',
    portfolioUrl: 'https://ada.dev',
  },
  profile: 'Software engineer with TypeScript and RAG experience.',
  experience: [
    {
      title: 'Software Engineer',
      company: 'Analytical Engines',
      dates: '2020-2024',
      location: 'London, UK',
      bullets: ['Built TypeScript services', 'Shipped a RAG prototype'],
    },
  ],
  skills: [
    { category: 'Frontend', items: ['TypeScript', 'React'] },
    { category: 'Tooling', items: ['Node.js', 'RAG'] },
  ],
  education: [
    {
      degree: 'BSc Mathematics',
      school: 'University of London',
      dates: '2016-2019',
      details: 'First class',
    },
  ],
  projects: [
    {
      name: 'MatchMind',
      description: 'CV matching app with TypeScript and ChromaDB',
      link: 'https://example.com',
    },
  ],
  coverRecipientBlock: 'Hiring Manager\nAcme Corp',
  coverGreeting: 'Dear Hiring Manager,',
  coverBodyMarkdown:
    'I am excited to apply for this role at Acme.\n\n- **TypeScript delivery:** My TypeScript and RAG experience maps well to your needs.',
  coverClosing: 'Kind regards,',
  tailoringDecisions: ['Emphasized RAG', 'Kept claims grounded in CV chunks'],
};

export class MockAIProvider implements AIProviders {
  async embedDocuments(texts: string[]): Promise<number[][]> {
    return texts.map((text) => hashText(text));
  }

  async embedQuery(text: string): Promise<number[]> {
    return hashText(text);
  }

  async generateJSON<T>(prompt: string, schema: ZodSchema<T>): Promise<LLMResult<T>> {
    const usage = { promptTokens: 10, completionTokens: 20, totalTokens: 30 };

    if (prompt.includes('career coach helping a candidate prepare')) {
      const data = schema.parse({
        answer: 'Your TypeScript and RAG experience is a strong match for this role.',
        citedChunkIds: [],
      });
      return { data, usage, rawText: JSON.stringify(data) };
    }

    if (prompt.includes('Extract structured fields from this job posting')) {
      const data = schema.parse({
        roleTitle: 'Software Engineer',
        companyName: 'Acme',
        companyUrl: 'https://example.com',
        jobDescription: 'We need TypeScript and RAG experience.',
        postingLanguage: 'English',
      });
      return { data, usage, rawText: JSON.stringify(data) };
    }

    if (prompt.includes('Evaluate fit between the candidate')) {
      const data = schema.parse({
        overallMatchScore: 82,
        strengths: ['TypeScript experience', 'RAG prototype'],
        missingSkills: ['Kubernetes'],
      });
      return { data, usage, rawText: JSON.stringify(data) };
    }

    if (prompt.includes('drafting a tailored CV and cover letter')) {
      const data = schema.parse(sampleDraft);
      return { data, usage, rawText: JSON.stringify(data) };
    }

    if (prompt.includes('overflows page limits')) {
      const data = schema.parse(sampleDraft);
      return { data, usage, rawText: JSON.stringify(data) };
    }

    if (prompt.includes('hiring-manager proxy reviewing')) {
      const data = schema.parse({
        structuredEdits: [],
        missedKeywords: [],
        companyAngles: ['Mention Acme mission only if in brief'],
        reframingNotes: [],
        toneNotes: [],
      });
      return { data, usage, rawText: JSON.stringify(data) };
    }

    if (prompt.includes('researching') && prompt.includes('CompanyBrief')) {
      const data = schema.parse({
        companyName: 'Acme',
        mission: 'Build useful tools',
        productsOrServices: ['Analytics'],
        recentNews: [],
        cultureSignals: ['Collaboration'],
        anglesForCoverLetter: ['Align on shipping useful tools'],
        sources: [{ title: 'Acme', url: 'https://example.com' }],
        researchStatus: 'complete',
      });
      return { data, usage, rawText: JSON.stringify(data) };
    }

    if (prompt.includes('ATS coverage scoring')) {
      const data = schema.parse({
        keywords: [
          { keyword: 'TypeScript', priority: 'required' },
          { keyword: 'RAG', priority: 'preferred' },
        ],
      });
      return { data, usage, rawText: JSON.stringify(data) };
    }

    if (prompt.includes('preparing interview questions')) {
      const data = schema.parse({
        interviewQuestions: sampleAnalysis.interviewQuestions,
      });
      return { data, usage, rawText: JSON.stringify(data) };
    }

    const data = schema.parse(sampleAnalysis);
    return { data, usage, rawText: JSON.stringify(data) };
  }
}
