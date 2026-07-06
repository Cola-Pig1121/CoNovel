// ============================================================================
// Memory System Types — Mem0-inspired fact extraction + InkOS-style observer categories
// ============================================================================

export type FactTier = "active" | "indexed" | "core";

export interface FactEntry {
  id: string;
  chapterNumber: number;
  category:
    | "character"
    | "location"
    | "resource"
    | "relationship"
    | "emotion"
    | "information"
    | "hook"
    | "time"
    | "state";
  subject: string; // what/who this fact is about
  content: string; // the fact itself
  confidence: number; // 0-1
  createdAt: string;
  expiresAt?: string; // for facts that become outdated
  tier?: FactTier; // memory tier: active / indexed / core
  tags?: string[]; // e.g. ['PERMANENT'] to pin to core tier
}

export interface ChapterSummary {
  chapterNumber: number;
  title: string;
  summary: string;
  keyEvents: string[];
  wordCount: number;
  createdAt: string;
}

export interface CharacterMemoryState {
  characterId: string;
  characterName: string;
  lastSeenChapter: number;
  emotionalArc: { chapter: number; emotion: string; intensity: number }[];
  knownFacts: string[]; // facts this character knows
  relationships: Record<
    string,
    { type: string; trust: number; lastChange: number }
  >;
  growthNotes: string[]; // character development observations
  updatedAt: string;
}

export interface LongTermMemory {
  worldFacts: string[]; // persistent world settings
  activePlotThreads: {
    id: string;
    description: string;
    plantedChapter: number;
    status: "active" | "resolved" | "abandoned";
  }[];
  styleEvolution: { chapter: number; metrics: Record<string, number> }[];
  lastConsolidatedAt: string;
}

export interface MemoryIndex {
  factCount: number;
  summaryCount: number;
  lastFactChapter: number;
  lastSummaryChapter: number;
  lastConsolidation: string;
  categories: Record<string, number>; // count per category
}

export interface SearchResult {
  entry: FactEntry;
  score: number;
  reason: string;
}

export interface SearchOptions {
  category?: string;
  subject?: string;
  maxResults?: number;
  timeDecay?: boolean;
  currentChapter?: number;
  tier?: FactTier;
}

// ---------------------------------------------------------------------------
// MemoryStoreInterface — common contract for JSON and SQLite backends
// ---------------------------------------------------------------------------

export interface MemoryStoreInterface {
  // Facts
  saveFacts(chapterNumber: number, facts: FactEntry[]): void;
  getFacts(chapterNumber: number): FactEntry[];
  getAllFacts(): FactEntry[];
  getFactsByCategory(category: string): FactEntry[];
  getFactsBySubject(subject: string): FactEntry[];

  // Summaries
  saveSummary(summary: ChapterSummary): void;
  getSummary(chapterNumber: number): ChapterSummary | null;
  getAllSummaries(): ChapterSummary[];

  // Character states
  saveCharacterState(state: CharacterMemoryState): void;
  getCharacterState(charId: string): CharacterMemoryState | null;
  getAllCharacterStates(): CharacterMemoryState[];

  // Long-term memory
  getLongTermMemory(): LongTermMemory;
  saveLongTermMemory(memory: LongTermMemory): void;

  // Index
  getIndex(): MemoryIndex;
  updateIndex(): void;
}
