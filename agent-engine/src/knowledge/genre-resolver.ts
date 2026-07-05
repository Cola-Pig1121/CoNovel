// ============================================================================
// Genre Resolver
// Maps user genre preferences to available techniques.
// ============================================================================

import type { WritingTechnique } from "../types.js";

/**
 * Known genre aliases and their canonical forms.
 */
const GENRE_ALIASES: Record<string, string> = {
  // Chinese webnovel genres
  玄幻: "xuanhuan",
  xuanhuan: "xuanhuan",
  仙侠: "xianxia",
  xianxia: "xianxia",
  都市: "urban",
  urban: "urban",
  都市异能: "urban",
  末世: "post-apocalyptic",
  "末日": "post-apocalyptic",
  "post-apocalyptic": "post-apocalyptic",
  科幻: "scifi",
  scifi: "scifi",
  science_fiction: "scifi",
  言情: "romance",
  romance: "romance",
  悬疑: "mystery",
  mystery: "mystery",
  thriller: "mystery",
  惊悚: "horror",
  horror: "horror",
  历史: "historical",
  historical: "historical",
  武侠: "wuxia",
  wuxia: "wuxia",
  游戏: "gaming",
  gaming: "gaming",
  litrpg: "gaming",
  军事: "military",
  military: "military",
  体育: "sports",
  sports: "sports",
  轻小说: "light-novel",
  "light novel": "light-novel",
  light_novel: "light-novel",
  奇幻: "fantasy",
  fantasy: "fantasy",
  二次元: "anime",
  anime: "anime",
  系统: "system",
  system: "system",
  穿越: "isekai",
  isekai: "isekai",
  重生: "reincarnation",
  reincarnation: "reincarnation",
  灵异: "supernatural",
  supernatural: "supernatural",
};

/**
 * Normalize a genre string to its canonical form.
 */
export function normalizeGenre(genre: string): string {
  const lower = genre.toLowerCase().trim();
  return GENRE_ALIASES[lower] ?? lower;
}

/**
 * Infer the best matching genre from user preference against available genres.
 *
 * Uses exact match → partial match → fuzzy match ordering.
 */
export function inferGenre(
  preference: string,
  availableGenres: string[]
): string | null {
  if (!preference || availableGenres.length === 0) return null;

  const normalizedPref = normalizeGenre(preference);

  // 1. Exact match
  for (const g of availableGenres) {
    if (normalizeGenre(g) === normalizedPref) {
      return g;
    }
  }

  // 2. Partial / substring match
  for (const g of availableGenres) {
    const ng = normalizeGenre(g);
    if (ng.includes(normalizedPref) || normalizedPref.includes(ng)) {
      return g;
    }
  }

  // 3. Alias match (check if the preference has an alias mapping to one of the genres)
  for (const g of availableGenres) {
    const ng = normalizeGenre(g);
    // Check all known aliases for this genre
    for (const [alias, canonical] of Object.entries(GENRE_ALIASES)) {
      if (canonical === ng && alias.includes(normalizedPref)) {
        return g;
      }
    }
  }

  // 4. Fuzzy: Levenshtein distance ≤ 2
  for (const g of availableGenres) {
    const ng = normalizeGenre(g);
    if (levenshtein(normalizedPref, ng) <= 2) {
      return g;
    }
  }

  return null;
}

/**
 * Get techniques applicable to a specific genre.
 * Returns techniques that match the genre OR have no genre restriction (universal).
 */
export function getGenreTechniques(
  genre: string,
  techniques: WritingTechnique[]
): WritingTechnique[] {
  const normalizedGenre = normalizeGenre(genre);

  return techniques.filter((t) => {
    // Universal techniques (no genre filter)
    if (t.genre.length === 0) return true;

    // Direct genre match
    if (t.genre.some((g) => normalizeGenre(g) === normalizedGenre)) return true;

    return false;
  });
}

/**
 * Get unique genres from a set of techniques.
 */
export function listAvailableGenres(techniques: WritingTechnique[]): string[] {
  const genres = new Set<string>();
  for (const t of techniques) {
    for (const g of t.genre) {
      genres.add(g);
    }
  }
  return [...genres].sort();
}

// ---------------------------------------------------------------------------
// Levenshtein distance (for fuzzy matching)
// ---------------------------------------------------------------------------

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}
