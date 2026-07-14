import type { ZodSchema } from 'zod';
import type { AIProviders, LLMResult } from '../src/ai/providers/types.js';
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

    const data = schema.parse(sampleAnalysis);
    return { data, usage, rawText: JSON.stringify(data) };
  }
}
