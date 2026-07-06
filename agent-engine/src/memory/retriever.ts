// ============================================================================
// Memory Retriever — BM25 scoring + exponential time decay + SQLite FTS5
// Retrieves relevant memories from the store for LLM context injection.
//
// When a SQLiteMemoryStore is available, search() delegates to FTS5 for
// blazing-fast full-text search on million-character novels. Otherwise it
// falls back to the built-in BM25 scoring on the JSON backend.
// ============================================================================

import type {
  FactEntry,
  SearchResult,
  SearchOptions,
  MemoryStoreInterface,
} from "./types.js";
import { SQLiteMemoryStore } from "./sqlite-store.js";

// ---------------------------------------------------------------------------
// Chinese-aware tokenization (reused from bm25-search.ts pattern)
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  "的",
  "了",
  "在",
  "是",
  "我",
  "有",
  "和",
  "就",
  "不",
  "人",
  "都",
  "一",
  "上",
  "也",
  "很",
  "到",
  "说",
  "要",
  "去",
  "你",
  "会",
  "着",
  "没有",
  "看",
  "好",
  "自己",
  "这",
  "他",
  "她",
  "它",
  "们",
  "那",
  "被",
  "把",
  "而",
  "还",
  "可以",
  "能",
  "如果",
  "但",
  "对",
  "于",
  "与",
  "从",
  "中",
  "之",
  "为",
  "以",
  "或",
  "等",
  "其",
  "及",
  "所",
  "则",
  "如",
  "使",
  "让",
  "此",
  "因",
  "该",
  "用",
  "过",
  "将",
  "来",
  "里",
]);

function tokenize(text: string): string[] {
  const tokens: string[] = [];

  // English words
  const engWords = text.toLowerCase().match(/[a-z][a-z0-9]*/g) ?? [];
  tokens.push(...engWords);

  // Chinese characters (unigrams, stopword-filtered)
  const chineseChars =
    text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) ?? [];
  for (const ch of chineseChars) {
    if (!STOP_WORDS.has(ch)) {
      tokens.push(ch);
    }
  }

  // Chinese bigrams
  for (let i = 0; i < chineseChars.length - 1; i++) {
    const bigram = chineseChars[i] + chineseChars[i + 1];
    if (!STOP_WORDS.has(bigram)) {
      tokens.push(bigram);
    }
  }

  // Numbers
  const numbers = text.match(/\d+/g) ?? [];
  tokens.push(...numbers);

  return tokens;
}

// ---------------------------------------------------------------------------
// BM25 scoring
// ---------------------------------------------------------------------------

function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) ?? 0) + 1);
  }
  return tf;
}

function bm25Score(
  queryTokens: string[],
  docTokens: string[],
  avgDocLen: number,
  k1: number = 1.5,
  b: number = 0.75
): number {
  const docTf = termFrequency(docTokens);
  const docLen = docTokens.length;
  let score = 0;

  const uniqueQueryTokens = [...new Set(queryTokens)];
  const N = 100; // estimated corpus size
  const df = 1; // simplified single-doc frequency estimate

  for (const term of uniqueQueryTokens) {
    const tf = docTf.get(term) ?? 0;
    if (tf === 0) continue;

    const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);
    const tfNorm =
      (tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * docLen) / avgDocLen));

    score += idf * tfNorm;
  }

  return score;
}

// ---------------------------------------------------------------------------
// Time decay
// ---------------------------------------------------------------------------

/**
 * Exponential time decay: more recent facts get higher weight.
 * decay = e^(-lambda * distance)
 * where distance = abs(currentChapter - factChapter)
 */
function timeDecay(
  factChapter: number,
  currentChapter: number,
  lambda: number = 0.1
): number {
  const distance = Math.abs(currentChapter - factChapter);
  return Math.exp(-lambda * distance);
}

// ---------------------------------------------------------------------------
// MemoryRetriever
// ---------------------------------------------------------------------------

export class MemoryRetriever {
  private store: MemoryStoreInterface;
  private sqliteStore: SQLiteMemoryStore | null;

  constructor(store: MemoryStoreInterface) {
    this.store = store;
    // Detect if the underlying store is SQLite-backed
    this.sqliteStore =
      store instanceof SQLiteMemoryStore ? store : null;
  }

  // -------------------------------------------------------------------------
  // Search
  // -------------------------------------------------------------------------

  /**
   * Search memories by query.
   *
   * When a SQLiteMemoryStore is available, delegates to FTS5 for fast
   * full-text search. Otherwise falls back to in-memory BM25 scoring.
   */
  search(query: string, options: SearchOptions = {}): SearchResult[] {
    if (this.sqliteStore) {
      return this.sqliteSearch(query, options);
    }
    return this.jsonSearch(query, options);
  }

  /**
   * SQLite FTS5 search path — fast full-text search.
   */
  private sqliteSearch(
    query: string,
    options: SearchOptions
  ): SearchResult[] {
    const {
      maxResults = 10,
      category,
      tier,
    } = options;

    const ftsResults = this.sqliteStore!.fullTextSearch(query, {
      topK: maxResults * 3, // over-fetch, then refine with time-decay
      category,
      tier,
    });

    // Apply time-decay and confidence boost on top of FTS5 ranking
    const results: SearchResult[] = ftsResults.map(({ entry, score }) => {
      let finalScore = score;

      if (options.timeDecay !== false && options.currentChapter !== undefined) {
        const decay = timeDecay(entry.chapterNumber, options.currentChapter);
        finalScore *= decay;
      }

      // Boost by confidence
      finalScore *= 0.5 + 0.5 * entry.confidence;

      const reason = buildReason(entry, finalScore, options.timeDecay !== false, options.currentChapter);

      return { entry, score: finalScore, reason };
    });

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults);
  }

  /**
   * JSON / in-memory BM25 search path — fallback.
   */
  private jsonSearch(
    query: string,
    options: SearchOptions
  ): SearchResult[] {
    const {
      category,
      subject,
      maxResults = 10,
      timeDecay: useDecay = true,
      currentChapter,
    } = options;

    // Gather candidate facts
    let candidates = this.store.getAllFacts();

    // Apply category filter
    if (category) {
      candidates = candidates.filter((f) => f.category === category);
    }

    // Apply subject filter
    if (subject) {
      const lowerSubject = subject.toLowerCase();
      candidates = candidates.filter((f) =>
        f.subject.toLowerCase().includes(lowerSubject)
      );
    }

    if (candidates.length === 0) return [];

    // Tokenize query
    const queryTokens = tokenize(query);

    // Build document token lists
    const docTokenLists = candidates.map((fact) =>
      tokenize(`${fact.subject} ${fact.content}`)
    );

    // Compute average document length
    const totalDocLen = docTokenLists.reduce(
      (sum, t) => sum + t.length,
      0
    );
    const avgDocLen =
      docTokenLists.length > 0 ? totalDocLen / docTokenLists.length : 1;

    // Score each fact
    const results: SearchResult[] = candidates.map((entry, i) => {
      let bm25 = bm25Score(queryTokens, docTokenLists[i], avgDocLen);

      // Apply time decay
      if (useDecay && currentChapter !== undefined) {
        const decay = timeDecay(entry.chapterNumber, currentChapter);
        bm25 *= decay;
      }

      // Boost by confidence
      bm25 *= 0.5 + 0.5 * entry.confidence;

      // Generate reason
      const reason = buildReason(entry, bm25, useDecay, currentChapter);

      return { entry, score: bm25, reason };
    });

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, maxResults);
  }

  // -------------------------------------------------------------------------
  // Convenience methods
  // -------------------------------------------------------------------------

  /**
   * Get recent memories (last N chapters).
   */
  getRecent(chapterNumber: number, count: number): FactEntry[] {
    const allFacts = this.store.getAllFacts();
    return allFacts
      .filter((f) => f.chapterNumber <= chapterNumber)
      .slice(-count);
  }

  /**
   * Get memories related to a specific character.
   */
  getCharacterMemories(charName: string): FactEntry[] {
    return this.store.getFactsBySubject(charName);
  }

  /**
   * Get unresolved hooks.
   */
  getActiveHooks(): FactEntry[] {
    const allFacts = this.store.getAllFacts();
    const longTerm = this.store.getLongTermMemory();

    // Get hook facts
    const hookFacts = allFacts.filter((f) => f.category === "hook");

    // Filter out hooks that have been resolved in long-term memory
    const resolvedDescriptions = new Set(
      longTerm.activePlotThreads
        .filter((t) => t.status === "resolved")
        .map((t) => t.description.toLowerCase())
    );

    return hookFacts.filter(
      (f) =>
        !resolvedDescriptions.has(f.content.toLowerCase()) &&
        !resolvedDescriptions.has(f.subject.toLowerCase())
    );
  }

  /**
   * Build context string for LLM prompts (recent summaries + relevant facts).
   */
  buildContextForChapter(
    chapterNumber: number,
    povCharacter?: string
  ): string {
    const sections: string[] = [];

    // 1. Recent chapter summaries (last 3)
    const summaries = this.store.getAllSummaries();
    const recentSummaries = summaries
      .filter((s) => s.chapterNumber <= chapterNumber)
      .slice(-3);

    if (recentSummaries.length > 0) {
      sections.push("## 近期章节摘要");
      for (const s of recentSummaries) {
        sections.push(`### 第${s.chapterNumber}章: ${s.title}`);
        sections.push(s.summary);
        if (s.keyEvents.length > 0) {
          sections.push(`关键事件: ${s.keyEvents.join("；")}`);
        }
      }
    }

    // 2. Relevant facts for POV character
    if (povCharacter) {
      const charFacts = this.store
        .getFactsBySubject(povCharacter)
        .filter((f) => f.chapterNumber <= chapterNumber)
        .slice(-20);

      if (charFacts.length > 0) {
        sections.push(`## ${povCharacter}相关记忆`);
        for (const f of charFacts) {
          sections.push(
            `- [第${f.chapterNumber}章] ${f.content} (置信度: ${f.confidence})`
          );
        }
      }
    }

    // 3. Active hooks
    const activeHooks = this.getActiveHooks();
    if (activeHooks.length > 0) {
      sections.push("## 未解决的伏笔");
      for (const h of activeHooks) {
        sections.push(`- [第${h.chapterNumber}章] ${h.content}`);
      }
    }

    // 4. Key relationship facts
    const relationshipFacts = this.store
      .getFactsByCategory("relationship")
      .filter((f) => f.chapterNumber <= chapterNumber)
      .slice(-10);

    if (relationshipFacts.length > 0) {
      sections.push("## 关系动态");
      for (const f of relationshipFacts) {
        sections.push(
          `- [第${f.chapterNumber}章] ${f.subject}: ${f.content}`
        );
      }
    }

    return sections.join("\n\n");
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildReason(
  entry: FactEntry,
  score: number,
  useDecay: boolean,
  currentChapter?: number
): string {
  const parts: string[] = [];
  parts.push(`类别: ${entry.category}`);
  parts.push(`主题: ${entry.subject}`);

  if (entry.tier) {
    parts.push(`层级: ${entry.tier}`);
  }

  if (useDecay && currentChapter !== undefined) {
    const distance = currentChapter - entry.chapterNumber;
    if (distance <= 1) {
      parts.push("最近章节");
    } else {
      parts.push(`距今${distance}章`);
    }
  }

  if (entry.confidence >= 0.8) {
    parts.push("高置信度");
  } else if (entry.confidence <= 0.4) {
    parts.push("低置信度");
  }

  return parts.join(" | ");
}
