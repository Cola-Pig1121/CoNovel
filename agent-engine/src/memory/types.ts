// ============================================================================
// Memory System Types — Mem0-inspired fact extraction + InkOS-style observer categories
// ============================================================================

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
