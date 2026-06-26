import { z } from 'zod';

// ===== Feedback Record =====
export const FeedbackRecordSchema = z.object({
  id: z.string().uuid(),
  chapterId: z.string(),
  bookId: z.string(),
  agentRole: z.string(),
  dimension: z.enum(['consistency', 'pacing', 'character', 'style', 'engagement', 'worldbuilding', 'dialogue']),
  score: z.number().min(0).max(10),
  issues: z.array(z.string()),
  suggestions: z.array(z.string()),
  timestamp: z.string().datetime(),
});
export type FeedbackRecord = z.infer<typeof FeedbackRecordSchema>;

// ===== Evolution Strategy =====
export const EvolutionStrategySchema = z.object({
  agentRole: z.string(),
  strategy: z.string(),           // Natural language description
  promptAdjustments: z.record(z.string()), // key -> value prompt modifications
  weightChanges: z.record(z.number()),     // key -> weight delta
  appliedAt: z.string().datetime(),
  effectiveness: z.number().min(-1).max(1).optional(), // Measured later
});
export type EvolutionStrategy = z.infer<typeof EvolutionStrategySchema>;

// ===== Style Evolution =====
export const StyleEvolutionSchema = z.object({
  bookId: z.string(),
  chapterRange: z.object({
    from: z.number(),
    to: z.number(),
  }),
  changes: z.array(z.object({
    metric: z.string(),
    fromValue: z.number(),
    toValue: z.number(),
    description: z.string(),
  })),
  successfulExperiments: z.array(z.object({
    chapterNumber: z.number(),
    technique: z.string(),
    impact: z.number(),
  })),
  timestamp: z.string().datetime(),
});
export type StyleEvolution = z.infer<typeof StyleEvolutionSchema>;

// ===== Agent Learning Record =====
export const AgentLearningRecordSchema = z.object({
  agentRole: z.string(),
  learningType: z.enum(['prompt_refinement', 'technique_adoption', 'error_avoidance', 'style_calibration']),
  description: z.string(),
  trigger: z.string(), // What caused this learning
  impact: z.number().min(-1).max(1),
  applied: z.boolean().default(false),
  createdAt: z.string().datetime(),
});
export type AgentLearningRecord = z.infer<typeof AgentLearningRecordSchema>;
