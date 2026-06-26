import { z } from 'zod';

// ===== Pipeline Stages =====
export const PipelineStageEnum = z.enum([
  'context_assembly',      // 上下文组装
  'character_intelligence', // 角色智能推理
  'writing',               // 正文创作
  'observation',           // 事件观察记录
  'fact_check',            // 事实核查
  'continuity_check',      // 连续性检查
  'pacing_check',          // 节奏检查
  'review',                // 综合审阅
  'editing',               // 文字润色
  'de_ai',                 // 去AI味
  'reflector',             // 质量反思
  'state_sync',            // 状态同步
]);
export type PipelineStage = z.infer<typeof PipelineStageEnum>;

// ===== Quality Gate =====
export const QualityGateSchema = z.object({
  l1_memorySync: z.boolean().default(false),
  l2_factCheck: z.boolean().default(false),
  l3_continuity: z.boolean().default(false),
  l4_styleCalibration: z.boolean().default(false),
  l5_deAi: z.boolean().default(false),
});
export type QualityGate = z.infer<typeof QualityGateSchema>;

// ===== Pipeline Result =====
export interface PipelineResult {
  bookId: string;
  chapterNumber: number;
  stage: PipelineStage;
  success: boolean;
  output: string;
  gateStatus: QualityGate;
  agentResults: AgentStageResult[];
  duration: number; // total ms
  wordCount: number;
}

export interface AgentStageResult {
  agentRole: string;
  stage: PipelineStage;
  success: boolean;
  output: string;
  score?: number;
  issues?: string[];
  duration: number;
}

// ===== Pipeline Config =====
export interface PipelineConfig {
  maxReviewRounds: number;      // Default: 3
  maxRewriteRounds: number;     // Default: 2
  humanInterventionThreshold: number; // Default: 3 consecutive failures
  skipStages?: PipelineStage[]; // Stages to skip (for testing)
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  maxReviewRounds: 3,
  maxRewriteRounds: 2,
  humanInterventionThreshold: 3,
};

// ===== Context Assembly Result =====
export interface AssembledContext {
  chapterOutline: string;
  previousChapterSummary: string;
  characterBriefs: string;
  novelPlanExcerpt: string;
  styleAnchor: string;
  foreshadowingStatus: string;
  timelineEvents: string;
  worldSettings: string;
  entryMode: string;
}
