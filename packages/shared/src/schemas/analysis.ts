import { z } from 'zod';

export const skillBreakdownSchema = z.object({
  commercialExperience: z.number().min(0).max(100),
  aiExperience: z.number().min(0).max(100),
  cloudExperience: z.number().min(0).max(100),
  communication: z.number().min(0).max(100),
  problemSolving: z.number().min(0).max(100),
});

export const cvImprovementSchema = z.object({
  section: z.string(),
  current: z.string(),
  suggested: z.string(),
});

export const interviewQuestionSchema = z.object({
  question: z.string(),
  rationale: z.string(),
});

export const analysisResultSchema = z.object({
  overallMatchScore: z.number().min(0).max(100),
  skillBreakdown: skillBreakdownSchema,
  strengths: z.array(z.string()),
  missingSkills: z.array(z.string()),
  cvImprovements: z.array(cvImprovementSchema),
  coverLetter: z.string(),
  interviewQuestions: z.array(interviewQuestionSchema),
});

export type SkillBreakdown = z.infer<typeof skillBreakdownSchema>;
export type CvImprovement = z.infer<typeof cvImprovementSchema>;
export type InterviewQuestion = z.infer<typeof interviewQuestionSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
