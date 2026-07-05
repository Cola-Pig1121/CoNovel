// ============================================================================
// Memory System — Re-export all modules
// ============================================================================

export type {
  FactEntry,
  ChapterSummary,
  CharacterMemoryState,
  LongTermMemory,
  MemoryIndex,
  SearchResult,
} from "./types.js";

export { MemoryStore } from "./store.js";

export {
  extractFactsHeuristic,
  buildExtractionPrompt,
  parseExtractionResponse,
} from "./extractor.js";

export { MemoryRetriever } from "./retriever.js";

export { MemoryConsolidator } from "./consolidator.js";
