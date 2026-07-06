// ============================================================================
// Memory System — Re-export all modules
// ============================================================================

export type {
  FactEntry,
  FactTier,
  ChapterSummary,
  CharacterMemoryState,
  LongTermMemory,
  MemoryIndex,
  SearchResult,
  SearchOptions,
  MemoryStoreInterface,
} from "./types.js";

export { MemoryStore, createMemoryStore } from "./store.js";

export { SQLiteMemoryStore } from "./sqlite-store.js";

export {
  extractFactsHeuristic,
  buildExtractionPrompt,
  parseExtractionResponse,
} from "./extractor.js";

export { MemoryRetriever } from "./retriever.js";

export { MemoryConsolidator } from "./consolidator.js";

export {
  ConflictDetector,
} from "./conflict-detector.js";

export type {
  ConflictReport,
  Conflict,
} from "./conflict-detector.js";
