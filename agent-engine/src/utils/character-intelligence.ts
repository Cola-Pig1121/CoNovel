// ============================================================================
// ★ CORE: Character Intelligence Layer
// Detects character inconsistencies via first-person perspective review.
//
// This is CoNovel's signature innovation: each character is asked to "review"
// the chapter from their own perspective, using their own personality, voice,
// knowledge, and emotional state as the ground truth.
// ============================================================================

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type {
  CharacterProfile,
  CharacterViolation,
  CharacterInsightReport,
  PersonalityMatrix,
  VoiceProfile,
  MotivationChain,
  KnowledgeBoundary,
  EmotionalState,
  Relationship,
} from "../types.js";

// ---------------------------------------------------------------------------
// Text extraction: pull character dialogue and actions from chapter text
// ---------------------------------------------------------------------------

/**
 * Extract all dialogue lines for a specific character from chapter text.
 * Handles Chinese dialogue markers: 「」, ""'', "" and ：
 */
export function extractCharacterDialogue(
  text: string,
  characterName: string,
  aliases: string[] = []
): string[] {
  const allNames = [characterName, ...aliases];
  const dialogues: string[] = [];

  // Pattern 1: Name said: "dialogue" or Name道："dialogue"
  const saidPatterns = [
    // 「」brackets
    new RegExp(
      `(?:${allNames.map(escapeRegex).join("|")})\\s*(?:说|道|问|答|喊|叫|冷笑|微笑|叹道|怒道|低声道|沉声道|冷声道|轻声道|缓缓道|淡淡道|低喝|怒吼|惊呼|叹息)[，,：:]?\\s*[「「『『]([^」」』』]+)[」」』』]`,
      "g"
    ),
    // "" quotes
    new RegExp(
      `(?:${allNames.map(escapeRegex).join("|")})\\s*(?:说|道|问|答|喊|叫|冷笑|微笑|叹道|怒道|低声道|沉声道|冷声道|轻声道|缓缓道|淡淡道|低喝|怒吼|惊呼|叹息)[，,：:]?\\s*[""]([^""]+)[""]`,
      "g"
    ),
    // Name said "dialogue" (without colon) — captures the closing bracket content
    new RegExp(
      `(?:${allNames.map(escapeRegex).join("|")})\\s*(?:说|道|问|答)[，,：:]?\\s*[「「『『]([^」」』』]+)`,
      "g"
    ),
  ];

  for (const pattern of saidPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        dialogues.push(match[1]);
      }
    }
  }

  // Pattern 2: Dialogue followed by attribution
  // "dialogue", Name said.
  const attributionPatterns = [
    new RegExp(
      `[「「『『]([^」」』』]+)[」」』』][，,]?\\s*(?:${allNames.map(escapeRegex).join("|")})\\s*(?:说|道|问|答|喊|叫|冷笑|微笑|叹道|怒道)`,
      "g"
    ),
    new RegExp(
      `[""]([^""]+)[""][，,]?\\s*(?:${allNames.map(escapeRegex).join("|")})\\s*(?:说|道|问|答|喊|叫)`,
      "g"
    ),
  ];

  for (const pattern of attributionPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        dialogues.push(match[1]);
      }
    }
  }

  // Deduplicate
  return [...new Set(dialogues)];
}

/**
 * Extract character actions and descriptions from chapter text.
 */
export function extractCharacterActions(
  text: string,
  characterName: string,
  aliases: string[] = []
): string[] {
  const allNames = [characterName, ...aliases];
  const actions: string[] = [];

  // Pattern: Name + verb/action (not dialogue attribution)
  const actionPatterns = [
    // Name + action verb
    new RegExp(
      `(?:${allNames.map(escapeRegex).join("|")})\\s*(?:走了过来|走了过去|站起来|坐下|转身|回头|伸手|点头|摇头|皱眉|闭眼|睁开|深吸|叹气|摇头|苦笑|冷笑|微笑|大笑|轻笑|怒视|凝视|盯着|看着|望向|扫视|站起身|走上前|退后|握紧|松开|捏碎|挥手|甩手|握拳|握紧拳头|猛然|突然|缓缓|轻轻|慢慢|静静|默默|独自|悄悄|径直|猛地|霍然|陡然)`,
      "g"
    ),
    // Name + emotional state description
    new RegExp(
      `(?:${allNames.map(escapeRegex).join("|")})\\s*(?:心中|内心|心头|脑海中|眼里|眼中|脸上|面容|表情|语气|声音|身体|手掌|指尖|后背|额头)\\s*[^。，！？\\n]{2,20}`,
      "g"
    ),
    // Name + physical description
    new RegExp(
      `(?:${allNames.map(escapeRegex).join("|")})\\s*(?:穿着|戴着|背着|拿着|握着|抱着|看着|望着|盯着|瞥了|瞄了|扫了|瞪了)[^。，！？\\n]{2,20}`,
      "g"
    ),
  ];

  for (const pattern of actionPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      actions.push(match[0]);
    }
  }

  return [...new Set(actions)];
}

/**
 * Extract ALL character mentions (to find who appears in the chapter).
 */
export function extractCharacterMentions(
  text: string,
  characterName: string,
  aliases: string[] = []
): { count: number; contexts: string[] } {
  const allNames = [characterName, ...aliases];
  let count = 0;
  const contexts: string[] = [];

  for (const name of allNames) {
    const regex = new RegExp(escapeRegex(name), "g");
    let match;
    while ((match = regex.exec(text)) !== null) {
      count++;
      const start = Math.max(0, match.index - 20);
      const end = Math.min(text.length, match.index + name.length + 40);
      contexts.push(text.slice(start, end));
    }
  }

  return { count, contexts: contexts.slice(0, 20) };
}

// ---------------------------------------------------------------------------
// Character profile loader
// ---------------------------------------------------------------------------

/**
 * Load a character profile from disk.
 */
export async function loadCharacterProfile(
  bookPath: string,
  characterId: string
): Promise<CharacterProfile | null> {
  const profilePath = join(bookPath, "characters", `${characterId}.json`);
  try {
    const content = await readFile(profilePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Load all character profiles from a book.
 */
export async function loadAllCharacterProfiles(
  bookPath: string
): Promise<CharacterProfile[]> {
  const charsDir = join(bookPath, "characters");
  try {
    const files = await readdir(charsDir);
    const profiles: CharacterProfile[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const content = await readFile(join(charsDir, file), "utf-8");
        profiles.push(JSON.parse(content));
      } catch {
        // Skip malformed files
      }
    }
    return profiles;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// First-person review prompt builder
// ---------------------------------------------------------------------------

/**
 * Build a first-person review prompt for a specific character.
 * The character "reads" the chapter and identifies inconsistencies.
 */
export function buildFirstPersonReviewPrompt(
  character: CharacterProfile,
  chapterContent: string,
  chapterNumber: number,
  dialogue: string[],
  actions: string[]
): string {
  const sections: string[] = [];

  // ===== SECTION 1: Character identity grounding =====
  sections.push(`<角色身份>
你是"${character.name}"，以下是你的完整人物设定：

【核心性格】
- 主要特质：${character.personality.core_traits.join("、")}
- 次要特质：${character.personality.secondary_traits.join("、")}
- 性格缺陷：${character.personality.flaws.join("、")}
- 内心矛盾：${character.personality.internal_conflicts.join("、")}
- 成长弧线：${character.personality.growth_arc.join(" → ")}

【说话方式】
- 词汇水平：${character.voice.vocabulary_level}
- 句式偏好：${character.voice.sentence_preference}
- 口头禅/语气词：${character.voice.speech_quirks.join("、")}
- 禁用词汇：${character.voice.forbidden_words.join("、")}
- 打招呼方式：${character.voice.greeting_style}
- 生气时表达：${character.voice.anger_expression}
- 开心时表达：${character.voice.joy_expression}
- 难过时表达：${character.voice.sadness_expression}
${character.voice.dialect_or_accent ? `- 方言/口音：${character.voice.dialect_or_accent}` : ""}

【动机与目标】
- 主要目标：${character.motivations.primary_goal}
- 次要目标：${character.motivations.secondary_goals.join("、")}
- 隐藏欲望：${character.motivations.hidden_desires.join("、")}
- 恐惧：${character.motivations.fears.join("、")}
- 道德准则：${character.motivations.moral_code}
- 当前紧迫事：${character.motivations.current_urgency}

【知识边界】
- 已知事实：${character.knowledge.known_facts.join("、") || "（无特定要求）"}
- 未知事实：${character.knowledge.unknown_facts.join("、") || "（无特定要求）"}
- 误解：${character.knowledge.misconceptions.join("、") || "（无）"}

【当前情感状态】
- 当前心情：${character.emotional_state.current_mood}
- 情感稳定度：${character.emotional_state.emotional_stability}（0=极度不稳定，1=非常稳定）
- 创伤触发点：${character.emotional_state.trauma_triggers.join("、") || "（无）"}
- 安慰来源：${character.emotional_state.comfort_sources.join("、") || "（无）"}

【人物关系】
${character.relationships.map((r) => {
  const relDesc = `- 与"${r.target_character}"：${r.relationship_type}（${r.dynamic}），当前紧张度 ${r.current_tension}/1`;
  const secrets = r.secret_knowledge.length > 0 ? `，对对方的秘密：${r.secret_knowledge.join("、")}` : "";
  return relDesc + secrets;
}).join("\n") || "（无特殊关系）"}
</角色身份>`);

  // ===== SECTION 2: Chapter content for review =====
  sections.push(`<待审阅章节>
这是第${chapterNumber}章的内容：

${chapterContent}
</待审阅章节>`);

  // ===== SECTION 3: Extracted character data =====
  if (dialogue.length > 0) {
    sections.push(`<你在这章中的对话>
以下是系统提取的你在本章中的所有对话：

${dialogue.map((d, i) => `[${i + 1}] "${d}"`).join("\n")}
</你在这章中的对话>`);
  }

  if (actions.length > 0) {
    sections.push(`<你在这章中的行为>
以下是系统提取的你在本章中的行为描写：

${actions.map((a, i) => `[${i + 1}] ${a}`).join("\n")}
</你在这章中的行为>`);
  }

  // ===== SECTION 4: Review instructions =====
  sections.push(`<审阅要求>
作为"${character.name}"本人，请从第一人称视角审阅第${chapterNumber}章，检查以下方面：

1. 【语言一致性】我的对话是否符合我的说话方式？词汇水平、语气、口头禅是否一致？有没有说出我不可能说的话？

2. 【知识边界】我是否在这章中知道了我不应该知道的信息？（比如，我在第3章才得知的秘密，在第2章就表现得已经知道了）

3. 【动机一致性】我的行为和决定是否符合我当前的动机和目标？有没有突然改变立场却没有合理原因？

4. 【情感一致性】我的情感反应是否符合我当前的情感状态？是否有不自然的情感跳跃？

5. 【行为一致性】我的行为是否符合我的性格特质？一个胆小的人是否突然变得非常勇敢？

6. 【关系一致性】我与其他角色的互动是否符合我们的关系状态？紧张度是否合理？

7. 【语音一致性】我的内心独白是否符合我的说话方式？是否混入了其他角色的语气？

请以JSON格式输出审阅结果：

{
  "character_id": "${character.id}",
  "character_name": "${character.name}",
  "overall_feeling": "（用第一人称简述你对这章的感受，2-3句话）",
  "violations": [
    {
      "category": "voice_inconsistency|knowledge_leak|motivation_break|emotional_inconsistency|relationship_mismatch|behavioral_out_of_character|speech_pattern_violation",
      "severity": "critical|major|minor",
      "description": "（具体描述问题）",
      "original_text": "（引用原文中出问题的句子）",
      "suggestion": "（如何修改建议）",
      "chapter": ${chapterNumber}
    }
  ],
  "consistency_score": 0-100,
  "recommendations": ["（具体的改进建议列表）"]
}

重要：
- 只报告真实的问题，不要凭空捏造
- 如果一切正常，violations可以为空数组，consistency_score应为90-100
- 评分标准：100=完美一致，90-99=有微小问题，70-89=有需要修改的问题，<70=严重不一致
</审阅要求>`);

  return sections.join("\n\n");
}

// ---------------------------------------------------------------------------
// Violation parser: parse LLM JSON response into structured data
// ---------------------------------------------------------------------------

const VALID_CATEGORIES = new Set([
  "voice_inconsistency",
  "knowledge_leak",
  "motivation_break",
  "emotional_inconsistency",
  "relationship_mismatch",
  "behavioral_out_of_character",
  "speech_pattern_violation",
]);

const VALID_SEVERITIES = new Set(["critical", "major", "minor"]);

/**
 * Parse the LLM review response into structured CharacterInsightReport.
 * Handles malformed JSON gracefully with multiple fallback strategies.
 */
export function parseReviewResponse(
  response: string,
  chapterNumber: number,
  characterId: string,
  characterName: string
): CharacterInsightReport {
  // Strategy 1: Direct JSON parse
  let parsed: Record<string, unknown> | null = null;

  try {
    parsed = JSON.parse(response);
  } catch {
    // Strategy 2: Extract JSON block from markdown
    const jsonMatch = response.match(/```json\s*\n?([\s\S]*?)\n?\s*```/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[1]);
      } catch {
        // Strategy 3: Find JSON object in text
        const objMatch = response.match(/\{[\s\S]*"violations"[\s\S]*\}/);
        if (objMatch) {
          try {
            parsed = JSON.parse(objMatch[0]);
          } catch {
            // Strategy 4: Build minimal report from text
            return buildFallbackReport(response, chapterNumber, characterId, characterName);
          }
        }
      }
    }
  }

  if (!parsed) {
    return buildFallbackReport(response, chapterNumber, characterId, characterName);
  }

  // Extract and validate fields
  const violations: CharacterViolation[] = [];
  const rawViolations = Array.isArray(parsed.violations) ? parsed.violations : [];

  for (const rv of rawViolations) {
    if (typeof rv !== "object" || rv === null) continue;

    const category = VALID_CATEGORIES.has(rv.category) ? rv.category : "behavioral_out_of_character";
    const severity = VALID_SEVERITIES.has(rv.severity) ? rv.severity : "minor";

    violations.push({
      character_id: characterId,
      character_name: characterName,
      category: category as CharacterViolation["category"],
      severity: severity as CharacterViolation["severity"],
      description: String(rv.description ?? "未知问题"),
      original_text: String(rv.original_text ?? ""),
      suggestion: String(rv.suggestion ?? ""),
      chapter: chapterNumber,
    });
  }

  const overallScore = typeof parsed.consistency_score === "number"
    ? Math.max(0, Math.min(100, parsed.consistency_score))
    : computeScoreFromViolations(violations);

  const recommendations = Array.isArray(parsed.recommendations)
    ? parsed.recommendations.map(String)
    : [];

  // Compute per-character scores
  const characterScores: Record<string, number> = {};
  characterScores[characterId] = overallScore;

  return {
    chapter: chapterNumber,
    total_violations: violations.length,
    violations,
    overall_consistency_score: overallScore,
    character_scores: characterScores,
    recommendations,
    reviewed_at: new Date().toISOString(),
  };
}

/**
 * Build a fallback report when JSON parsing fails completely.
 * Uses regex to extract what we can from the natural language response.
 */
function buildFallbackReport(
  response: string,
  chapterNumber: number,
  characterId: string,
  characterName: string
): CharacterInsightReport {
  const violations: CharacterViolation[] = [];

  // Try to detect severity mentions
  const hasCritical = /严重|critical|大问题|重大/.test(response);
  const hasMajor = /需要修改|major|明显|显著/.test(response);
  const hasMinor = /minor|微小|小问题|细节/.test(response);

  // Detect issue categories from text
  const categoryKeywords: Array<[CharacterViolation["category"], string[]]> = [
    ["voice_inconsistency", ["说话方式", "语气", "口吻", "词汇", "voice", "语言风格"]],
    ["knowledge_leak", ["知道", "信息泄露", "knowledge", "不该知道", "提前知道"]],
    ["motivation_break", ["动机", "目标", "motivation", "立场突变", "没有理由"]],
    ["emotional_inconsistency", ["情感", "情绪", "emotion", "心情", "不自然"]],
    ["relationship_mismatch", ["关系", "relationship", "互动", "紧张度"]],
    ["behavioral_out_of_character", ["行为", "behavior", "性格", "不符", "out of character"]],
    ["speech_pattern_violation", ["对话", "speech", "台词", "对白"]],
  ];

  // Extract potential violation descriptions (sentences with issue keywords)
  const sentences = response.split(/[。！？\n]/).filter((s) => s.trim().length > 10);

  for (const sentence of sentences) {
    for (const [category, keywords] of categoryKeywords) {
      if (keywords.some((kw) => sentence.includes(kw))) {
        const severity = hasCritical ? "critical" : hasMajor ? "major" : hasMinor ? "minor" : "minor";
        violations.push({
          character_id: characterId,
          character_name: characterName,
          category,
          severity,
          description: sentence.trim().slice(0, 200),
          original_text: "",
          suggestion: "",
          chapter: chapterNumber,
        });
        break;
      }
    }
  }

  // Deduplicate by category (keep only first per category)
  const seen = new Set<string>();
  const deduped = violations.filter((v) => {
    if (seen.has(v.category)) return false;
    seen.add(v.category);
    return true;
  });

  const score = computeScoreFromViolations(deduped);

  return {
    chapter: chapterNumber,
    total_violations: deduped.length,
    violations: deduped,
    overall_consistency_score: score,
    character_scores: { [characterId]: score },
    recommendations: [
      deduped.length > 0
        ? `检测到${deduped.length}个角色一致性问题，建议逐条审阅修改`
        : "角色表现基本一致",
    ],
    reviewed_at: new Date().toISOString(),
  };
}

/**
 * Compute consistency score from violations.
 */
function computeScoreFromViolations(violations: CharacterViolation[]): number {
  let score = 100;
  for (const v of violations) {
    switch (v.severity) {
      case "critical":
        score -= 20;
        break;
      case "major":
        score -= 8;
        break;
      case "minor":
        score -= 3;
        break;
    }
  }
  return Math.max(0, Math.min(100, score));
}

// ---------------------------------------------------------------------------
// Main API: reviewCharacterConsistency
// ---------------------------------------------------------------------------

/**
 * Review character consistency in a chapter.
 *
 * This is the core innovation:
 * 1. Load character profiles from the book directory
 * 2. Extract dialogue and actions for each character from the chapter
 * 3. Build first-person review prompts (each character "reads" the chapter)
 * 4. (In production: send to LLM for review)
 * 5. Parse responses into structured violation reports
 *
 * When no LLM is available (offline mode), uses heuristic checks.
 */
export async function reviewCharacterConsistency(
  chapterContent: string,
  chapterNumber: number,
  bookPath: string,
  characterIds?: string[]
): Promise<CharacterInsightReport> {
  console.log(`[character-intelligence] Reviewing chapter ${chapterNumber} from ${bookPath}`);

  // Load all character profiles
  const allProfiles = await loadAllCharacterProfiles(bookPath);
  if (allProfiles.length === 0) {
    console.warn("[character-intelligence] No character profiles found");
    return {
      chapter: chapterNumber,
      total_violations: 0,
      violations: [],
      overall_consistency_score: 100,
      character_scores: {},
      recommendations: ["未找到角色档案，无法进行角色一致性审阅"],
      reviewed_at: new Date().toISOString(),
    };
  }

  // Filter to specific characters if requested
  const profiles = characterIds
    ? allProfiles.filter((p) => characterIds.includes(p.id))
    : allProfiles.filter((p) => p.role === "protagonist" || p.role === "antagonist" || p.role === "supporting");

  console.log(`[character-intelligence] Reviewing ${profiles.length} characters`);

  // Perform heuristic-based review for each character
  const allViolations: CharacterViolation[] = [];
  const characterScores: Record<string, number> = {};

  for (const profile of profiles) {
    const aliases = profile.alias ?? [];
    const dialogue = extractCharacterDialogue(chapterContent, profile.name, aliases);
    const actions = extractCharacterActions(chapterContent, profile.name, aliases);
    const mentions = extractCharacterMentions(chapterContent, profile.name, aliases);

    // Skip characters that don't appear in this chapter
    if (mentions.count === 0) continue;

    // Run heuristic checks
    const violations = runHeuristicChecks(profile, dialogue, actions, chapterNumber);
    allViolations.push(...violations);

    const score = computeScoreFromViolations(violations);
    characterScores[profile.id] = score;
  }

  // Compute overall score
  const scores = Object.values(characterScores);
  const overallScore = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 100;

  // Generate recommendations
  const recommendations = generateRecommendations(allViolations, profiles);

  const report: CharacterInsightReport = {
    chapter: chapterNumber,
    total_violations: allViolations.length,
    violations: allViolations,
    overall_consistency_score: Math.round(overallScore),
    character_scores: characterScores,
    recommendations,
    reviewed_at: new Date().toISOString(),
  };

  console.log(`[character-intelligence] Review complete: ${allViolations.length} violations, score=${report.overall_consistency_score}`);

  return report;
}

// ---------------------------------------------------------------------------
// Heuristic consistency checks (no LLM required)
// ---------------------------------------------------------------------------

interface HeuristicViolation {
  category: CharacterViolation["category"];
  severity: CharacterViolation["severity"];
  description: string;
  original_text: string;
  suggestion: string;
}

function runHeuristicChecks(
  profile: CharacterProfile,
  dialogue: string[],
  actions: string[],
  chapterNumber: number
): CharacterViolation[] {
  const violations: CharacterViolation[] = [];

  // Check 1: Forbidden words in dialogue
  for (const line of dialogue) {
    for (const forbidden of profile.voice.forbidden_words) {
      if (line.includes(forbidden)) {
        violations.push({
          character_id: profile.id,
          character_name: profile.name,
          category: "speech_pattern_violation",
          severity: "major",
          description: `"${profile.name}"的对话中出现了禁用词汇"${forbidden}"`,
          original_text: line,
          suggestion: `移除或替换"${forbidden}"，使用符合角色身份的表达`,
          chapter: chapterNumber,
        });
      }
    }
  }

  // Check 2: Vocabulary level consistency
  const avgDialogueLength = dialogue.length > 0
    ? dialogue.reduce((sum, d) => sum + d.length, 0) / dialogue.length
    : 0;

  if (profile.voice.vocabulary_level === "simple" && avgDialogueLength > 40) {
    violations.push({
      character_id: profile.id,
      character_name: profile.name,
      category: "voice_inconsistency",
      severity: "minor",
      description: `"${profile.name}"的词汇水平为"简单"，但对话平均长度偏长（${avgDialogueLength.toFixed(0)}字），可能过于文雅`,
      original_text: dialogue[0] ?? "",
      suggestion: "缩短对话，使用更口语化的表达",
      chapter: chapterNumber,
    });
  }

  if (profile.voice.vocabulary_level === "archaic" && avgDialogueLength < 10 && dialogue.length > 3) {
    violations.push({
      character_id: profile.id,
      character_name: profile.name,
      category: "voice_inconsistency",
      severity: "minor",
      description: `"${profile.name}"的词汇水平为"古雅"，但对话偏短偏口语化`,
      original_text: dialogue[0] ?? "",
      suggestion: "增加文言色彩和古风表达",
      chapter: chapterNumber,
    });
  }

  // Check 3: Speech quirks absence (if character should have quirks)
  if (profile.voice.speech_quirks.length > 0 && dialogue.length > 5) {
    const allDialogueText = dialogue.join("");
    const hasQuirk = profile.voice.speech_quirks.some((q) => allDialogueText.includes(q));
    if (!hasQuirk) {
      violations.push({
        character_id: profile.id,
        character_name: profile.name,
        category: "speech_pattern_violation",
        severity: "minor",
        description: `"${profile.name}"在${dialogue.length}句对话中未使用任何标志性口头禅：${profile.voice.speech_quirks.join("、")}`,
        original_text: "",
        suggestion: "适当添加角色标志性表达，增强辨识度",
        chapter: chapterNumber,
      });
    }
  }

  // Check 4: Sentence pattern consistency
  if (profile.voice.sentence_preference === "short" && dialogue.length > 3) {
    const longDialogues = dialogue.filter((d) => d.length > 30);
    if (longDialogues.length > dialogue.length * 0.3) {
      violations.push({
        character_id: profile.id,
        character_name: profile.name,
        category: "voice_inconsistency",
        severity: "minor",
        description: `"${profile.name}"偏好短句，但${longDialogues.length}/${dialogue.length}句对话超过30字`,
        original_text: longDialogues[0] ?? "",
        suggestion: "将长对话拆分为短句，或使用更简洁的表达",
        chapter: chapterNumber,
      });
    }
  }

  // Check 5: Core trait absence
  if (profile.personality.core_traits.length > 0 && actions.length > 3) {
    const allActionsText = actions.join("");
    const traitKeywords: Record<string, string[]> = {
      "勇敢": ["冲", "站", "挡", "护", "冲上去"],
      "胆小": ["退", "缩", "害怕", "颤抖", "不敢"],
      "冷酷": ["冷笑", "漠然", "面无表情", "淡漠"],
      "善良": ["帮", "救", "扶", "安慰", "关心"],
      "狡猾": ["暗想", "嘴角", "算计", "谋划", "微笑"],
      "暴躁": ["怒", "吼", "骂", "砸", "踢"],
      "沉默": ["沉默", "不语", "无言", "默默"],
    };

    for (const trait of profile.personality.core_traits) {
      // Check if opposing traits appear in actions
      const opposingTraits: Record<string, string[]> = {
        "勇敢": ["退缩", "害怕", "颤抖", "不敢"],
        "胆小": ["冲上去", "大步", "毫不畏惧"],
        "冷酷": ["温柔", "微笑", "关怀", "心疼"],
        "善良": ["狠心", "无情", "残忍"],
        "暴躁": ["温柔", "轻声", "细语"],
        "沉默": ["喋喋不休", "滔滔不绝", "话多"],
      };

      const opposites = opposingTraits[trait] ?? [];
      for (const opposite of opposites) {
        if (allActionsText.includes(opposite)) {
          violations.push({
            character_id: profile.id,
            character_name: profile.name,
            category: "behavioral_out_of_character",
            severity: "major",
            description: `"${profile.name}"的核心性格特质为"${trait}"，但行为中出现了"${opposite}"，可能存在行为不一致`,
            original_text: actions.find((a) => a.includes(opposite)) ?? "",
            suggestion: `检查"${opposite}"的行为是否符合角色性格发展，或需要调整`,
            chapter: chapterNumber,
          });
          break; // Only report once per trait
        }
      }
    }
  }

  // Check 6: Emotional state consistency
  if (profile.emotional_state.trauma_triggers.length > 0) {
    const allText = dialogue.join(" ") + actions.join(" ");
    for (const trigger of profile.emotional_state.trauma_triggers) {
      if (allText.includes(trigger)) {
        // Character encounters trauma trigger — check if emotional reaction is appropriate
        const hasEmotionalReaction = allText.includes("颤") || allText.includes("怕") ||
          allText.includes("惊") || allText.includes("怒") || allText.includes("退");
        if (!hasEmotionalReaction && profile.emotional_state.emotional_stability < 0.5) {
          violations.push({
            character_id: profile.id,
            character_name: profile.name,
            category: "emotional_inconsistency",
            severity: "major",
            description: `"${profile.name}"遇到了创伤触发点"${trigger}"（情感稳定度仅${profile.emotional_state.emotional_stability}），但未表现出相应的情感反应`,
            original_text: "",
            suggestion: "添加相应的情感反应描写，或调整角色对该触发点的反应",
            chapter: chapterNumber,
          });
        }
      }
    }
  }

  // Check 7: Relationship tension consistency
  for (const rel of profile.relationships) {
    if (rel.dynamic === "worsening" && rel.current_tension > 0.7) {
      // High tension relationship — check for too-friendly interactions
      const friendlyPatterns = ["笑", "感谢", "抱歉", "理解", "原谅"];
      const allText = dialogue.join(" ") + actions.join(" ");
      const friendlyCount = friendlyPatterns.filter((p) => allText.includes(p)).length;
      if (friendlyCount > 3) {
        violations.push({
          character_id: profile.id,
          character_name: profile.name,
          category: "relationship_mismatch",
          severity: "minor",
          description: `"${profile.name}"与"${rel.target_character}"关系为"${rel.dynamic}"，紧张度${rel.current_tension}，但互动中出现了多次友好表达`,
          original_text: "",
          suggestion: `关系紧张度高时应减少友好互动，或在互动中体现矛盾`,
          chapter: chapterNumber,
        });
      }
    }
  }

  // Check 8: Knowledge boundary — basic pattern matching
  const allText = dialogue.join(" ") + actions.join(" ");
  for (const known of profile.knowledge.known_facts) {
    // Check if character references unknown information
    for (const unknown of profile.knowledge.unknown_facts) {
      if (unknown && allText.includes(unknown) && !known.includes(unknown)) {
        violations.push({
          character_id: profile.id,
          character_name: profile.name,
          category: "knowledge_leak",
          severity: "critical",
          description: `"${profile.name}"在对话/行为中表现出了对"${unknown}"的了解，但该信息属于其知识边界之外`,
          original_text: "",
          suggestion: "删除该信息引用，或安排角色通过合理途径获知",
          chapter: chapterNumber,
        });
      }
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Recommendations generator
// ---------------------------------------------------------------------------

function generateRecommendations(
  violations: CharacterViolation[],
  profiles: CharacterProfile[]
): string[] {
  const recommendations: string[] = [];

  if (violations.length === 0) {
    recommendations.push("所有角色表现一致，未检测到明显问题");
    return recommendations;
  }

  // Group by category
  const byCategory = new Map<string, CharacterViolation[]>();
  for (const v of violations) {
    const existing = byCategory.get(v.category) ?? [];
    existing.push(v);
    byCategory.set(v.category, existing);
  }

  const categoryAdvice: Record<string, string> = {
    voice_inconsistency: "角色语言风格不一致，建议统一对话写作风格",
    knowledge_leak: "角色知识泄露是严重问题，需要严格把控信息流动",
    motivation_break: "角色动机断裂，建议检查角色决策的逻辑链",
    emotional_inconsistency: "情感反应不自然，建议参考角色情感状态设定",
    relationship_mismatch: "角色关系表现不一致，建议参考关系设定调整互动",
    behavioral_out_of_character: "角色行为出戏，建议根据性格特质重新审视",
    speech_pattern_violation: "对话风格偏离角色设定，建议调整用词和句式",
  };

  for (const [category, catViolations] of byCategory) {
    const criticalCount = catViolations.filter((v) => v.severity === "critical").length;
    const majorCount = catViolations.filter((v) => v.severity === "major").length;

    if (criticalCount > 0) {
      recommendations.push(`⚠️ [严重] ${categoryAdvice[category] ?? category}（${criticalCount}个严重问题）`);
    } else if (majorCount > 0) {
      recommendations.push(`⚡ [重要] ${categoryAdvice[category] ?? category}（${majorCount}个重要问题）`);
    }
  }

  // Per-character summary
  const byCharacter = new Map<string, CharacterViolation[]>();
  for (const v of violations) {
    const existing = byCharacter.get(v.character_name) ?? [];
    existing.push(v);
    byCharacter.set(v.character_name, existing);
  }

  for (const [name, charViolations] of byCharacter) {
    if (charViolations.length >= 3) {
      recommendations.push(`📋 "${name}"有${charViolations.length}个问题需要重点关注`);
    }
  }

  return recommendations;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Build review prompt for external LLM call (exported for agent-server use)
// ---------------------------------------------------------------------------

/**
 * Prepare the full review data for an external LLM call.
 * Returns the prompt and character info needed for the agent server to
 * call the LLM with the correct agent routing.
 */
export async function prepareCharacterReviewLLMCall(
  chapterContent: string,
  chapterNumber: number,
  bookPath: string,
  characterIds?: string[]
): Promise<Array<{
  characterId: string;
  characterName: string;
  prompt: string;
  dialogue: string[];
  actions: string[];
}>> {
  const allProfiles = await loadAllCharacterProfiles(bookPath);

  const profiles = characterIds
    ? allProfiles.filter((p) => characterIds.includes(p.id))
    : allProfiles.filter((p) => p.role === "protagonist" || p.role === "antagonist" || p.role === "supporting");

  const calls: Array<{
    characterId: string;
    characterName: string;
    prompt: string;
    dialogue: string[];
    actions: string[];
  }> = [];

  for (const profile of profiles) {
    const aliases = profile.alias ?? [];
    const dialogue = extractCharacterDialogue(chapterContent, profile.name, aliases);
    const actions = extractCharacterActions(chapterContent, profile.name, aliases);
    const mentions = extractCharacterMentions(chapterContent, profile.name, aliases);

    if (mentions.count === 0) continue;

    const prompt = buildFirstPersonReviewPrompt(
      profile,
      chapterContent,
      chapterNumber,
      dialogue,
      actions
    );

    calls.push({
      characterId: profile.id,
      characterName: profile.name,
      prompt,
      dialogue,
      actions,
    });
  }

  return calls;
}
