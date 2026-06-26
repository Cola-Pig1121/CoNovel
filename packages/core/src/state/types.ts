import { z } from 'zod';

// ===== Book State =====
export const BookStateSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  genre: z.string(),
  targetWordCount: z.number().positive(),
  currentWordCount: z.number().min(0).default(0),
  currentChapter: z.number().min(0).default(0),
  totalChapters: z.number().min(0).default(0),
  status: z.enum(['planning', 'writing', 'reviewing', 'completed', 'paused']).default('planning'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type BookState = z.infer<typeof BookStateSchema>;

// ===== Character State =====
export const CharacterSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  role: z.enum(['protagonist', 'antagonist', 'supporting', 'minor']),
  personality: z.array(z.string()),
  background: z.string(),
  goals: z.array(z.string()),
  relationships: z.record(z.string(), z.string()), // characterId -> relationship type
  arcStage: z.string().optional(), // character arc progress
  lastAppearance: z.number().optional(), // last chapter number
});
export type Character = z.infer<typeof CharacterSchema>;

// ===== Foreshadowing State =====
export const ForeshadowingSchema = z.object({
  id: z.string().uuid(),
  plantedIn: z.number(), // chapter number
  description: z.string(),
  type: z.enum(['plot', 'character', 'world', 'emotion']),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['planted', 'hinted', 'resolved', 'overdue']),
  resolvedIn: z.number().optional(),
  maxDelay: z.number().optional(), // max chapters before must resolve
});
export type Foreshadowing = z.infer<typeof ForeshadowingSchema>;

// ===== Outline State =====
export const ChapterOutlineSchema = z.object({
  chapterNumber: z.number(),
  title: z.string().optional(),
  summary: z.string(),
  coreEvent: z.string(),
  targetEmotion: z.string(),
  hooks: z.array(z.string()),
  characters: z.array(z.string()), // character IDs
  location: z.string(),
  wordTarget: z.number().default(3000),
  status: z.enum(['planned', 'writing', 'drafted', 'reviewed', 'completed']).default('planned'),
});
export type ChapterOutline = z.infer<typeof ChapterOutlineSchema>;

export const VolumeOutlineSchema = z.object({
  volumeNumber: z.number(),
  title: z.string(),
  summary: z.string(),
  chapters: z.array(ChapterOutlineSchema),
  mainPlotProgress: z.number().min(0).max(1),
});
export type VolumeOutline = z.infer<typeof VolumeOutlineSchema>;

// ===== Timeline Event =====
export const TimelineEventSchema = z.object({
  id: z.string().uuid(),
  chapterNumber: z.number(),
  timestamp: z.string(), // in-story time
  description: z.string(),
  characters: z.array(z.string()),
  location: z.string(),
  significance: z.enum(['minor', 'moderate', 'major', 'critical']),
});
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

// ===== Novel State (SSOT) =====
export const NovelStateSchema = z.object({
  book: BookStateSchema,
  characters: z.array(CharacterSchema),
  foreshadowing: z.array(ForeshadowingSchema),
  outline: z.object({
    volumes: z.array(VolumeOutlineSchema),
    progress: z.object({
      mainPlot: z.number().min(0).max(1),
      subplots: z.record(z.number().min(0).max(1)),
    }),
  }),
  timeline: z.array(TimelineEventSchema),
  worldSettings: z.record(z.string()), // flexible world-building data
  lastSyncedAt: z.string().datetime(),
});
export type NovelState = z.infer<typeof NovelStateSchema>;

// ===== Chapter State =====
export const ChapterStateSchema = z.object({
  chapterNumber: z.number(),
  bookId: z.string().uuid(),
  title: z.string().optional(),
  wordCount: z.number().min(0),
  status: z.enum(['outlined', 'context_assembled', 'character_intelligence', 'writing', 'drafted', 'reviewed', 'editing', 'de_ai', 'completed']),
  qualityGate: z.object({
    l1_memorySync: z.boolean().default(false),
    l2_factCheck: z.boolean().default(false),
    l3_continuity: z.boolean().default(false),
    l4_styleCalibration: z.boolean().default(false),
    l5_deAi: z.boolean().default(false),
  }),
  agentScores: z.record(z.number().min(0).max(10)), // agentId -> score
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ChapterState = z.infer<typeof ChapterStateSchema>;
