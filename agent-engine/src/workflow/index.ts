// Public API exports for CoNovel Workflow Engine

// Types
export * from './types'

// Engine
export { WorkflowEngine } from './engine'

// Loop utilities
export { 
  createLoopState, 
  checkLoopConvergence, 
  shouldContinueLoop,
  LoopState 
} from './loop'

// Harness utilities
export {
  deduplicateFindings,
  validateChapterStructure,
  normalizeCharacterState,
  factCheckTimeline,
  calculateWordCount,
  extractDialogueRatio,
  detectAIPatterns,
  generateRunReport
} from './harness'