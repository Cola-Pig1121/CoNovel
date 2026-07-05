// ============================================================================
// Reference Novel Analyzer
// Deep analysis of reference novels for style extraction.
// ============================================================================

import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { extractStats, compareFingerprints } from "./style-fingerprint.js";
import type { StyleFingerprint } from "../types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReferenceAnalysisReport {
  file_path: string;
  title_guess: string;
  word_count: number;
  chinese_char_count: number;
  fingerprint: StyleFingerprint;
  dialogue_analysis: DialogueAnalysis;
  tropes: TropeResult[];
  fatigue_words: FatigueWord[];
  vocabulary_stats: VocabularyStats;
  pacing_analysis: PacingAnalysis;
  genre_markers: string[];
}

export interface DialogueAnalysis {
  dialogue_ratio: number; // 0-1
  dialogue_turns: number;
  avg_dialogue_length: number;
  longest_monologue: number;
  exclamation_ratio: number; // ratio of dialogues ending with !
  question_ratio: number; // ratio of dialogues ending with ?
}

export interface TropeResult {
  trope: string;
  frequency: number;
  per_10k: number; // frequency per 10k characters
  examples: string[];
}

export interface FatigueWord {
  word: string;
  count: number;
  per_10k: number; // frequency per 10k characters
}

export interface VocabularyStats {
  total_unique_chars: number;
  total_unique_bigrams: number;
  top_100_chars: Array<[string, number]>;
  reading_level: "simple" | "moderate" | "literary" | "complex";
}

export interface PacingAnalysis {
  avg_scene_length: number;
  scene_count: number;
  time_skips_detected: number;
  transition_density: number; // transitions per 1k chars
}

// ---------------------------------------------------------------------------
// Chinese text helpers
// ---------------------------------------------------------------------------

/** Split into sentences */
function sentences(text: string): string[] {
  return text
    .split(/(?<=[。！？!?…]+)/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Split into paragraphs */
function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/** Count Chinese characters */
function countChinese(text: string): number {
  const m = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g);
  return m ? m.length : 0;
}

// ---------------------------------------------------------------------------
// Dialogue analysis
// ---------------------------------------------------------------------------

const DIALOGUE_PATTERNS = [
  /[「「『『][^」」』』]*[」」』』]/g,
  /"([^""]*)"/g,
  /"([^""]*)"/g,
  /：["「『"]([^"」』"]*)["」』"]/g,
];

function extractDialogues(text: string): string[] {
  const dialogues: string[] = [];
  for (const pattern of DIALOGUE_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      dialogues.push(match[0]);
    }
  }
  return dialogues;
}

function analyzeDialogue(text: string): DialogueAnalysis {
  const dialogues = extractDialogues(text);
  const totalChars = countChinese(text);

  let dialogueChars = 0;
  let longestMono = 0;
  let exclamationCount = 0;
  let questionCount = 0;

  for (const d of dialogues) {
    const dLen = countChinese(d);
    dialogueChars += dLen;
    if (dLen > longestMono) longestMono = dLen;
    if (d.endsWith("！") || d.endsWith("!")) exclamationCount++;
    if (d.endsWith("？") || d.endsWith("?")) questionCount++;
  }

  const count = Math.max(dialogues.length, 1);

  return {
    dialogue_ratio: totalChars > 0 ? dialogueChars / totalChars : 0,
    dialogue_turns: dialogues.length,
    avg_dialogue_length: countChinese(dialogues.join("")) / count,
    longest_monologue: longestMono,
    exclamation_ratio: exclamationCount / count,
    question_ratio: questionCount / count,
  };
}

// ---------------------------------------------------------------------------
// Trope extraction
// ---------------------------------------------------------------------------

/** Chinese webnovel genre tropes and their signatures */
const TROPE_SIGNATURES: Array<{ trope: string; keywords: string[] }> = [
  { trope: "强者之路", keywords: ["突破", "进阶", "境界", "渡劫", "修炼"] },
  { trope: "逆袭打脸", keywords: ["废物", "天才", "打脸", "碾压", "不屑"] },
  { trope: "后宫争锋", keywords: ["红颜", "知己", "醋意", "争风", "倾心"] },
  { trope: "秘境探宝", keywords: ["秘境", "遗迹", "宝藏", "传承", "机缘"] },
  { trope: "家族恩怨", keywords: ["族长", "长老", "家主", "血脉", "宗族"] },
  { trope: "生死对决", keywords: ["必杀", "绝招", "杀手锏", "同归于尽", "死战"] },
  { trope: "奇遇获宝", keywords: ["偶得", "偶然", "捡到", "坠崖", "奇遇"] },
  { trope: "身世之谜", keywords: ["身世", "血脉", "封印", "记忆", "前世"] },
  { trope: "兄弟情义", keywords: ["兄弟", "义气", "生死之交", "肝胆", "患难"] },
  { trope: "权谋争斗", keywords: ["朝堂", "势力", "阴谋", "布局", "暗棋"] },
  { trope: "复仇之路", keywords: ["仇恨", "血仇", "灭门", "复仇", "以牙还牙"] },
  { trope: "成长蜕变", keywords: ["蜕变", "觉醒", "领悟", "顿悟", "成长"] },
];

export function extractTropes(text: string): TropeResult[] {
  const results: TropeResult[] = [];
  const totalChars = Math.max(countChinese(text), 1);

  for (const { trope, keywords } of TROPE_SIGNATURES) {
    let frequency = 0;
    const examples: string[] = [];

    for (const kw of keywords) {
      const regex = new RegExp(kw, "g");
      const matches = text.match(regex);
      if (matches) {
        frequency += matches.length;

        // Find context around first occurrence
        const idx = text.indexOf(kw);
        if (idx !== -1) {
          const start = Math.max(0, idx - 20);
          const end = Math.min(text.length, idx + kw.length + 20);
          examples.push(`...${text.slice(start, end)}...`);
        }
      }
    }

    if (frequency > 0) {
      results.push({
        trope,
        frequency,
        per_10k: (frequency / totalChars) * 10000,
        examples: examples.slice(0, 3),
      });
    }
  }

  return results.sort((a, b) => b.frequency - a.frequency);
}

// ---------------------------------------------------------------------------
// Fatigue words (LLM overused words)
// ---------------------------------------------------------------------------

const FATIGUE_WORD_LIST = [
  "仿佛",
  "似乎",
  "仿佛在",
  "宛如",
  "宛如在",
  "诉说",
  "诉说着",
  "不禁",
  "心中暗道",
  "嘴角微扬",
  "眸中",
  "眼眸",
  "深邃",
  "淡淡地",
  "微微一笑",
  "不觉",
  "不知不觉",
  "竟然",
  "居然",
  "赫然",
  "陡然",
  "倏然",
  "骤然",
  "旋即",
  "旋即",
  "当即",
  "旋即",
  "猛然间",
  "蓦然",
  "霎时间",
  "一时间",
  "不知为何",
  "总感觉",
  "难以言喻",
  "说不清道不明",
  "涌上心头",
  "百感交集",
  "五味杂陈",
  "千言万语",
  "一言难尽",
  "恍若隔世",
  "如梦似幻",
  "恍然大悟",
  "茅塞顿开",
  "心头一震",
  "心头一紧",
  "心头一暖",
  "心头一沉",
  "眉头紧锁",
  "眉头微皱",
  "淡淡地说",
  "轻声说道",
  "缓缓开口",
  "沉声道",
  "低沉的声音",
  "不疾不徐",
  "有条不紊",
  "不紧不慢",
];

export function identifyFatigueWords(text: string): FatigueWord[] {
  const totalChars = Math.max(countChinese(text), 1);
  const results: FatigueWord[] = [];

  for (const word of FATIGUE_WORD_LIST) {
    const regex = new RegExp(escapeRegex(word), "g");
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      results.push({
        word,
        count: matches.length,
        per_10k: (matches.length / totalChars) * 10000,
      });
    }
  }

  return results.sort((a, b) => b.per_10k - a.per_10k);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Vocabulary stats
// ---------------------------------------------------------------------------

function analyzeVocabulary(text: string): VocabularyStats {
  // Character frequency
  const charFreq = new Map<string, number>();
  const chars = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) ?? [];
  for (const ch of chars) {
    charFreq.set(ch, (charFreq.get(ch) ?? 0) + 1);
  }

  // Bigram frequency
  const bigramFreq = new Map<string, number>();
  for (let i = 0; i < chars.length - 1; i++) {
    const bg = chars[i] + chars[i + 1];
    bigramFreq.set(bg, (bigramFreq.get(bg) ?? 0) + 1);
  }

  // Top 100 characters
  const top100 = [...charFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100);

  // Reading level estimate based on character frequency distribution
  const uniqueChars = charFreq.size;
  const totalChars = chars.length;
  const charEntropy = uniqueChars > 0 ? Math.log2(uniqueChars) : 0;

  let readingLevel: "simple" | "moderate" | "literary" | "complex";
  if (charEntropy < 6) {
    readingLevel = "simple";
  } else if (charEntropy < 7.5) {
    readingLevel = "moderate";
  } else if (charEntropy < 9) {
    readingLevel = "literary";
  } else {
    readingLevel = "complex";
  }

  return {
    total_unique_chars: uniqueChars,
    total_unique_bigrams: bigramFreq.size,
    top_100_chars: top100,
    reading_level: readingLevel,
  };
}

// ---------------------------------------------------------------------------
// Pacing analysis
// ---------------------------------------------------------------------------

const SCENE_TRANSITIONS = [
  "与此同时",
  "另一边",
  "此刻",
  "回到",
  "镜头转向",
  "画面一转",
  "再说",
  "且说",
  "话分两头",
  "且听下回",
];

const TIME_SKIPS = [
  "三天后",
  "数日后",
  "一周后",
  "半月后",
  "一月后",
  "数月后",
  "半年后",
  "一年后",
  "次日",
  "翌日",
  "第二天",
  "当晚",
  "入夜",
  "天亮后",
  "黎明时分",
  "日落时分",
  "黄昏",
  "清晨",
];

function analyzePacing(text: string): PacingAnalysis {
  const paras = paragraphs(text);
  const totalChars = Math.max(countChinese(text), 1);

  // Count transitions
  let transitionCount = 0;
  for (const t of SCENE_TRANSITIONS) {
    const regex = new RegExp(escapeRegex(t), "g");
    const m = text.match(regex);
    if (m) transitionCount += m.length;
  }

  // Count time skips
  let timeSkips = 0;
  for (const t of TIME_SKIPS) {
    if (text.includes(t)) timeSkips++;
  }

  // Scene detection: paragraphs with character/scene changes
  const avgSceneLength =
    paras.length > 0 ? totalChars / paras.length : totalChars;

  return {
    avg_scene_length: avgSceneLength,
    scene_count: paras.length,
    time_skips_detected: timeSkips,
    transition_density: (transitionCount / totalChars) * 1000,
  };
}

// ---------------------------------------------------------------------------
// Genre marker detection
// ---------------------------------------------------------------------------

const GENRE_MARKERS: Array<{ genre: string; markers: string[] }> = [
  {
    genre: "玄幻",
    markers: ["灵力", "真气", "修为", "境界", "功法", "丹药", "法宝", "灵兽"],
  },
  {
    genre: "仙侠",
    markers: ["飞剑", "道法", "仙术", "渡劫", "灵气", "筑基", "金丹", "元婴"],
  },
  {
    genre: "武侠",
    markers: ["内力", "剑法", "掌法", "轻功", "江湖", "门派", "武功", "招式"],
  },
  {
    genre: "都市",
    markers: ["公司", "城市", "都市", "职场", "商业", "校园", "社会", "现代"],
  },
  {
    genre: "悬疑",
    markers: ["线索", "推理", "凶手", "案件", "真相", "谜团", "证据", "推理"],
  },
  {
    genre: "科幻",
    markers: ["科技", "未来", "太空", "飞船", "基因", "人工智能", "量子", "星系"],
  },
];

function detectGenreMarkers(text: string): string[] {
  const markers: string[] = [];
  for (const { genre, markers: genreMarkers } of GENRE_MARKERS) {
    let hitCount = 0;
    for (const m of genreMarkers) {
      if (text.includes(m)) hitCount++;
    }
    if (hitCount >= 2) {
      markers.push(genre);
    }
  }
  return markers;
}

// ---------------------------------------------------------------------------
// Main analysis
// ---------------------------------------------------------------------------

/**
 * Perform a full analysis of a reference novel file.
 */
export async function analyzeNovel(
  filePath: string
): Promise<ReferenceAnalysisReport> {
  const content = await readFile(filePath, "utf-8");

  // Strip common novel metadata/chapter headers for cleaner analysis
  const text = content.replace(/第[一二三四五六七八九十百千万\d]+章.*$/gm, "");

  const fingerprint = extractStats(text);
  const dialogueAnalysis = analyzeDialogue(text);
  const tropes = extractTropes(text);
  const fatigueWords = identifyFatigueWords(text);
  const vocabularyStats = analyzeVocabulary(text);
  const pacingAnalysis = analyzePacing(text);
  const genreMarkers = detectGenreMarkers(text);

  // Guess title from first line or filename
  const firstLine = text.split("\n")[0]?.trim() ?? "";
  const titleGuess =
    firstLine.length > 0 && firstLine.length < 50
      ? firstLine
      : filePath.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "") ?? "unknown";

  return {
    file_path: filePath,
    title_guess: titleGuess,
    word_count: countChinese(text),
    chinese_char_count: countChinese(text),
    fingerprint,
    dialogue_analysis: dialogueAnalysis,
    tropes,
    fatigue_words: fatigueWords,
    vocabulary_stats: vocabularyStats,
    pacing_analysis: pacingAnalysis,
    genre_markers: genreMarkers,
  };
}
