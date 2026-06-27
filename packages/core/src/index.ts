// CoNovel Core - 自进化多Agent小说写作系统核心引擎

// State Management
export { StateManager } from './state/manager.js';
export type {
  NovelState,
  BookState,
  ChapterState,
  Character,
  Foreshadowing,
  ChapterOutline,
  VolumeOutline,
  TimelineEvent,
} from './state/types.js';

// Agent System
export { AgentRegistry } from './agents/registry.js';
export { BaseAgent } from './agents/base.js';
export type {
  AgentConfig,
  AgentRole,
  AgentPerformance,
  AgentResult,
  ModelConfig,
  ApiFormat,
} from './agents/types.js';
export type { AgentInput } from './agents/base.js';
export { AGENT_DEFINITIONS } from './agents/types.js';

// Memory System
export { MemoryManager } from './memory/manager.js';
export type {
  WorkingMemory,
  StoryMemory,
  StyleMemory,
  StyleFingerprint,
  AgentPerformanceMemory,
} from './memory/types.js';

// Pipeline
export { ChapterPipeline } from './pipeline/chapter-pipeline.js';
export type {
  PipelineStage,
  PipelineResult,
  AgentStageResult,
  PipelineConfig,
  QualityGate,
  AssembledContext,
} from './pipeline/types.js';

// Evolution
export { EvolutionEngine } from './evolution/engine.js';
export type {
  FeedbackRecord,
  StyleEvolution,
  EvolutionStrategy,
  AgentLearningRecord,
} from './evolution/types.js';

// Genres
export { GenreRegistry } from './genres/registry.js';
export type { GenreTemplate } from './genres/types.js';

// Knowledge Base
export { KnowledgeBase } from './knowledge/index.js';
export type { KnowledgeEntry } from './knowledge/index.js';

// LLM Client
export { callLLM, scanModels, checkReasoning, getAgentLLMConfig } from './llm/client.js';
export type { LLMConfig, LLMResponse } from './llm/client.js';
export { loadAgentSystemPrompt } from './llm/instructions.js';
