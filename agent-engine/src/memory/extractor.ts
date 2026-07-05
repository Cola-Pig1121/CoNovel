// ============================================================================
// Fact Extractor — Heuristic pattern matching + LLM prompt builder
// Extracts structured facts from chapter content for the memory system.
// ============================================================================

import type { FactEntry } from "./types.js";

// ---------------------------------------------------------------------------
// Category detection heuristics (no LLM needed for basic extraction)
// ---------------------------------------------------------------------------

const CHARACTER_PATTERNS =
  /(?:说|道|笑|喊|问|答|叹|哼|走|跑|站|坐|看向|盯着|转身|低头|抬头|挥手|点头|摇头)/g;
const LOCATION_PATTERNS =
  /(?:来到|走进|站在|离开|飞往|传送到|进入|走出|抵达|到达|前往|回到)/g;
const EMOTION_PATTERNS =
  /(?:高兴|愤怒|悲伤|恐惧|惊讶|厌恶|期待|绝望|释然|紧张|欣慰|欣慰|愤恨|狂喜|苦涩|酸涩|愤怒|惊喜|失落|委屈)/g;
const HOOK_PATTERNS =
  /(?:突然|竟然|居然|没想到|秘密|真相|隐藏|不禁|难以置信|出乎意料|令人震惊|令人意外)/g;
const TIME_PATTERNS =
  /(?:三天后|一个月|第二天|黎明|黄昏|深夜|清晨|第二天早上|午后|傍晚|凌晨|入夜|午夜|拂晓|日落)/g;

const NOW = (): string => new Date().toISOString();

/**
 * Extract facts from chapter content using heuristic pattern matching.
 * This is the fast, no-LLM path. For deeper extraction, use extractWithLLM().
 */
export function extractFactsHeuristic(
  content: string,
  chapterNumber: number
): FactEntry[] {
  const facts: FactEntry[] = [];
  const id = (cat: string, i: number) =>
    `fact_${chapterNumber}_${cat}_${i}`;

  // Split content into paragraphs for context
  const paragraphs = content.split(/\n+/).filter((p) => p.trim().length > 0);

  // --- Extract character action mentions ---
  const characterMatches = content.match(CHARACTER_PATTERNS) ?? [];
  const uniqueCharacterActions = [...new Set(characterMatches)];
  for (let i = 0; i < uniqueCharacterActions.length; i++) {
    const action = uniqueCharacterActions[i];
    // Find the sentence containing this action
    const sentence = findSentenceContaining(content, action);
    if (sentence) {
      // Try to extract a subject (person before the action verb)
      const subjectMatch = sentence.match(
        /([\u4e00-\u9fff]{1,6})(?:的|地)?(?:说|道|笑|喊|问|答|叹|哼|走|跑|站|坐|看向|盯着|转身|低头|抬头|挥手|点头|摇头)/
      );
      const subject = subjectMatch?.[1] ?? "某角色";
      facts.push({
        id: id("character", i),
        chapterNumber,
        category: "character",
        subject,
        content: sentence.trim(),
        confidence: 0.6,
        createdAt: NOW(),
      });
    }
  }

  // --- Extract location changes ---
  const locationMatches = content.match(LOCATION_PATTERNS) ?? [];
  const uniqueLocations = [...new Set(locationMatches)];
  for (let i = 0; i < uniqueLocations.length; i++) {
    const loc = uniqueLocations[i];
    const sentence = findSentenceContaining(content, loc);
    if (sentence) {
      // Try to extract location name (place after the verb)
      const locMatch = sentence.match(
        /(?:来到|走进|站在|离开|飞往|传送到|进入|走出|抵达|到达|前往|回到)([\u4e00-\u9fff\u3400-\u4dbf]{2,10})/
      );
      const locationName = locMatch?.[1] ?? "未知地点";
      facts.push({
        id: id("location", i),
        chapterNumber,
        category: "location",
        subject: locationName,
        content: sentence.trim(),
        confidence: 0.7,
        createdAt: NOW(),
      });
    }
  }

  // --- Extract emotion shifts ---
  const emotionMatches = content.match(EMOTION_PATTERNS) ?? [];
  const uniqueEmotions = [...new Set(emotionMatches)];
  for (let i = 0; i < uniqueEmotions.length; i++) {
    const emotion = uniqueEmotions[i];
    const sentence = findSentenceContaining(content, emotion);
    if (sentence) {
      facts.push({
        id: id("emotion", i),
        chapterNumber,
        category: "emotion",
        subject: emotion,
        content: sentence.trim(),
        confidence: 0.65,
        createdAt: NOW(),
      });
    }
  }

  // --- Extract hooks / plot plants ---
  const hookMatches = content.match(HOOK_PATTERNS) ?? [];
  const uniqueHooks = [...new Set(hookMatches)];
  for (let i = 0; i < uniqueHooks.length; i++) {
    const hook = uniqueHooks[i];
    const sentence = findSentenceContaining(content, hook);
    if (sentence) {
      facts.push({
        id: id("hook", i),
        chapterNumber,
        category: "hook",
        subject: "剧情钩子",
        content: sentence.trim(),
        confidence: 0.5,
        createdAt: NOW(),
      });
    }
  }

  // --- Extract time references ---
  const timeMatches = content.match(TIME_PATTERNS) ?? [];
  const uniqueTimes = [...new Set(timeMatches)];
  for (let i = 0; i < uniqueTimes.length; i++) {
    const timeRef = uniqueTimes[i];
    facts.push({
      id: id("time", i),
      chapterNumber,
      category: "time",
      subject: timeRef,
      content: `时间推进：${timeRef}`,
      confidence: 0.8,
      createdAt: NOW(),
    });
  }

  // --- Extract information / secrets ---
  const infoPatterns =
    /(?:秘密|真相|隐藏|得知|发现|揭露|揭示|原来|竟然|真相是|其实)/g;
  const infoMatches = content.match(infoPatterns) ?? [];
  const uniqueInfos = [...new Set(infoMatches)];
  for (let i = 0; i < uniqueInfos.length; i++) {
    const info = uniqueInfos[i];
    const sentence = findSentenceContaining(content, info);
    if (sentence) {
      facts.push({
        id: id("information", i),
        chapterNumber,
        category: "information",
        subject: "信息揭示",
        content: sentence.trim(),
        confidence: 0.55,
        createdAt: NOW(),
      });
    }
  }

  return facts;
}

/**
 * Build a prompt for the Observer Agent to extract structured facts.
 * Returns the prompt string that should be sent to the LLM.
 */
export function buildExtractionPrompt(
  content: string,
  chapterNumber: number
): string {
  return `你是观察者Agent。请从以下章节内容中提取关键事实，用于维护小说的连贯性记忆系统。

## 提取类别
1. character（角色）— 出场、行为、状态变化
2. location（地点）— 场景切换、新地点
3. resource（资源）— 物品获得/失去、能力变化、地位变化
4. relationship（关系）— 角色间关系的变化
5. emotion（情感）— 情绪状态变化
6. information（信息）— 揭示的信息/秘密/真相
7. hook（钩子）— 埋设或回收的悬念/伏笔
8. time（时间）— 时间线推进
9. state（状态）— 角色或世界状态的变化

## 提取规则
- 每条事实必须是具体的、可验证的
- confidence（置信度）基于事实的明确程度：0.0-1.0
- subject 应为事实涉及的主要对象（人名、地名、物品名等）
- content 应简洁描述事实本身

## 第 ${chapterNumber} 章内容
${content}

## 输出格式
严格输出以下JSON格式，不要添加其他文字：
{
  "facts": [
    {
      "category": "character|location|resource|relationship|emotion|information|hook|time|state",
      "subject": "涉及的对象",
      "content": "事实描述",
      "confidence": 0.0-1.0
    }
  ]
}`;
}

/**
 * Parse LLM extraction response into FactEntry array.
 */
export function parseExtractionResponse(
  response: string,
  chapterNumber: number
): FactEntry[] {
  const now = new Date().toISOString();

  try {
    // Try to find JSON in the response (may be wrapped in markdown code blocks)
    const jsonMatch = response.match(/\{[\s\S]*"facts"[\s\S]*\}/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as {
      facts: Array<{
        category: string;
        subject: string;
        content: string;
        confidence: number;
      }>;
    };

    if (!Array.isArray(parsed.facts)) return [];

    const validCategories = new Set([
      "character",
      "location",
      "resource",
      "relationship",
      "emotion",
      "information",
      "hook",
      "time",
      "state",
    ]);

    return parsed.facts
      .filter(
        (f) =>
          validCategories.has(f.category) &&
          typeof f.subject === "string" &&
          typeof f.content === "string"
      )
      .map((f, i) => ({
        id: `fact_${chapterNumber}_llm_${i}`,
        chapterNumber,
        category: f.category as FactEntry["category"],
        subject: f.subject,
        content: f.content,
        confidence: Math.max(0, Math.min(1, f.confidence ?? 0.5)),
        createdAt: now,
      }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Find the sentence containing a specific substring.
 * Splits on Chinese and English sentence-ending punctuation.
 */
function findSentenceContaining(
  text: string,
  substring: string
): string | null {
  const idx = text.indexOf(substring);
  if (idx === -1) return null;

  // Find sentence boundaries
  const sentenceEnders = /[。！？!?]/g;
  let start = 0;
  let end = text.length;

  // Find the last sentence-ending punctuation before idx
  let match: RegExpExecArray | null;
  sentenceEnders.lastIndex = 0;
  while ((match = sentenceEnders.exec(text)) !== null) {
    if (match.index < idx) {
      start = match.index + 1;
    } else {
      end = match.index + 1;
      break;
    }
  }

  return text.slice(start, end).trim();
}
