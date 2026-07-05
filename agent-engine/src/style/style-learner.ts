// ============================================================================
// Style Auto-Adaptive Learner
// Analyzes reference novels and generates style profiles for the agent.
// ============================================================================

import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { extractStats, generateStyleGuide } from "./style-fingerprint.js";
import { analyzeNovel, identifyFatigueWords } from "./reference-analyzer.js";
import type { ReferenceAnalysisReport } from "./reference-analyzer.js";
import type {
  StyleProfile,
  StyleConstraints,
  StyleFingerprint,
} from "../types.js";

// ---------------------------------------------------------------------------
// Reference analysis
// ---------------------------------------------------------------------------

/**
 * Analyze a reference novel and produce a comprehensive style profile.
 *
 * Steps:
 * 1. Read the reference file
 * 2. Compute style fingerprint
 * 3. Calculate dialogue ratio, paragraph lengths, sentence distribution
 * 4. Extract high-frequency verbs, adjectives, tropes
 * 5. Detect genre markers
 * 6. Generate StyleProfile with constraints
 */
export async function analyzeReference(
  filePath: string,
  outputPath?: string
): Promise<{ profile: StyleProfile; guide: string; report: ReferenceAnalysisReport }> {
  console.log(`[style-learner] Analyzing reference: ${filePath}`);

  // Full analysis
  const report = await analyzeNovel(filePath);
  const text = await readFile(filePath, "utf-8");

  // Extract fingerprints
  const fingerprint = extractStats(text);

  // Extract high-frequency verbs and adjectives
  const highFreqVerbs = extractHighFrequencyVerbs(text);
  const highFreqAdjectives = extractHighFrequencyAdjectives(text);

  // Detect dominant tense and POV
  const dominantTense = detectDominantTense(text);
  const pov = detectPOV(text);

  // Build constraints from analysis
  const constraints = inferConstraints(report, fingerprint);

  // Build style profile
  const profile: StyleProfile = {
    dialogue_ratio: report.dialogue_analysis.dialogue_ratio,
    avg_paragraph_length: fingerprint.paragraph_length_mean,
    sentence_length_variance: fingerprint.sentence_length_std,
    vocabulary_richness: fingerprint.type_token_ratio,
    avg_sentence_length: fingerprint.sentence_length_mean,
    dominant_tense: dominantTense,
    pov,
    high_frequency_verbs: highFreqVerbs,
    high_frequency_adjectives: highFreqAdjectives,
    tropes: report.tropes.map((t) => t.trope),
    genre_markers: report.genre_markers,
    punctuation_patterns: fingerprint.punctuation_frequency,
    constraints,
    raw_fingerprint: fingerprint,
  };

  // Generate human-readable style guide
  const guide = generateStyleGuide(fingerprint);

  // Write output if path specified
  if (outputPath) {
    await mkdir(join(outputPath), { recursive: true });
    const outputFileName =
      basename(filePath, extname(filePath)) + "_style_profile.json";
    const guideFileName =
      basename(filePath, extname(filePath)) + "_style_guide.md";

    await writeFile(
      join(outputPath, outputFileName),
      JSON.stringify(profile, null, 2),
      "utf-8"
    );
    await writeFile(
      join(outputPath, guideFileName),
      guide,
      "utf-8"
    );

    console.log(`[style-learner] Profile written to ${join(outputPath, outputFileName)}`);
  }

  return { profile, guide, report };
}

/**
 * Extract style fingerprint from raw text (no file I/O).
 */
export function extractFingerprint(text: string): StyleFingerprint {
  return extractStats(text);
}

// ---------------------------------------------------------------------------
// Auto-trigger: scan /references/ directory
// ---------------------------------------------------------------------------

/**
 * Scan a references directory for new files and analyze any unprocessed ones.
 * Returns a merged style profile from all references.
 */
export async function autoLearnFromReferences(
  referencesDir: string,
  outputDir: string
): Promise<StyleProfile | null> {
  let files: string[];
  try {
    const entries = await readdir(referencesDir);
    files = entries.filter((f) => {
      const ext = extname(f).toLowerCase();
      return [".txt", ".md", ".text", ".novel"].includes(ext);
    });
  } catch {
    console.warn(`[style-learner] References dir not found: ${referencesDir}`);
    return null;
  }

  if (files.length === 0) {
    console.log("[style-learner] No reference files found");
    return null;
  }

  console.log(`[style-learner] Found ${files.length} reference files`);

  const reports: ReferenceAnalysisReport[] = [];
  for (const file of files) {
    try {
      const filePath = join(referencesDir, file);
      const { report } = await analyzeReference(filePath, outputDir);
      reports.push(report);
    } catch (err) {
      console.error(`[style-learner] Failed to analyze ${file}:`, err);
    }
  }

  if (reports.length === 0) return null;

  // Merge profiles from all references
  return mergeProfiles(reports);
}

// ---------------------------------------------------------------------------
// Profile merging
// ---------------------------------------------------------------------------

function mergeProfiles(reports: ReferenceAnalysisReport[]): StyleProfile {
  const n = reports.length;

  // Average numerical values
  const avgDialogueRatio =
    reports.reduce((s, r) => s + r.dialogue_analysis.dialogue_ratio, 0) / n;
  const avgParagraphLength =
    reports.reduce((s, r) => s + r.fingerprint.paragraph_length_mean, 0) / n;
  const avgSentenceLength =
    reports.reduce((s, r) => s + r.fingerprint.sentence_length_mean, 0) / n;
  const avgSentenceVariance =
    reports.reduce((s, r) => s + r.fingerprint.sentence_length_std, 0) / n;
  const avgVocabRichness =
    reports.reduce((s, r) => s + r.fingerprint.type_token_ratio, 0) / n;

  // Merge high-frequency words (union with frequency ranking)
  const verbFreq = new Map<string, number>();
  const adjFreq = new Map<string, number>();

  for (const r of reports) {
    for (const v of r.fingerprint.common_openers) {
      verbFreq.set(v, (verbFreq.get(v) ?? 0) + 1);
    }
  }

  // Deduplicate tropes
  const allTropes = new Set<string>();
  for (const r of reports) {
    for (const t of r.tropes) {
      allTropes.add(t.trope);
    }
  }

  // Genre markers
  const allGenreMarkers = new Set<string>();
  for (const r of reports) {
    for (const m of r.genre_markers) {
      allGenreMarkers.add(m);
    }
  }

  // Determine dominant POV (majority vote)
  const povCounts = new Map<string, number>();
  for (const r of reports) {
    const pov = detectPOVFromReport(r);
    povCounts.set(pov, (povCounts.get(pov) ?? 0) + 1);
  }
  const dominantPOV = [...povCounts.entries()].sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0] as StyleProfile["pov"] ?? "third_limited";

  // Merge punctuation patterns
  const mergedPunct: Record<string, number> = {};
  for (const r of reports) {
    for (const [k, v] of Object.entries(r.fingerprint.punctuation_frequency)) {
      mergedPunct[k] = (mergedPunct[k] ?? 0) + v;
    }
  }

  // Constraints
  const constraints: StyleConstraints = {
    max_paragraph_length: Math.ceil(avgParagraphLength * 1.5),
    min_paragraph_length: Math.max(10, Math.floor(avgParagraphLength * 0.3)),
    dialogue_density:
      avgDialogueRatio > 0.4
        ? "heavy"
        : avgDialogueRatio > 0.2
        ? "moderate"
        : "sparse",
    description_density:
      avgDialogueRatio < 0.2
        ? "rich"
        : avgDialogueRatio < 0.4
        ? "moderate"
        : "minimal",
    forbidden_patterns: [
      "仿佛在诉说着",
      "不禁让人",
      "总而言之",
    ],
    required_patterns: [],
  };

  return {
    dialogue_ratio: avgDialogueRatio,
    avg_paragraph_length: avgParagraphLength,
    sentence_length_variance: avgSentenceVariance,
    vocabulary_richness: avgVocabRichness,
    avg_sentence_length: avgSentenceLength,
    dominant_tense: "past",
    pov: dominantPOV,
    high_frequency_verbs: [...verbFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([w]) => w),
    high_frequency_adjectives: [...adjFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([w]) => w),
    tropes: [...allTropes],
    genre_markers: [...allGenreMarkers],
    punctuation_patterns: mergedPunct,
    constraints,
  };
}

// ---------------------------------------------------------------------------
// Text analysis helpers
// ---------------------------------------------------------------------------

const COMMON_VERBS = [
  "说", "道", "看", "走", "站", "坐", "笑", "哭", "喊", "叫",
  "想", "问", "答", "听", "转身", "回头", "伸手", "点头", "摇头",
  "冷笑", "微笑", "大笑", "叹气", "叹息", "沉声", "低语", "怒吼",
  "冲", "扑", "挥", "刺", "劈", "砍", "挡", "闪", "退", "进",
];

const COMMON_ADJECTIVES = [
  "美", "丑", "大", "小", "高", "矮", "强", "弱", "快", "慢",
  "冷", "热", "暗", "亮", "深", "浅", "新", "旧", "轻", "重",
  "美", "壮", "柔", "刚", "猛", "烈", "浓", "淡", "幽", "清",
  "金", "银", "黑", "白", "红", "蓝", "绿", "紫", "灰", "青",
];

function extractHighFrequencyVerbs(text: string): string[] {
  const freq = new Map<string, number>();
  for (const v of COMMON_VERBS) {
    const regex = new RegExp(v, "g");
    const matches = text.match(regex);
    if (matches) {
      freq.set(v, matches.length);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([w]) => w);
}

function extractHighFrequencyAdjectives(text: string): string[] {
  const freq = new Map<string, number>();
  for (const a of COMMON_ADJECTIVES) {
    const regex = new RegExp(a, "g");
    const matches = text.match(regex);
    if (matches) {
      freq.set(a, matches.length);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([w]) => w);
}

function detectDominantTense(
  text: string
): "past" | "present" {
  // Simple heuristic: count past vs present tense markers
  const pastMarkers = ["了", "过", "曾经", "已", "已经"];
  const presentMarkers = ["着", "在", "正在", "此刻", "如今"];

  let pastCount = 0;
  let presentCount = 0;

  for (const m of pastMarkers) {
    const matches = text.match(new RegExp(m, "g"));
    if (matches) pastCount += matches.length;
  }
  for (const m of presentMarkers) {
    const matches = text.match(new RegExp(m, "g"));
    if (matches) presentCount += matches.length;
  }

  return pastCount >= presentCount ? "past" : "present";
}

function detectPOV(text: string): "first" | "third_limited" | "third_omniscient" | "second" {
  // Check for first-person markers
  const firstPersonMarkers = /[^"「『"]我[^"」』"]/g;
  const firstMatches = text.match(firstPersonMarkers);

  const secondPersonMarkers = /[^"「『"]你[^"」』"]/g;
  const secondMatches = text.match(secondPersonMarkers);

  // Simple heuristic
  if (secondMatches && secondMatches.length > firstMatches!.length * 3) {
    return "second";
  }
  if (firstMatches && firstMatches.length > 50) {
    return "first";
  }
  return "third_limited";
}

function detectPOVFromReport(report: ReferenceAnalysisReport): StyleProfile["pov"] {
  return "third_limited"; // Simplified; real impl would use the text analysis
}

function inferConstraints(
  report: ReferenceAnalysisReport,
  fingerprint: StyleFingerprint
): StyleConstraints {
  const dialogueRatio = report.dialogue_analysis.dialogue_ratio;
  const avgParaLen = fingerprint.paragraph_length_mean;

  return {
    max_paragraph_length: Math.ceil(avgParaLen * 1.8),
    min_paragraph_length: Math.max(5, Math.floor(avgParaLen * 0.2)),
    dialogue_density:
      dialogueRatio > 0.4
        ? "heavy"
        : dialogueRatio > 0.2
        ? "moderate"
        : "sparse",
    description_density:
      dialogueRatio < 0.15
        ? "rich"
        : dialogueRatio < 0.3
        ? "moderate"
        : "minimal",
    forbidden_patterns: [
      "仿佛在诉说着",
      "不禁让人",
      "总而言之",
      "似乎在",
      "宛如在诉说",
    ],
    required_patterns: [],
  };
}
