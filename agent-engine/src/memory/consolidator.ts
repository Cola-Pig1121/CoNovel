// ============================================================================
// Memory Consolidator — 3-tier memory funnel + long-term compression
//
// Tier 1 (active):  Current + last 3 chapters — fast retrieval, always in memory
// Tier 2 (indexed): Chapters 4–30 — FTS5 searchable, time-decay weighted
// Tier 3 (core):    Chapters 30+ — permanent facts, highest priority
//   Only essential facts survive: character deaths, world rules, major plot points.
//
// Deterministic consolidation (no LLM needed) that groups, deduplicates,
// and promotes facts through tiers as the novel grows.
// ============================================================================

import type {
  FactEntry,
  FactTier,
  LongTermMemory,
  MemoryStoreInterface,
  ChapterSummary,
} from "./types.js";

// ---------------------------------------------------------------------------
// Tuning constants
// ---------------------------------------------------------------------------

/** How many recent chapters stay in tier "active" */
const ACTIVE_WINDOW = 4; // current chapter + previous 3

/** Promotion threshold: every N chapters, promote active → indexed */
const PROMOTE_TO_INDEXED_INTERVAL = 5;

/** Promotion threshold: every N chapters, promote indexed → core */
const PROMOTE_TO_CORE_INTERVAL = 30;

/** Minimum confidence for a fact to survive into core tier */
const CORE_CONFIDENCE_THRESHOLD = 0.7;

/** Categories that are always eligible for core tier */
const CORE_CATEGORIES = new Set([
  "character",
  "location",
  "state",
  "information",
  "relationship",
]);

// ---------------------------------------------------------------------------
// MemoryConsolidator
// ---------------------------------------------------------------------------

export class MemoryConsolidator {
  private store: MemoryStoreInterface;

  constructor(store: MemoryStoreInterface) {
    this.store = store;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Check if consolidation is needed (every N chapters).
   */
  shouldConsolidate(currentChapter: number, interval: number = 10): boolean {
    if (currentChapter < interval) return false;

    const longTerm = this.store.getLongTermMemory();
    if (!longTerm.lastConsolidatedAt) return true;

    // Check how many chapters since last consolidation
    const allSummaries = this.store.getAllSummaries();
    const lastConsolidatedChapter =
      allSummaries
        .filter((s) => s.createdAt <= longTerm.lastConsolidatedAt)
        .sort((a, b) => b.chapterNumber - a.chapterNumber)[0]
        ?.chapterNumber ?? 0;

    return currentChapter - lastConsolidatedChapter >= interval;
  }

  /**
   * Run the full consolidation pipeline:
   *   1. Promote tiers (active → indexed → core)
   *   2. Compress old facts into long-term memory
   *   3. Update the index
   */
  consolidate(currentChapter: number): LongTermMemory {
    // Step 1: Tier promotion
    this.promoteTiers(currentChapter);

    // Step 2: Existing compression logic
    const longTerm = this.compressIntoLongTerm(currentChapter);

    // Step 3: Update index
    this.store.updateIndex();

    return longTerm;
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

  // -------------------------------------------------------------------------
  // Tier promotion
  // -------------------------------------------------------------------------

  /**
   * Promote facts through the 3-tier funnel:
   *   active (current+3) → indexed (4–30) → core (30+, high-confidence only)
   *
   * Also ensures PERMANENT-tagged facts are always pinned to core.
   */
  private promoteTiers(currentChapter: number): void {
    const allFacts = this.store.getAllFacts();
    if (allFacts.length === 0) return;

    const updates: Array<{ id: string; tier: FactTier }> = [];

    for (const fact of allFacts) {
      const newTier = this.computeTier(fact, currentChapter);
      if (fact.tier !== newTier) {
        updates.push({ id: fact.id, tier: newTier });
      }
    }

    // Apply all tier updates in bulk (SQLite) or one-by-one (JSON)
    if (updates.length > 0) {
      if ("bulkUpdateFactTiers" in this.store) {
        (this.store as any).bulkUpdateFactTiers(updates);
      } else {
        // JSON fallback: rewrite all facts with updated tiers
        this.applyTierUpdatesToJSON(allFacts, updates);
      }
    }
  }

  /**
   * Compute the correct tier for a single fact based on its position
   * relative to the current chapter.
   */
  private computeTier(fact: FactEntry, currentChapter: number): FactTier {
    // PERMANENT-tagged facts are always core
    if (fact.tags?.includes("PERMANENT")) {
      return "core";
    }

    const distance = currentChapter - fact.chapterNumber;

    // Tier 1: Active context (current + last 3 chapters)
    if (distance < ACTIVE_WINDOW) {
      return "active";
    }

    // Tier 3: Core (chapters 30+ ago, high confidence, relevant categories)
    if (distance >= PROMOTE_TO_CORE_INTERVAL) {
      if (
        fact.confidence >= CORE_CONFIDENCE_THRESHOLD &&
        CORE_CATEGORIES.has(fact.category)
      ) {
        return "core";
      }
    }

    // Tier 2: Indexed (everything between active and core)
    return "indexed";
  }

  /**
   * Apply tier updates when the store is the JSON backend (no bulk update).
   * Re-saves each chapter's facts with the updated tier.
   */
  private applyTierUpdatesToJSON(
    allFacts: FactEntry[],
    updates: Array<{ id: string; tier: FactTier }>
  ): void {
    const tierMap = new Map(updates.map((u) => [u.id, u.tier]));

    // Group by chapter for batch saves
    const byChapter = new Map<number, FactEntry[]>();
    for (const fact of allFacts) {
      const newTier = tierMap.get(fact.id);
      const updatedFact = newTier
        ? { ...fact, tier: newTier }
        : fact;

      const group = byChapter.get(updatedFact.chapterNumber) ?? [];
      group.push(updatedFact);
      byChapter.set(updatedFact.chapterNumber, group);
    }

    for (const [ch, facts] of byChapter) {
      this.store.saveFacts(ch, facts);
    }
  }

  // -------------------------------------------------------------------------
  // Long-term compression (existing logic, cleaned up)
  // -------------------------------------------------------------------------

  private compressIntoLongTerm(currentChapter: number): LongTermMemory {
    const longTerm = this.store.getLongTermMemory();
    const allFacts = this.store.getAllFacts();

    // Separate old facts (pre-consolidation threshold) from recent ones
    const threshold = Math.max(1, currentChapter - ACTIVE_WINDOW);
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

    return consolidated;
  }

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
