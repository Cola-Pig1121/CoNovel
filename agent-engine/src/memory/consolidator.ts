// ============================================================================
// Memory Consolidator — Compress old facts into long-term memory
// Deterministic consolidation (no LLM needed) that groups, deduplicates,
// and summarizes facts into a compact long-term memory representation.
// ============================================================================

import { MemoryStore } from "./store.js";
import type { LongTermMemory, FactEntry, ChapterSummary } from "./types.js";

export class MemoryConsolidator {
  private store: MemoryStore;

  constructor(store: MemoryStore) {
    this.store = store;
  }

  /**
   * Check if consolidation is needed (every N chapters).
   */
  shouldConsolidate(currentChapter: number, interval: number = 10): boolean {
    if (currentChapter < interval) return false;

    const longTerm = this.store.getLongTermMemory();
    if (!longTerm.lastConsolidatedAt) return true;

    // Check how many chapters since last consolidation
    const allSummaries = this.store.getAllSummaries();
    const lastConsolidatedChapter = allSummaries
      .filter(
        (s) => s.createdAt <= longTerm.lastConsolidatedAt
      )
      .sort((a, b) => b.chapterNumber - a.chapterNumber)[0]?.chapterNumber ?? 0;

    return currentChapter - lastConsolidatedChapter >= interval;
  }

  /**
   * Run consolidation: compress facts older than threshold into long-term memory.
   * This is a deterministic process (no LLM needed):
   * - Group facts by category
   * - Keep the most recent/confident facts per subject
   * - Mark resolved plot threads
   * - Update world facts list
   */
  consolidate(currentChapter: number): LongTermMemory {
    const longTerm = this.store.getLongTermMemory();
    const allFacts = this.store.getAllFacts();

    // Separate old facts (pre-consolidation threshold) from recent ones
    const threshold = Math.max(1, currentChapter - 10);
    const oldFacts = allFacts.filter((f) => f.chapterNumber < threshold);
    const recentFacts = allFacts.filter((f) => f.chapterNumber >= threshold);

    // --- Consolidate world facts from 'state' and 'location' categories ---
    const worldFacts = this.consolidateWorldFacts(
      longTerm.worldFacts,
      oldFacts
    );

    // --- Consolidate plot threads from 'hook' category ---
    const activePlotThreads = this.consolidatePlotThreads(
      longTerm.activePlotThreads,
      oldFacts,
      recentFacts
    );

    // --- Consolidate style evolution (preserved as-is, append new) ---
    const styleEvolution = longTerm.styleEvolution;

    const consolidated: LongTermMemory = {
      worldFacts,
      activePlotThreads,
      styleEvolution,
      lastConsolidatedAt: new Date().toISOString(),
    };

    this.store.saveLongTermMemory(consolidated);
    this.store.updateIndex();

    return consolidated;
  }

  /**
   * Build a "story so far" summary from all summaries and long-term memory.
   */
  buildStorySoFar(): string {
    const sections: string[] = [];
    const longTerm = this.store.getLongTermMemory();
    const summaries = this.store.getAllSummaries();

    // World setting
    if (longTerm.worldFacts.length > 0) {
      sections.push("## 世界设定");
      for (const fact of longTerm.worldFacts) {
        sections.push(`- ${fact}`);
      }
    }

    // Story summary
    if (summaries.length > 0) {
      sections.push("## 故事进展");
      for (const s of summaries) {
        sections.push(`### 第${s.chapterNumber}章: ${s.title}`);
        sections.push(s.summary);
      }
    }

    // Active plot threads
    const activeThreads = longTerm.activePlotThreads.filter(
      (t) => t.status === "active"
    );
    if (activeThreads.length > 0) {
      sections.push("## 活跃伏笔");
      for (const thread of activeThreads) {
        sections.push(
          `- [第${thread.plantedChapter}章] ${thread.description}`
        );
      }
    }

    // Style evolution
    if (longTerm.styleEvolution.length > 0) {
      sections.push("## 风格演变");
      for (const e of longTerm.styleEvolution) {
        const metrics = Object.entries(e.metrics)
          .map(([k, v]) => `${k}: ${v.toFixed(2)}`)
          .join(", ");
        sections.push(`- 第${e.chapter}章: ${metrics}`);
      }
    }

    return sections.join("\n\n");
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Consolidate world facts: keep unique state/location facts.
   */
  private consolidateWorldFacts(
    existing: string[],
    oldFacts: FactEntry[]
  ): string[] {
    const worldFacts = new Set(existing);

    for (const fact of oldFacts) {
      if (fact.category === "state" || fact.category === "location") {
        // Only keep high-confidence facts
        if (fact.confidence >= 0.6) {
          worldFacts.add(fact.content);
        }
      }
    }

    return [...worldFacts];
  }

  /**
   * Consolidate plot threads: track hook lifecycle.
   */
  private consolidatePlotThreads(
    existing: LongTermMemory["activePlotThreads"],
    oldFacts: FactEntry[],
    recentFacts: FactEntry[]
  ): LongTermMemory["activePlotThreads"] {
    // Start with existing threads
    const threads = new Map(existing.map((t) => [t.id, { ...t }]));

    // Add new hooks from old facts
    for (const fact of oldFacts) {
      if (fact.category === "hook") {
        // Check if a matching hook was resolved
        const resolved = recentFacts.some(
          (rf) =>
            rf.category === "information" &&
            rf.content.toLowerCase().includes(fact.subject.toLowerCase())
        );

        threads.set(fact.id, {
          id: fact.id,
          description: fact.content,
          plantedChapter: fact.chapterNumber,
          status: resolved ? "resolved" : "active",
        });
      }
    }

    return [...threads.values()];
  }
}
