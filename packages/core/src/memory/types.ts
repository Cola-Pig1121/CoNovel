import { z } from 'zod';

// ===== Working Memory (L1) =====
// 当前章节的短期工作记忆，通过Vercel Workflows持久化

export const WorkingMemorySchema = z.object({
  chapterNumber: z.number(),
  bookId: z.string().uuid(),
  context: z.string(),          // 当前章节上下文
  agentOutputs: z.record(z.string()), // agentRole -> output
  taskQueue: z.array(z.string()),     // 待处理任务
  temporaryState: z.record(z.unknown()), // 临时状态
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});
export type WorkingMemory = z.infer<typeof WorkingMemorySchema>;

// ===== Story Memory (L2) =====
// 持久化的故事记忆，存储角色、伏笔、时间线等

export const StoryMemorySchema = z.object({
  bookId: z.string().uuid(),
  characters: z.array(z.object({
    id: z.string(),
    name: z.string(),
    lastState: z.string(),       // 最近状态描述
    lastChapter: z.number(),
    emotionalState: z.string(),
  })),
  recentEvents: z.array(z.object({
    chapterNumber: z.number(),
    description: z.string(),
    timestamp: z.string(),
  })),
  openForeshadowing: z.array(z.object({
    id: z.string(),
    description: z.string(),
    plantedIn: z.number(),
    urgency: z.string(),
  })),
  worldState: z.record(z.string()), // 世界状态快照
  lastUpdated: z.string().datetime(),
});
export type StoryMemory = z.infer<typeof StoryMemorySchema>;

// ===== Style Memory (L3) =====
// 风格记忆，存储风格指纹和进化轨迹

export const StyleFingerprintSchema = z.object({
  chapterNumber: z.number(),
  vocabularyProfile: z.record(z.number()), // word -> frequency
  sentencePatterns: z.object({
    avgLength: z.number(),
    shortSentenceRatio: z.number(),  // < 10 chars
    longSentenceRatio: z.number(),   // > 40 chars
    questionRatio: z.number(),
    exclamationRatio: z.number(),
  }),
  paragraphRhythm: z.object({
    avgParagraphLength: z.number(),
    avgSentencesPerParagraph: z.number(),
    dialogueRatio: z.number(),
    descriptionRatio: z.number(),
    innerThoughtRatio: z.number(),
  }),
  dialogueStyle: z.object({
    avgDialogueLength: z.number(),
    tagFrequency: z.number(),        // "他说" etc.
    actionDialogueRatio: z.number(), // action beats vs tags
  }),
  emotionProfile: z.record(z.number()), // emotion -> intensity
  readabilityScore: z.number(),
  aiPatternScore: z.number(),       // 0 = no AI patterns, 10 = heavy AI
});
export type StyleFingerprint = z.infer<typeof StyleFingerprintSchema>;

export const StyleMemorySchema = z.object({
  bookId: z.string().uuid(),
  fingerprints: z.array(StyleFingerprintSchema),
  aggregated: StyleFingerprintSchema.nullable(),
  evolution: z.array(z.object({
    chapterNumber: z.number(),
    changes: z.record(z.number()), // metric -> delta
    timestamp: z.string().datetime(),
  })),
  successfulExperiments: z.array(z.object({
    chapterNumber: z.number(),
    technique: z.string(),
    impact: z.number(), // -1 to 1
  })),
  styleAnchor: z.string().optional(), // 风格锚点文本
  lastCalibratedAt: z.string().datetime().optional(),
});
export type StyleMemory = z.infer<typeof StyleMemorySchema>;

// ===== Agent Performance Memory =====
export const AgentPerformanceMemorySchema = z.object({
  agentRole: z.string(),
  chapters: z.array(z.object({
    chapterNumber: z.number(),
    score: z.number(),
    issues: z.array(z.string()),
    duration: z.number(),
  })),
  trend: z.enum(['improving', 'stable', 'declining']),
  recommendations: z.array(z.string()),
});
export type AgentPerformanceMemory = z.infer<typeof AgentPerformanceMemorySchema>;
