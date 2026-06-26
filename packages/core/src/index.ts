// CoNovel Core - 自进化多Agent小说写作系统核心引擎

// State Management
export { StateManager } from './state/manager.js';
export type { NovelState, BookState, ChapterState } from './state/types.js';

// Agent System
export { AgentRegistry } from './agents/registry.js';
export { BaseAgent } from './agents/base.js';
export type { AgentConfig, AgentRole, AgentPerformance } from './agents/types.js';

// Memory System
export { MemoryManager } from './memory/manager.js';
export type { WorkingMemory, StoryMemory, StyleMemory, StyleFingerprint } from './memory/types.js';

// Pipeline
export { ChapterPipeline } from './pipeline/chapter-pipeline.js';
export type { PipelineStage, PipelineResult } from './pipeline/types.js';

// Evolution
export { EvolutionEngine } from './evolution/engine.js';
export type { FeedbackRecord, StyleEvolution } from './evolution/types.js';

// Genres
export { GenreRegistry } from './genres/registry.js';
export type { GenreTemplate } from './genres/types.js';
