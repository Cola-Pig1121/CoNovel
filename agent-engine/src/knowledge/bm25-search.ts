// ============================================================================
// BM25 Search Engine
// Chinese-aware tokenization + BM25 scoring for writing techniques.
// ============================================================================

import type { WritingTechnique } from "../types.js";

// ---------------------------------------------------------------------------
// Chinese-aware tokenization
// ---------------------------------------------------------------------------

/** Common Chinese stopwords for better signal/noise */
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
  "一个",
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
  "这个",
  "那个",
  "什么",
  "怎么",
  "为什么",
  "因为",
  "所以",
  "但是",
  "然后",
  "虽然",
  "不过",
  "已经",
  "可能",
  "应该",
  "需要",
  "通过",
  "进行",
  "使用",
  "以及",
  "或者",
  "其中",
  "根据",
  "以上",
  "以下",
  "这些",
  "那些",
  "一些",
  "一种",
]);

/**
 * Chinese-aware tokenization.
 *
 * Strategy:
 * 1. Extract English words (lowercased)
 * 2. Extract Chinese character bigrams for sub-word coverage
 * 3. Use jieba-like dictionary-based segmentation if available,
 *    otherwise fall back to character unigrams + bigrams
 * 4. Remove stopwords
 */
export function tokenize(text: string): string[] {
  const tokens: string[] = [];

  // Extract English words
  const engWords = text.toLowerCase().match(/[a-z][a-z0-9]*/g) ?? [];
  tokens.push(...engWords);

  // Extract Chinese characters
  const chineseChars = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) ?? [];

  // Character unigrams (stopwords filtered)
  for (const ch of chineseChars) {
    if (!STOP_WORDS.has(ch)) {
      tokens.push(ch);
    }
  }

  // Character bigrams (richer semantic units)
  for (let i = 0; i < chineseChars.length - 1; i++) {
    const bigram = chineseChars[i] + chineseChars[i + 1];
    if (!STOP_WORDS.has(bigram)) {
      tokens.push(bigram);
    }
  }

  // Extract numbers as tokens
  const numbers = text.match(/\d+/g) ?? [];
  tokens.push(...numbers);

  return tokens;
}

// ---------------------------------------------------------------------------
// BM25 scoring
// ---------------------------------------------------------------------------

/**
 * Compute term frequency for a token list.
 */
function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) ?? 0) + 1);
  }
  return tf;
}

/**
 * BM25 scoring function.
 *
 * @param queryTokens - Tokenized query
 * @param docTokens - Tokenized document
 * @param avgDocLen - Average document length across the corpus
 * @param k1 - Term frequency saturation (default 1.5)
 * @param b - Length normalization (default 0.75)
 * @returns BM25 relevance score
 */
export function bm25Score(
  queryTokens: string[],
  docTokens: string[],
  avgDocLen: number,
  k1: number = 1.5,
  b: number = 0.75
): number {
  const docTf = termFrequency(docTokens);
  const docLen = docTokens.length;
  let score = 0;

  // Unique query tokens to avoid double-counting
  const uniqueQueryTokens = [...new Set(queryTokens)];

  // IDF approximation: since we don't have a full corpus, use a smoothed estimate
  // For a small corpus, we approximate IDF as log((N - df + 0.5) / (df + 0.5) + 1)
  // where N = estimated corpus size, df = doc frequency
  // For single-doc scoring we use a simplified version
  const N = 100; // rough estimate of total documents in knowledge base
  const df = 1; // simplified: treat each term as appearing in ~1 doc

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
// Search API
// ---------------------------------------------------------------------------

export interface SearchResult {
  technique: WritingTechnique;
  score: number;
}

/**
 * Search writing techniques using BM25 scoring.
 *
 * @param query - Search query string
 * @param documents - Array of WritingTechniques to search
 * @param topK - Number of results to return (default 5)
 * @returns Top-K results sorted by relevance
 */
export function search(
  query: string,
  documents: WritingTechnique[],
  topK: number = 5
): SearchResult[] {
  if (documents.length === 0 || !query.trim()) {
    return [];
  }

  const queryTokens = tokenize(query);

  // Compute document tokens
  const docTokenLists = documents.map((doc) => {
    const text = [
      doc.name,
      doc.category,
      doc.description,
      doc.example,
      doc.tips.join(" "),
      doc.tags.join(" "),
    ].join(" ");
    return tokenize(text);
  });

  // Compute average document length
  const totalDocLen = docTokenLists.reduce((sum, t) => sum + t.length, 0);
  const avgDocLen = totalDocLen / docTokenLists.length;

  // Score each document
  const results: SearchResult[] = documents.map((technique, i) => ({
    technique,
    score: bm25Score(queryTokens, docTokenLists[i], avgDocLen),
  }));

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // Return top-K
  return results.slice(0, topK);
}

/**
 * Enhanced search that also considers genre and category matching
 * as boosting factors on top of BM25.
 */
export function searchWithBoost(
  query: string,
  documents: WritingTechnique[],
  options: {
    topK?: number;
    genre?: string;
    category?: string;
    minScore?: number;
  } = {}
): SearchResult[] {
  const { topK = 5, genre, category, minScore = 0.1 } = options;

  let results = search(query, documents, topK * 3); // over-fetch for boosting

  // Apply boosts
  if (genre || category) {
    results = results.map((r) => {
      let boost = 1.0;
      if (genre && r.technique.genre.includes(genre)) {
        boost *= 1.3;
      }
      if (
        category &&
        r.technique.category.toLowerCase().includes(category.toLowerCase())
      ) {
        boost *= 1.2;
      }
      return { ...r, score: r.score * boost };
    });

    results.sort((a, b) => b.score - a.score);
  }

  // Filter by minimum score
  results = results.filter((r) => r.score >= minScore);

  return results.slice(0, topK);
}
