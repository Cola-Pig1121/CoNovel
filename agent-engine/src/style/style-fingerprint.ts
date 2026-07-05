// ============================================================================
// Style Fingerprinting
// Extracts quantitative writing style metrics from raw text.
// ============================================================================

import type { StyleFingerprint } from "../types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Split text into sentences (Chinese-aware) */
function splitSentences(text: string): string[] {
  // Chinese sentence-ending punctuation + standard punctuation
  const raw = text.split(/(?<=[。！？!?…]+)/g);
  return raw.map((s) => s.trim()).filter((s) => s.length > 0);
}

/** Split text into paragraphs */
function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/** Count Chinese characters in text */
function countChineseChars(text: string): number {
  const match = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g);
  return match ? match.length : 0;
}

/** Tokenize for vocabulary analysis: Chinese chars + English words */
function tokenForVocab(text: string): string[] {
  const tokens: string[] = [];

  // English words
  const eng = text.toLowerCase().match(/[a-z][a-z0-9]*/g) ?? [];
  tokens.push(...eng);

  // Chinese character bigrams
  const chars = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) ?? [];
  for (let i = 0; i < chars.length - 1; i++) {
    tokens.push(chars[i] + chars[i + 1]);
  }

  return tokens;
}

/** Compute mean of a number array */
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/** Compute standard deviation */
function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance =
    arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

// ---------------------------------------------------------------------------
// Fingerprint extraction
// ---------------------------------------------------------------------------

/**
 * Compute sentence lengths (in characters).
 */
function sentenceLengths(sentences: string[]): number[] {
  return sentences.map((s) => {
    // Count Chinese chars + English words
    const chinese = countChineseChars(s);
    const english = (s.toLowerCase().match(/[a-z][a-z0-9]*/g) ?? []).length;
    return chinese + english;
  });
}

/**
 * Extract common sentence openers (first 2-4 chars).
 */
function extractOpeners(sentences: string[], topK: number = 10): string[] {
  const freq = new Map<string, number>();
  for (const s of sentences) {
    const opener = s.slice(0, Math.min(4, s.length));
    if (opener.length >= 2) {
      freq.set(opener, (freq.get(opener) ?? 0) + 1);
    }
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([word]) => word);
}

/**
 * Detect transition words (连接词).
 */
function extractTransitions(text: string): string[] {
  const patterns = [
    "然而",
    "不过",
    "但是",
    "因此",
    "所以",
    "随后",
    "接着",
    "然后",
    "于是",
    "同时",
    "此外",
    "另外",
    "与此同时",
    "紧接着",
    "终于",
    "突然",
    "忽然",
    "猛然",
    "渐渐",
    "缓缓",
    "慢慢",
    "蓦地",
    "霎时",
    "顿时",
    "瞬间",
    "此刻",
    "那时",
    "先前",
    "本来",
    "毕竟",
    "其实",
    "事实上",
    "毫无疑问",
    "显然",
    "当然",
    "总之",
    "话说回来",
    "要知道",
  ];

  const found: string[] = [];
  for (const p of patterns) {
    if (text.includes(p)) {
      found.push(p);
    }
  }
  return found;
}

/**
 * Extract full style fingerprint from text.
 */
export function extractStats(text: string): StyleFingerprint {
  const sentences = splitSentences(text);
  const paragraphs = splitParagraphs(text);

  const sLens = sentenceLengths(sentences);
  const pLens = paragraphs.map((p) => {
    const chinese = countChineseChars(p);
    const english = (p.toLowerCase().match(/[a-z][a-z0-9]*/g) ?? []).length;
    return chinese + english;
  });

  // Vocabulary analysis
  const vocabTokens = tokenForVocab(text);
  const vocabSet = new Set(vocabTokens);
  const typeTokenRatio = vocabTokens.length > 0
    ? vocabSet.size / vocabTokens.length
    : 0;

  // Hapax legomena: words appearing exactly once
  const freq = new Map<string, number>();
  for (const t of vocabTokens) {
    freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  let hapaxCount = 0;
  for (const count of freq.values()) {
    if (count === 1) hapaxCount++;
  }
  const hapaxLegomenaRatio = vocabTokens.length > 0
    ? hapaxCount / vocabTokens.length
    : 0;

  // Punctuation patterns
  const punctuationPatterns: Record<string, number> = {};
  const punctuations = ["。", "！", "？", "，", "；", "：", "……", "——", "「」", ""];
  for (const p of punctuations) {
    const regex = new RegExp(escapeRegex(p), "g");
    const matches = text.match(regex);
    if (matches) {
      punctuationPatterns[p] = matches.length;
    }
  }

  // Standard punctuation
  for (const p of [".", "!", "?", ",", ";", ":", '"', "'"]) {
    const regex = new RegExp(`\\${p}`, "g");
    const matches = text.match(regex);
    if (matches) {
      punctuationPatterns[p] = matches.length;
    }
  }

  return {
    sentence_lengths: sLens,
    sentence_length_std: std(sLens),
    sentence_length_mean: mean(sLens),
    vocabulary_size: vocabSet.size,
    type_token_ratio: typeTokenRatio,
    hapax_legomena_ratio: hapaxLegomenaRatio,
    punctuation_frequency: punctuationPatterns,
    avg_words_per_sentence: mean(sLens),
    paragraph_lengths: pLens,
    paragraph_length_std: std(pLens),
    paragraph_length_mean: mean(pLens),
    common_openers: extractOpeners(sentences),
    transition_words: extractTransitions(text),
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Fingerprint comparison
// ---------------------------------------------------------------------------

/**
 * Compare two fingerprints and return a similarity score (0-1).
 */
export function compareFingerprints(
  a: StyleFingerprint,
  b: StyleFingerprint
): number {
  let score = 0;
  let weight = 0;

  // Sentence length similarity (normalized by std)
  if (a.sentence_length_mean > 0 && b.sentence_length_mean > 0) {
    const slSim = 1 - Math.min(1,
      Math.abs(a.sentence_length_mean - b.sentence_length_mean) /
        Math.max(a.sentence_length_mean, b.sentence_length_mean)
    );
    score += slSim * 2; // weight: 2
    weight += 2;
  }

  // Sentence length variance similarity
  const maxSLStd = Math.max(a.sentence_length_std, b.sentence_length_std);
  if (maxSLStd > 0) {
    const slvSim = 1 - Math.min(1,
      Math.abs(a.sentence_length_std - b.sentence_length_std) / maxSLStd
    );
    score += slvSim;
    weight += 1;
  }

  // Paragraph length similarity
  if (a.paragraph_length_mean > 0 && b.paragraph_length_mean > 0) {
    const plSim = 1 - Math.min(1,
      Math.abs(a.paragraph_length_mean - b.paragraph_length_mean) /
        Math.max(a.paragraph_length_mean, b.paragraph_length_mean)
    );
    score += plSim;
    weight += 1;
  }

  // Vocabulary richness similarity
  const vrSim = 1 - Math.abs(a.type_token_ratio - b.type_token_ratio);
  score += vrSim;
  weight += 1;

  // Transition word overlap
  const aTrans = new Set(a.transition_words);
  const bTrans = new Set(b.transition_words);
  const intersection = [...aTrans].filter((w) => bTrans.has(w)).length;
  const union = new Set([...aTrans, ...bTrans]).size;
  if (union > 0) {
    score += intersection / union; // Jaccard similarity
    weight += 1;
  }

  return weight > 0 ? score / weight : 0;
}

/**
 * Generate a human-readable style guide from a fingerprint.
 */
export function generateStyleGuide(fingerprint: StyleFingerprint): string {
  const lines: string[] = [];

  lines.push("# 文风指纹报告\n");

  // Sentence patterns
  lines.push("## 句式特征");
  if (fingerprint.sentence_length_mean < 15) {
    lines.push("- 句式偏短，节奏紧凑，适合动作/对话密集场景");
  } else if (fingerprint.sentence_length_mean < 30) {
    lines.push("- 句式中等，平衡叙事与描写");
  } else {
    lines.push("- 句式偏长，适合深度心理描写和场景构建");
  }

  if (fingerprint.sentence_length_std > 15) {
    lines.push("- 句长变化大，节奏感强，有张有弛");
  } else if (fingerprint.sentence_length_std > 8) {
    lines.push("- 句长有适度变化，节奏较平稳");
  } else {
    lines.push("- 句长较均匀，可能需要增加节奏变化");
  }

  // Paragraph patterns
  lines.push("\n## 段落特征");
  if (fingerprint.paragraph_length_mean < 50) {
    lines.push("- 段落简短，阅读节奏快");
  } else if (fingerprint.paragraph_length_mean < 150) {
    lines.push("- 段落长度适中");
  } else {
    lines.push("- 段落较长，适合沉浸式描写");
  }

  // Vocabulary
  lines.push("\n## 词汇特征");
  lines.push(`- 词汇丰富度 (TTR): ${fingerprint.type_token_ratio.toFixed(3)}`);
  if (fingerprint.type_token_ratio > 0.6) {
    lines.push("  → 词汇多样，用词不重复");
  } else if (fingerprint.type_token_ratio > 0.4) {
    lines.push("  → 词汇中等丰富");
  } else {
    lines.push("  → 词汇重复度较高，建议增加词汇变化");
  }

  // Transitions
  if (fingerprint.transition_words.length > 0) {
    lines.push("\n## 常用连接词");
    lines.push(`- ${fingerprint.transition_words.join("、")}`);
  }

  // Openers
  if (fingerprint.common_openers.length > 0) {
    lines.push("\n## 常用句首");
    lines.push(`- ${fingerprint.common_openers.slice(0, 5).join("、")}`);
  }

  return lines.join("\n");
}
