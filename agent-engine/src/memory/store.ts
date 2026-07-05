// ============================================================================
// Memory Store — Filesystem-based memory storage
// All operations read/write to the book's memory/ directory as JSON files.
// ============================================================================

import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type {
  FactEntry,
  ChapterSummary,
  CharacterMemoryState,
  LongTermMemory,
  MemoryIndex,
} from "./types.js";

export class MemoryStore {
  private memoryDir: string;
  private factsDir: string;
  private summariesDir: string;
  private characterStatesDir: string;
  private longTermDir: string;

  constructor(bookPath: string) {
    this.memoryDir = join(bookPath, "memory");
    this.factsDir = join(this.memoryDir, "facts");
    this.summariesDir = join(this.memoryDir, "summaries");
    this.characterStatesDir = join(this.memoryDir, "character_states");
    this.longTermDir = join(this.memoryDir, "long_term");
    this.ensureDirs();
  }

  // ---------------------------------------------------------------------------
  // Directory setup
  // ---------------------------------------------------------------------------

  private ensureDirs(): void {
    for (const dir of [
      this.memoryDir,
      this.factsDir,
      this.summariesDir,
      this.characterStatesDir,
      this.longTermDir,
    ]) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Facts
  // ---------------------------------------------------------------------------

  saveFacts(chapterNumber: number, facts: FactEntry[]): void {
    const filePath = join(this.factsDir, `chapter_${chapterNumber}.json`);
    this.writeJson(filePath, facts);
  }

  getFacts(chapterNumber: number): FactEntry[] {
    const filePath = join(this.factsDir, `chapter_${chapterNumber}.json`);
    return this.readJson<FactEntry[]>(filePath, []);
  }

  getAllFacts(): FactEntry[] {
    const facts: FactEntry[] = [];
    const files = readdirSync(this.factsDir).filter((f) =>
      f.startsWith("chapter_") && f.endsWith(".json")
    );

    for (const file of files) {
      const filePath = join(this.factsDir, file);
      const chapterFacts = this.readJson<FactEntry[]>(filePath, []);
      facts.push(...chapterFacts);
    }

    // Sort by chapter number then by creation time
    facts.sort((a, b) => a.chapterNumber - b.chapterNumber);
    return facts;
  }

  getFactsByCategory(category: string): FactEntry[] {
    return this.getAllFacts().filter((f) => f.category === category);
  }

  getFactsBySubject(subject: string): FactEntry[] {
    const lowerSubject = subject.toLowerCase();
    return this.getAllFacts().filter(
      (f) => f.subject.toLowerCase().includes(lowerSubject)
    );
  }

  // ---------------------------------------------------------------------------
  // Summaries
  // ---------------------------------------------------------------------------

  saveSummary(summary: ChapterSummary): void {
    const filePath = join(
      this.summariesDir,
      `chapter_${summary.chapterNumber}.json`
    );
    this.writeJson(filePath, summary);
  }

  getSummary(chapterNumber: number): ChapterSummary | null {
    const filePath = join(this.summariesDir, `chapter_${chapterNumber}.json`);
    if (!existsSync(filePath)) return null;
    return this.readJson<ChapterSummary | null>(filePath, null);
  }

  getAllSummaries(): ChapterSummary[] {
    const summaries: ChapterSummary[] = [];
    const files = readdirSync(this.summariesDir).filter((f) =>
      f.startsWith("chapter_") && f.endsWith(".json")
    );

    for (const file of files) {
      const filePath = join(this.summariesDir, file);
      const summary = this.readJson<ChapterSummary | null>(filePath, null);
      if (summary) {
        summaries.push(summary);
      }
    }

    summaries.sort((a, b) => a.chapterNumber - b.chapterNumber);
    return summaries;
  }

  // ---------------------------------------------------------------------------
  // Character States
  // ---------------------------------------------------------------------------

  saveCharacterState(state: CharacterMemoryState): void {
    const filePath = join(
      this.characterStatesDir,
      `${state.characterId}.json`
    );
    this.writeJson(filePath, state);
  }

  getCharacterState(charId: string): CharacterMemoryState | null {
    const filePath = join(this.characterStatesDir, `${charId}.json`);
    if (!existsSync(filePath)) return null;
    return this.readJson<CharacterMemoryState | null>(filePath, null);
  }

  getAllCharacterStates(): CharacterMemoryState[] {
    const states: CharacterMemoryState[] = [];
    const files = readdirSync(this.characterStatesDir).filter((f) =>
      f.endsWith(".json")
    );

    for (const file of files) {
      const filePath = join(this.characterStatesDir, file);
      const state = this.readJson<CharacterMemoryState | null>(filePath, null);
      if (state) {
        states.push(state);
      }
    }

    return states;
  }

  // ---------------------------------------------------------------------------
  // Long-term Memory
  // ---------------------------------------------------------------------------

  getLongTermMemory(): LongTermMemory {
    const filePath = join(this.longTermDir, "long_term_memory.json");
    return this.readJson<LongTermMemory>(filePath, {
      worldFacts: [],
      activePlotThreads: [],
      styleEvolution: [],
      lastConsolidatedAt: new Date().toISOString(),
    });
  }

  saveLongTermMemory(memory: LongTermMemory): void {
    const filePath = join(this.longTermDir, "long_term_memory.json");
    this.writeJson(filePath, memory);
  }

  // ---------------------------------------------------------------------------
  // Index
  // ---------------------------------------------------------------------------

  getIndex(): MemoryIndex {
    const filePath = join(this.memoryDir, "index.json");
    return this.readJson<MemoryIndex>(filePath, {
      factCount: 0,
      summaryCount: 0,
      lastFactChapter: 0,
      lastSummaryChapter: 0,
      lastConsolidation: "",
      categories: {},
    });
  }

  updateIndex(): void {
    const allFacts = this.getAllFacts();
    const allSummaries = this.getAllSummaries();

    // Count facts per category
    const categories: Record<string, number> = {};
    for (const fact of allFacts) {
      categories[fact.category] = (categories[fact.category] ?? 0) + 1;
    }

    const lastFactChapter =
      allFacts.length > 0
        ? Math.max(...allFacts.map((f) => f.chapterNumber))
        : 0;

    const lastSummaryChapter =
      allSummaries.length > 0
        ? Math.max(...allSummaries.map((s) => s.chapterNumber))
        : 0;

    const index: MemoryIndex = {
      factCount: allFacts.length,
      summaryCount: allSummaries.length,
      lastFactChapter,
      lastSummaryChapter,
      lastConsolidation: new Date().toISOString(),
      categories,
    };

    const filePath = join(this.memoryDir, "index.json");
    this.writeJson(filePath, index);
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  private readJson<T>(path: string, fallback: T): T {
    try {
      if (!existsSync(path)) return fallback;
      const raw = readFileSync(path, "utf-8");
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private writeJson(path: string, data: unknown): void {
    writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
  }
}
