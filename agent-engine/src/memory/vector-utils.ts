// ============================================================================
// Vector Utilities — cosine similarity + Reciprocal Rank Fusion
// ============================================================================

/**
 * Cosine similarity between two vectors.
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}

/**
 * RRF (Reciprocal Rank Fusion) to merge BM25 and vector results.
 */
export function reciprocalRankFusion(
  results1: { id: string; score: number }[],
  results2: { id: string; score: number }[],
  k: number = 60
): { id: string; rrfScore: number }[] {
  const scores = new Map<string, number>();

  // Rank results1
  results1.sort((a, b) => b.score - a.score);
  results1.forEach((r, i) => {
    scores.set(r.id, (scores.get(r.id) ?? 0) + 1 / (k + i + 1));
  });

  // Rank results2
  results2.sort((a, b) => b.score - a.score);
  results2.forEach((r, i) => {
    scores.set(r.id, (scores.get(r.id) ?? 0) + 1 / (k + i + 1));
  });

  return Array.from(scores.entries())
    .map(([id, rrfScore]) => ({ id, rrfScore }))
    .sort((a, b) => b.rrfScore - a.rrfScore);
}
