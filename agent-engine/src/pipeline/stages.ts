// ============================================================================
// CoNovel Agent Engine — Pipeline Stage Handlers
// Each stage maps to one or more agents in the writing pipeline.
// ============================================================================

import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type {
  PipelineStage,
  PipelineStageState,
  BookState,
  ChapterOutline,
  CharacterProfile,
  ChapterMeta,
} from "../types.js";
import type { FactEntry } from "../memory/types.js";
import { AGENT_NAMES, getAgentPrompt, buildWritingPrompt } from "./prompts.js";
import { detectAILayers, sanitizeText } from "../utils/de-ai.js";
import {
  reviewCharacterConsistency,
  prepareCharacterReviewLLMCall,
  parseReviewResponse,
} from "../utils/character-intelligence.js";
import { tokenize, bm25Score } from "../knowledge/bm25-search.js";

// ---------------------------------------------------------------------------
// Stage context: passed between stages
// ---------------------------------------------------------------------------

export interface StageContext {
  bookPath: string;
  chapterNumber: number;
  bookState: BookState;
  chapterOutline?: ChapterOutline;
  previousChapterSummary?: string;
  chapterContent?: string;
  llmCall: LLMCallFunction;
  stageResults: Map<PipelineStage, StageResult>;
  tools: Record<string, (params: any) => Promise<any>>;
}

export interface StageResult {
  stage: PipelineStage;
  output: string;
  metadata?: Record<string, unknown>;
  tokenUsage?: { input: number; output: number };
}

/**
 * LLM call function signature — injected by the orchestrator.
 */
export type LLMCallFunction = (
  agentName: string,
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; max_tokens?: number }
) => Promise<string>;

// ---------------------------------------------------------------------------
// BM25-based fact retrieval for context pruning
// ---------------------------------------------------------------------------

/**
 * Retrieve the top-K most relevant memory facts for a given chapter using BM25 scoring.
 *
 * Reads all fact JSON files from `memory/facts/`, tokenizes using Chinese bigrams
 * (same pattern as bm25-search.ts), and scores each fact against the query built
 * from the chapter outline title, POV character name, and key events.
 *
 * @param bookPath - Root path of the book project
 * @param chapterContent - Query text built from chapter outline (title + POV + key events)
 * @param topK - Number of most relevant facts to return (default 10)
 * @returns Top-K facts sorted by BM25 relevance score
 */
async function retrieveRelevantFacts(
  bookPath: string,
  chapterContent: string,
  topK: number = 10
): Promise<FactEntry[]> {
  const factsDir = join(bookPath, "memory", "facts");
  let allFacts: FactEntry[] = [];

  // Read all fact JSON files from memory/facts/ directory
  try {
    const factFiles = await readdir(factsDir);
    for (const file of factFiles) {
      if (!file.endsWith(".json")) continue;
      try {
        const content = await readFile(join(factsDir, file), "utf-8");
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          allFacts.push(...parsed);
        }
      } catch {
        // Skip unreadable files
      }
    }
  } catch {
    // No facts directory — return empty
  }

  if (allFacts.length === 0) return [];
  if (allFacts.length <= topK) return allFacts;

  // Tokenize the query (chapter outline title + POV character + key events)
  const queryTokens = tokenize(chapterContent);
  if (queryTokens.length === 0) return allFacts.slice(0, topK);

  // Compute tokenized fact documents and average doc length for BM25
  const docTokenLists = allFacts.map((fact) => {
    const factText = `${fact.category} ${fact.subject} ${fact.content}`;
    return tokenize(factText);
  });
  const totalDocLen = docTokenLists.reduce((sum, t) => sum + t.length, 0);
  const avgDocLen = totalDocLen / docTokenLists.length;

  // Score each fact with BM25 and return top K most relevant
  const scoredFacts = allFacts.map((fact, i) => {
    const score = bm25Score(queryTokens, docTokenLists[i], avgDocLen);
    return { fact, score };
  });

  scoredFacts.sort((a, b) => b.score - a.score);
  return scoredFacts.slice(0, topK).map((sf) => sf.fact);
}

// ---------------------------------------------------------------------------
// Stage definitions
// ---------------------------------------------------------------------------

export interface StageDefinition {
  stage: PipelineStage;
  agentName: string;
  description: string;
  execute: (ctx: StageContext) => Promise<StageResult>;
}

/**
 * All pipeline stage definitions, in execution order.
 */
export const STAGE_DEFINITIONS: StageDefinition[] = [
  // ===== Stage 1: Context Assembly (BM25-optimized) =====
  {
    stage: "context_assembly",
    agentName: AGENT_NAMES.CHAPTER_PLANNER,
    description: "组装上下文：加载书籍状态、角色档案、大纲，构建写作上下文（上下文裁剪优化）",
    execute: async (ctx) => {
      const { bookState, chapterNumber, bookPath } = ctx;

      // ── 1. Find chapter outline (scoped to current act/volume) ──
      const chapterOutline = bookState.outline.chapter_outlines.find(
        (o) => o.chapter_number === chapterNumber
      );

      // Determine current act/volume to scope the outline
      const currentAct = bookState.outline.act_outlines.find(
        (a) => chapterNumber >= a.chapter_range[0] && chapterNumber <= a.chapter_range[1]
      );

      // Only load chapter outlines within the current act's range
      let scopedChapterOutlines = bookState.outline.chapter_outlines;
      if (currentAct) {
        scopedChapterOutlines = bookState.outline.chapter_outlines.filter(
          (o) => o.chapter_number >= currentAct.chapter_range[0] &&
                 o.chapter_number <= currentAct.chapter_range[1]
        );
      }

      // ── 2. Load only the last 2 chapters' summaries (not all chapters) ──
      const recentChapters = bookState.chapters
        .filter((c) => c.number < chapterNumber)
        .sort((a, b) => b.number - a.number)
        .slice(0, 2);

      // Build previous chapter content (last 1-2 chapters' text, capped at 500 chars each)
      const recentChapterTexts: string[] = [];
      for (const ch of recentChapters) {
        if (ch.summary) {
          recentChapterTexts.push(`第${ch.number}章概要：${ch.summary}`);
        } else {
          try {
            const chPath = join(bookPath, "chapters", `chapter_${String(ch.number).padStart(4, "0")}.txt`);
            const content = await readFile(chPath, "utf-8");
            recentChapterTexts.push(`第${ch.number}章（节选）：${content.slice(0, 500)}...`);
          } catch {
            // No chapter file
          }
        }
      }

      // ── 3. Load only the current POV character's full profile ──
      let characterContext = "";
      const povCharacterName = chapterOutline?.pov_character;
      if (povCharacterName) {
        const povChar = bookState.characters.find(
          (c) => c.id === povCharacterName || c.name === povCharacterName
        );
        if (povChar) {
          characterContext = JSON.stringify(povChar, null, 2);
        }
      }

      // ── 4. BM25-based fact retrieval: top 10 most relevant facts ──
      // Build query from chapter outline title + POV character name + key events
      const outlineQueryText = [
        chapterOutline?.title ?? "",
        chapterOutline?.pov_character ?? "",
        chapterOutline?.key_events.join(" ") ?? "",
        chapterOutline?.summary ?? "",
      ].join(" ");
      const relevantFacts = await retrieveRelevantFacts(bookPath, outlineQueryText);

      // ── 5. Build compact world context (summary instead of full dump) ──
      const worldContext = [
        `世界名：${bookState.world.name}`,
        `时代：${bookState.world.era}`,
        bookState.world.factions.length > 0
          ? `势力：${bookState.world.factions.map((f) => f.name).join("、")}`
          : "",
        bookState.world.power_system ? `力量体系：${bookState.world.power_system}` : "",
      ].filter(Boolean).join("\n");

      // ── Assemble optimized context ──
      const contextParts: string[] = [];

      if (currentAct) {
        contextParts.push(`当前卷/幕：第${currentAct.act_number}幕「${currentAct.title}」（第${currentAct.chapter_range[0]}-${currentAct.chapter_range[1]}章）`);
      }

      if (recentChapterTexts.length > 0) {
        contextParts.push(`近期章节：\n${recentChapterTexts.join("\n\n")}`);
      }

      if (chapterOutline) {
        contextParts.push(`章节大纲：${JSON.stringify(chapterOutline, null, 2)}`);
      }

      if (characterContext) {
        contextParts.push(`POV角色档案：${characterContext}`);
      }

      if (worldContext) {
        contextParts.push(`世界设定：\n${worldContext}`);
      }

      if (relevantFacts.length > 0) {
        contextParts.push(`相关记忆事实（BM25检索，共${relevantFacts.length}条）：\n${relevantFacts.map((f) => `- [${f.category}] ${f.subject}: ${f.content}`).join("\n")}`);
      }

      const output = contextParts.join("\n\n");

      return {
        stage: "context_assembly",
        output,
        metadata: {
          chapterOutline,
          recentChaptersLoaded: recentChapters.length,
          characterContextLength: characterContext.length,
          worldContextLength: worldContext.length,
          factsRetrieved: relevantFacts.length,
          actScope: currentAct ? currentAct.title : "all",
        },
      };
    },
  },

  // ===== Stage 2: Character Reasoning =====
  {
    stage: "character_reasoning",
    agentName: AGENT_NAMES.CHARACTER_DESIGNER,
    description: "角色推理：分析角色在本章中的动机、情感变化和行为逻辑",
    execute: async (ctx) => {
      const { bookState, chapterNumber, chapterOutline } = ctx;

      const charactersInChapter = chapterOutline?.characters_present ?? [];
      const characterProfiles = bookState.characters.filter(
        (c) => charactersInChapter.includes(c.name) || charactersInChapter.includes(c.id)
      );

      const reasoningPrompts: string[] = [];
      for (const char of characterProfiles) {
        reasoningPrompts.push(`分析角色"${char.name}"在第${chapterNumber}章中的：
- 当前动机：${char.motivations.primary_goal}
- 情感状态：${char.emotional_state.current_mood}
- 与其他角色的关系变化
- 可能的行为逻辑`);
      }

      const messages = [
        { role: "system", content: getAgentPrompt(AGENT_NAMES.CHARACTER_DESIGNER, bookState.meta.genre) },
        {
          role: "user",
          content: `请分析第${chapterNumber}章中角色的行为逻辑和动机链。\n\n章节大纲：${JSON.stringify(chapterOutline, null, 2)}\n\n角色档案：\n${characterProfiles.map((c) => `${c.name}：${c.background.slice(0, 200)}。性格：${c.personality.core_traits.join("、")}`).join("\n")}`,
        },
      ];

      const output = await ctx.llmCall(AGENT_NAMES.CHARACTER_DESIGNER, messages, {
        temperature: 0.4,
        max_tokens: 2000,
      });

      return {
        stage: "character_reasoning",
        output,
        metadata: { charactersInChapter, characterProfiles: characterProfiles.map((c) => c.name) },
      };
    },
  },

  // ===== Stage 3: Writing (核心) =====
  {
    stage: "writing",
    agentName: AGENT_NAMES.PROSE_WRITER,
    description: "正文写作：根据大纲和上下文创作章节正文",
    execute: async (ctx) => {
      const { bookState, chapterNumber, chapterOutline, previousChapterSummary } = ctx;

      // Get the writing prompt
      const targetWords = chapterOutline?.target_words ?? 3000;
      const writingPrompt = buildWritingPrompt({
        chapterOutline: JSON.stringify(chapterOutline, null, 2),
        previousSummary: previousChapterSummary,
        characterContext: bookState.characters
          .filter((c) => chapterOutline?.characters_present.includes(c.name))
          .map((c) => `${c.name}：${c.personality.core_traits.join("、")}，说话方式：${c.voice.vocabulary_level}`)
          .join("\n"),
        worldContext: `世界名：${bookState.world.name}，时代：${bookState.world.era}`,
        specificInstructions: `本章目标字数：${targetWords}字`,
      });

      const messages = [
        { role: "system", content: getAgentPrompt(AGENT_NAMES.PROSE_WRITER, bookState.meta.genre) },
        { role: "user", content: writingPrompt },
      ];

      const output = await ctx.llmCall(AGENT_NAMES.PROSE_WRITER, messages, {
        temperature: 0.8,
        max_tokens: 8192,
      });

      // Save chapter content
      const chaptersDir = join(ctx.bookPath, "chapters");
      await mkdir(chaptersDir, { recursive: true });
      const chapterFile = join(chaptersDir, `chapter_${String(chapterNumber).padStart(4, "0")}.txt`);
      await writeFile(chapterFile, output, "utf-8");

      return {
        stage: "writing",
        output,
        metadata: { wordCount: output.length, savedTo: chapterFile },
      };
    },
  },

  // ===== Stage 4: Event Recording =====
  {
    stage: "event_recording",
    agentName: AGENT_NAMES.EVENT_RECORDER,
    description: "事件记录：提取和记录章节中的关键事件",
    execute: async (ctx) => {
      const chapterContent = ctx.chapterContent ?? ctx.stageResults.get("writing")?.output ?? "";
      if (!chapterContent) {
        return { stage: "event_recording", output: "无内容可记录", metadata: {} };
      }

      const messages = [
        { role: "system", content: getAgentPrompt(AGENT_NAMES.EVENT_RECORDER, ctx.bookState.meta.genre) },
        {
          role: "user",
          content: `请记录第${ctx.chapterNumber}章中的关键事件：\n\n${chapterContent}`,
        },
      ];

      const output = await ctx.llmCall(AGENT_NAMES.EVENT_RECORDER, messages, {
        temperature: 0.3,
        max_tokens: 3000,
      });

      // Save event log — extract JSON from LLM output (may be wrapped in ```json fences)
      const eventsDir = join(ctx.bookPath, "events");
      await mkdir(eventsDir, { recursive: true });

      let jsonStr = output;
      const jsonMatch = output.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      // Validate it's valid JSON; if not, wrap in a fallback structure
      try {
        JSON.parse(jsonStr);
      } catch {
        jsonStr = JSON.stringify({
          events: [],
          character_updates: [],
          foreshadowing: [],
          timeline_updates: [],
          raw: output,
        });
      }

      await writeFile(
        join(eventsDir, `chapter_${String(ctx.chapterNumber).padStart(4, "0")}.json`),
        jsonStr,
        "utf-8"
      );

      return {
        stage: "event_recording",
        output,
      };
    },
  },

  // ===== Stage 5: Fact Check =====
  {
    stage: "fact_check",
    agentName: AGENT_NAMES.FACT_CHECKER,
    description: "事实核查：检查角色、世界、时间线的事实一致性",
    execute: async (ctx) => {
      const chapterContent = ctx.chapterContent ?? ctx.stageResults.get("writing")?.output ?? "";

      const contextInfo = `
角色列表：${ctx.bookState.characters.map((c) => `${c.name}(${c.role})`).join("、")}
世界设定：${ctx.bookState.world.name} - ${ctx.bookState.world.era}
已知势力：${ctx.bookState.world.factions.map((f) => f.name).join("、")}
时间线事件数：${ctx.bookState.timeline.length}
`;

      const messages = [
        { role: "system", content: getAgentPrompt(AGENT_NAMES.FACT_CHECKER, ctx.bookState.meta.genre) },
        {
          role: "user",
          content: `请对第${ctx.chapterNumber}章进行事实核查：\n\n${contextInfo}\n\n章节内容：\n${chapterContent}`,
        },
      ];

      const output = await ctx.llmCall(AGENT_NAMES.FACT_CHECKER, messages, {
        temperature: 0.2,
        max_tokens: 3000,
      });

      return {
        stage: "fact_check",
        output,
      };
    },
  },

  // ===== Stage 6: Continuity Check =====
  {
    stage: "continuity_check",
    agentName: AGENT_NAMES.CONTINUITY_CHECKER,
    description: "连续性检查：确保与前文的衔接和一致性",
    execute: async (ctx) => {
      const chapterContent = ctx.chapterContent ?? ctx.stageResults.get("writing")?.output ?? "";

      const prevSummaries = ctx.bookState.chapters
        .filter((c) => c.number < ctx.chapterNumber && c.summary)
        .map((c) => `第${c.number}章：${c.summary}`)
        .join("\n");

      const messages = [
        { role: "system", content: getAgentPrompt(AGENT_NAMES.CONTINUITY_CHECKER, ctx.bookState.meta.genre) },
        {
          role: "user",
          content: `请检查第${ctx.chapterNumber}章的连续性：\n\n前文概要：\n${prevSummaries || "（无前文概要）"}\n\n本章内容：\n${chapterContent}`,
        },
      ];

      const output = await ctx.llmCall(AGENT_NAMES.CONTINUITY_CHECKER, messages, {
        temperature: 0.2,
        max_tokens: 3000,
      });

      return {
        stage: "continuity_check",
        output,
      };
    },
  },

  // ===== Stage 7: Pacing Check =====
  {
    stage: "pacing_check",
    agentName: AGENT_NAMES.PACING_ANALYST,
    description: "节奏检查：分析和优化章节的阅读节奏",
    execute: async (ctx) => {
      const chapterContent = ctx.chapterContent ?? ctx.stageResults.get("writing")?.output ?? "";

      const messages = [
        { role: "system", content: getAgentPrompt(AGENT_NAMES.PACING_ANALYST, ctx.bookState.meta.genre) },
        {
          role: "user",
          content: `请分析第${ctx.chapterNumber}章的阅读节奏：\n\n${chapterContent}`,
        },
      ];

      const output = await ctx.llmCall(AGENT_NAMES.PACING_ANALYST, messages, {
        temperature: 0.3,
        max_tokens: 2000,
      });

      return {
        stage: "pacing_check",
        output,
      };
    },
  },

  // ===== Stage 8: Character Intelligence Review (★ 核心创新) =====
  {
    stage: "character_intelligence_review",
    agentName: AGENT_NAMES.CHARACTER_REVIEWER,
    description: "★ 角色智能审阅：使用第一人称视角检测角色一致性",
    execute: async (ctx) => {
      const chapterContent = ctx.chapterContent ?? ctx.stageResults.get("writing")?.output ?? "";
      if (!chapterContent) {
        return {
          stage: "character_intelligence_review",
          output: "无内容可审阅",
          metadata: { report: null },
        };
      }

      // Run heuristic-based review first
      const heuristicReport = await reviewCharacterConsistency(
        chapterContent,
        ctx.chapterNumber,
        ctx.bookPath
      );

      // Prepare LLM-based review calls (if LLM is available)
      const llmCalls = await prepareCharacterReviewLLMCall(
        chapterContent,
        ctx.chapterNumber,
        ctx.bookPath
      );

      // Execute LLM reviews for each character
      const llmReports: Array<{ characterId: string; characterName: string; response: string }> = [];
      for (const call of llmCalls) {
        try {
          const messages = [
            { role: "system", content: call.prompt.split("\n\n## 审阅要求")[0] },
            { role: "user", content: call.prompt },
          ];

          const response = await ctx.llmCall(AGENT_NAMES.CHARACTER_REVIEWER, messages, {
            temperature: 0.3,
            max_tokens: 4000,
          });

          llmReports.push({
            characterId: call.characterId,
            characterName: call.characterName,
            response,
          });
        } catch (err) {
          console.error(`[stages] Character review LLM call failed for ${call.characterName}:`, err);
        }
      }

      // Parse LLM responses and merge with heuristic results
      const allViolations = [...heuristicReport.violations];
      for (const report of llmReports) {
        const parsed = parseReviewResponse(
          report.response,
          ctx.chapterNumber,
          report.characterId,
          report.characterName
        );
        allViolations.push(...parsed.violations);
      }

      // Deduplicate violations
      const seen = new Set<string>();
      const dedupedViolations = allViolations.filter((v) => {
        const key = `${v.character_id}_${v.category}_${v.original_text}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Compute final scores
      const charScores: Record<string, number> = {};
      const byChar = new Map<string, typeof dedupedViolations>();
      for (const v of dedupedViolations) {
        const existing = byChar.get(v.character_id) ?? [];
        existing.push(v);
        byChar.set(v.character_id, existing);
      }
      for (const [charId, violations] of byChar) {
        let score = 100;
        for (const v of violations) {
          score -= v.severity === "critical" ? 20 : v.severity === "major" ? 8 : 3;
        }
        charScores[charId] = Math.max(0, Math.min(100, score));
      }

      const overallScore = Object.values(charScores).length > 0
        ? Object.values(charScores).reduce((a, b) => a + b, 0) / Object.values(charScores).length
        : 100;

      const output = JSON.stringify({
        chapter: ctx.chapterNumber,
        total_violations: dedupedViolations.length,
        violations: dedupedViolations,
        overall_consistency_score: Math.round(overallScore),
        character_scores: charScores,
        heuristic_violations: heuristicReport.violations.length,
        llm_violations: dedupedViolations.length - heuristicReport.violations.length,
        reviewed_at: new Date().toISOString(),
      }, null, 2);

      return {
        stage: "character_intelligence_review",
        output,
        metadata: {
          report: {
            chapter: ctx.chapterNumber,
            total_violations: dedupedViolations.length,
            violations: dedupedViolations,
            overall_consistency_score: Math.round(overallScore),
            character_scores: charScores,
          },
        },
      };
    },
  },

  // ===== Stage 9-11: Review Rounds =====
  ...([1, 2, 3].map((round) => ({
    stage: `review_round_${round}` as PipelineStage,
    agentName: AGENT_NAMES.EDITOR,
    description: `第${round}轮审阅：${round === 1 ? "语言和表达" : round === 2 ? "结构和逻辑" : "细节和润色"}`,
    execute: async (ctx: StageContext): Promise<StageResult> => {
      const chapterContent = ctx.chapterContent ?? ctx.stageResults.get("writing")?.output ?? "";

      const reviewFocuses = [
        "语言表达、用词准确性、句式变化",
        "结构逻辑、情节合理性、角色行为一致性",
        "细节描写、氛围营造、最终润色",
      ];

      const messages = [
        { role: "system", content: getAgentPrompt(AGENT_NAMES.EDITOR, ctx.bookState.meta.genre) },
        {
          role: "user",
          content: `请进行第${round}轮审阅，重点关注：${reviewFocuses[round - 1]}\n\n章节内容：\n${chapterContent}`,
        },
      ];

      const output = await ctx.llmCall(AGENT_NAMES.EDITOR, messages, {
        temperature: 0.3,
        max_tokens: 6000,
      });

      return {
        stage: `review_round_${round}` as PipelineStage,
        output,
      };
    },
  } as StageDefinition))),

  // ===== Stage 12: Editing =====
  {
    stage: "editing",
    agentName: AGENT_NAMES.EDITOR,
    description: "最终编辑：根据审阅意见进行修改",
    execute: async (ctx) => {
      const chapterContent = ctx.chapterContent ?? ctx.stageResults.get("writing")?.output ?? "";

      // Collect review results
      const reviewResults: string[] = [];
      for (const stage of ["review_round_1", "review_round_2", "review_round_3"] as PipelineStage[]) {
        const result = ctx.stageResults.get(stage);
        if (result) {
          reviewResults.push(result.output.slice(0, 2000));
        }
      }

      const messages = [
        { role: "system", content: getAgentPrompt(AGENT_NAMES.EDITOR, ctx.bookState.meta.genre) },
        {
          role: "user",
          content: `请根据以下审阅意见修改章节：\n\n审阅意见：\n${reviewResults.join("\n---\n")}\n\n原始章节：\n${chapterContent}\n\n请输出修改后的完整章节。`,
        },
      ];

      const output = await ctx.llmCall(AGENT_NAMES.EDITOR, messages, {
        temperature: 0.5,
        max_tokens: 8192,
      });

      // Save edited version
      const chaptersDir = join(ctx.bookPath, "chapters");
      await mkdir(chaptersDir, { recursive: true });
      const editedFile = join(chaptersDir, `chapter_${String(ctx.chapterNumber).padStart(4, "0")}_edited.txt`);
      await writeFile(editedFile, output, "utf-8");

      return {
        stage: "editing",
        output,
        metadata: { savedTo: editedFile },
      };
    },
  },

  // ===== Stage 13: De-AI =====
  {
    stage: "de_ai",
    agentName: AGENT_NAMES.DE_AI_SPECIALIST,
    description: "去AI化：检测和消除AI写作痕迹",
    execute: async (ctx) => {
      const chapterContent = ctx.stageResults.get("editing")?.output
        ?? ctx.chapterContent
        ?? ctx.stageResults.get("writing")?.output
        ?? "";

      if (!chapterContent) {
        return { stage: "de_ai", output: "无内容可处理" };
      }

      // First, run detection
      const detection = detectAILayers(chapterContent);

      // Then, run rule-based sanitization
      const sanitized = sanitizeText(chapterContent);

      // If there are many violations, use LLM for deeper de-AI
      if (detection.violations.length > 10) {
        const messages = [
          { role: "system", content: getAgentPrompt(AGENT_NAMES.DE_AI_SPECIALIST, ctx.bookState.meta.genre) },
          {
            role: "user",
            content: `请对以下文本进行去AI化处理，消除所有AI写作痕迹：\n\n检测报告：共${detection.violations.length}个问题，AI痕迹得分${detection.overallScore}/100\n\n需要重点修改的问题：\n${detection.violations.slice(0, 10).map((v) => `- [${v.layer_name}] ${v.pattern}：${v.suggestion}`).join("\n")}\n\n原始文本：\n${chapterContent}\n\n请输出去AI化后的完整文本。`,
          },
        ];

        const deAIOutput = await ctx.llmCall(AGENT_NAMES.DE_AI_SPECIALIST, messages, {
          temperature: 0.6,
          max_tokens: 8192,
        });

        // Re-check after LLM de-AI
        const recheck = detectAILayers(deAIOutput);

        return {
          stage: "de_ai",
          output: deAIOutput,
          metadata: {
            before_score: detection.overallScore,
            after_score: recheck.overallScore,
            violations_before: detection.violations.length,
            violations_after: recheck.violations.length,
            sanitized_text: sanitized,
          },
        };
      }

      return {
        stage: "de_ai",
        output: sanitized,
        metadata: {
          detection_result: detection,
          method: "rule-based",
        },
      };
    },
  },

  // ===== Stage 14: Reflector =====
  {
    stage: "reflector",
    agentName: AGENT_NAMES.REFLECTOR,
    description: "反思者：回顾和总结本章创作过程",
    execute: async (ctx) => {
      const finalContent = ctx.stageResults.get("de_ai")?.output
        ?? ctx.stageResults.get("editing")?.output
        ?? ctx.chapterContent
        ?? ctx.stageResults.get("writing")?.output
        ?? "";

      // Collect all stage results for reflection
      const stageSummary: string[] = [];
      for (const [stage, result] of ctx.stageResults) {
        if (stage === "writing") continue; // Skip full content
        stageSummary.push(`${stage}: ${result.output.slice(0, 200)}`);
      }

      const messages = [
        { role: "system", content: getAgentPrompt(AGENT_NAMES.REFLECTOR, ctx.bookState.meta.genre) },
        {
          role: "user",
          content: `请对第${ctx.chapterNumber}章的创作过程进行反思和总结：\n\n各阶段结果摘要：\n${stageSummary.join("\n")}\n\n最终章节内容（前500字）：\n${finalContent.slice(0, 500)}\n\n章节字数：${finalContent.length}字`,
        },
      ];

      const output = await ctx.llmCall(AGENT_NAMES.REFLECTOR, messages, {
        temperature: 0.4,
        max_tokens: 2000,
      });

      return {
        stage: "reflector",
        output,
      };
    },
  },

  // ===== Stage 15: State Sync =====
  {
    stage: "state_sync",
    agentName: AGENT_NAMES.REFLECTOR,
    description: "状态同步：更新书籍状态文件，消费事件记录输出，提取记忆事实，生成章节摘要",
    execute: async (ctx) => {
      const { bookPath, chapterNumber, bookState, chapterOutline } = ctx;
      const finalContent = ctx.stageResults.get("de_ai")?.output
        ?? ctx.stageResults.get("editing")?.output
        ?? ctx.chapterContent
        ?? ctx.stageResults.get("writing")?.output
        ?? "";

      // ── Step 1: Read event recording output from events/chapter_XXXX.json ──
      let eventRecord: any = null;
      try {
        const eventsPath = join(bookPath, "events", `chapter_${String(chapterNumber).padStart(4, "0")}.json`);
        const eventsContent = await readFile(eventsPath, "utf-8");
        eventRecord = JSON.parse(eventsContent);
        console.log(`[stages] Loaded event record for chapter ${chapterNumber}`);
      } catch (err) {
        console.log(`[stages] No event record found for chapter ${chapterNumber}, skipping event-based updates`);
      }

      // ── Step 2: Parse character_updates and update character profiles ──
      if (eventRecord?.character_updates && Array.isArray(eventRecord.character_updates)) {
        for (const update of eventRecord.character_updates) {
          const charIdx = bookState.characters.findIndex(
            (c) => c.name === update.name || c.id === update.id
          );
          if (charIdx >= 0) {
            const char = bookState.characters[charIdx];

            // Update emotional state
            if (update.emotional_state) {
              if (!char.emotional_state.mood_history) {
                char.emotional_state.mood_history = [];
              }
              char.emotional_state.mood_history.push({
                chapter: chapterNumber,
                mood: update.emotional_state.current_mood ?? char.emotional_state.current_mood,
                trigger: update.emotional_state.trigger ?? "chapter events",
              });
              if (update.emotional_state.current_mood) {
                char.emotional_state.current_mood = update.emotional_state.current_mood;
              }
            }

            // Update knowledge boundary
            if (update.knowledge) {
              if (update.knowledge.new_facts) {
                char.knowledge.known_facts.push(...update.knowledge.new_facts);
                if (!char.knowledge.knowledge_timeline) {
                  char.knowledge.knowledge_timeline = {};
                }
                const chapterKey = `chapter_${chapterNumber}`;
                char.knowledge.knowledge_timeline[chapterKey] = [
                  ...(char.knowledge.knowledge_timeline[chapterKey] ?? []),
                  ...update.knowledge.new_facts,
                ];
              }
              if (update.knowledge.new_misconceptions) {
                char.knowledge.misconceptions.push(...update.knowledge.new_misconceptions);
              }
            }

            // Update last appearance
            char.last_appearance = chapterNumber;

            console.log(`[stages] Updated character: ${char.name}`);
          }
        }
      }

      // ── Step 3: Parse foreshadowing changes and update foreshadowing.json ──
      if (eventRecord?.foreshadowing && Array.isArray(eventRecord.foreshadowing)) {
        for (const fsUpdate of eventRecord.foreshadowing) {
          if (fsUpdate.action === "plant") {
            bookState.foreshadowing.push({
              id: fsUpdate.id ?? `fs_${chapterNumber}_${bookState.foreshadowing.length}`,
              planted_chapter: chapterNumber,
              description: fsUpdate.description,
              status: "planted",
              importance: fsUpdate.importance ?? "minor",
              related_characters: fsUpdate.related_characters ?? [],
            });
          } else if (fsUpdate.action === "resolve") {
            const existing = bookState.foreshadowing.find(
              (f) => f.id === fsUpdate.id || f.description.includes(fsUpdate.description)
            );
            if (existing) {
              existing.resolution_chapter = chapterNumber;
              existing.resolution_description = fsUpdate.resolution_description ?? "Resolved in this chapter";
              existing.status = "resolved";
            }
          } else if (fsUpdate.action === "hint") {
            const existing = bookState.foreshadowing.find(
              (f) => f.id === fsUpdate.id || f.description.includes(fsUpdate.description)
            );
            if (existing) {
              existing.status = "hinted";
            }
          }
        }
      }

      // ── Step 4: Parse timeline_updates and update timeline.json ──
      if (eventRecord?.timeline_updates && Array.isArray(eventRecord.timeline_updates)) {
        for (const tlUpdate of eventRecord.timeline_updates) {
          bookState.timeline.push({
            id: tlUpdate.id ?? `tl_${chapterNumber}_${bookState.timeline.length}`,
            chapter: chapterNumber,
            scene: tlUpdate.scene,
            description: tlUpdate.description,
            characters_involved: tlUpdate.characters_involved ?? [],
            location: tlUpdate.location ?? "",
            time_of_day: tlUpdate.time_of_day,
            duration: tlUpdate.duration,
            consequences: tlUpdate.consequences ?? [],
          });
        }
      }

      // ── Step 5: Generate a REAL summary using the reflector agent ──
      let summary: string;
      try {
        const summaryMessages = [
          {
            role: "system",
            content: "你是一个专业的小说编辑。请用2-3句话（50-100字）简洁地总结本章的主要内容、关键事件和情感变化。直接输出总结，不要加前缀。",
          },
          {
            role: "user",
            content: `请总结第${chapterNumber}章的内容（限50-100字）：\n\n${finalContent.slice(0, 3000)}`,
          },
        ];
        summary = await ctx.llmCall(AGENT_NAMES.REFLECTOR, summaryMessages, {
          temperature: 0.3,
          max_tokens: 200,
        });
        if (summary.length > 200) {
          summary = summary.slice(0, 200);
        }
      } catch (err) {
        console.error(`[stages] Failed to generate summary via LLM, falling back to truncation:`, err);
        summary = finalContent.slice(0, 200);
      }

      // ── Update chapter metadata ──
      const chapterMeta: ChapterMeta = {
        number: chapterNumber,
        title: ctx.chapterOutline?.title ?? `第${chapterNumber}章`,
        word_count: finalContent.length,
        status: "draft",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        summary,
        pov_character: ctx.chapterOutline?.pov_character,
        scenes: ctx.chapterOutline?.characters_present ? [{
          id: `scene_${chapterNumber}_1`,
          location: "",
          characters: ctx.chapterOutline.characters_present,
          summary: ctx.chapterOutline.summary,
          word_count: finalContent.length,
        }] : [],
      };

      // Update chapters list
      const existingIdx = bookState.chapters.findIndex((c) => c.number === chapterNumber);
      if (existingIdx >= 0) {
        bookState.chapters[existingIdx] = chapterMeta;
      } else {
        bookState.chapters.push(chapterMeta);
      }

      // Update total word count
      bookState.total_word_count = bookState.chapters.reduce((sum, c) => sum + c.word_count, 0);
      bookState.current_chapter = Math.max(...bookState.chapters.map((c) => c.number)) + 1;

      // ── Save all updated state files ──
      const metaPath = join(bookPath, "meta.json");
      await writeFile(metaPath, JSON.stringify(bookState.meta, null, 2), "utf-8");

      const chaptersPath = join(bookPath, "chapters.json");
      await writeFile(chaptersPath, JSON.stringify(bookState.chapters, null, 2), "utf-8");

      // Save updated characters — write individual files to characters/ directory
      const charsDir = join(bookPath, "characters");
      await mkdir(charsDir, { recursive: true });
      for (const char of bookState.characters) {
        await writeFile(join(charsDir, `${char.id}.json`), JSON.stringify(char, null, 2), "utf-8");
      }

      // Save updated foreshadowing
      const foreshadowingPath = join(bookPath, "foreshadowing.json");
      await writeFile(foreshadowingPath, JSON.stringify(bookState.foreshadowing, null, 2), "utf-8");

      // Save updated timeline
      const timelinePath = join(bookPath, "timeline.json");
      await writeFile(timelinePath, JSON.stringify(bookState.timeline, null, 2), "utf-8");

      // Save reflection
      const reflection = ctx.stageResults.get("reflector");
      if (reflection) {
        const reflectionsDir = join(bookPath, "reflections");
        await mkdir(reflectionsDir, { recursive: true });
        await writeFile(
          join(reflectionsDir, `chapter_${String(chapterNumber).padStart(4, "0")}.md`),
          reflection.output,
          "utf-8"
        );
      }

      // ── Step 6: Extract facts from chapter content and save to memory/facts/ ──
      let extractedFacts: any[] = [];
      if (finalContent) {
        try {
          const factExtractorPrompt = [
            {
              role: "system",
              content: `你是一个专业的小说事实提取器。请从章节内容中提取所有关键事实，按以下JSON格式输出：
{
  "facts": [
    {
      "category": "character|event|world|relationship|emotion",
      "subject": "事实涉及的主体名称",
      "content": "事实内容的简洁描述",
      "evidence": "原文中的关键引文（50字以内）",
      "confidence": 0.9
    }
  ]
}
只输出JSON，不要加任何前缀或解释。每条事实必须有category、subject和content字段。`,
            },
            {
              role: "user",
              content: `请从以下第${chapterNumber}章内容中提取关键事实：\n\n${finalContent.slice(0, 4000)}`,
            },
          ];

          const factsOutput = await ctx.llmCall(AGENT_NAMES.EVENT_RECORDER, factExtractorPrompt, {
            temperature: 0.2,
            max_tokens: 4000,
          });

          // Parse JSON from LLM output (may be wrapped in ```json fences)
          let factsJsonStr = factsOutput;
          const factsJsonMatch = factsOutput.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
          if (factsJsonMatch) {
            factsJsonStr = factsJsonMatch[1];
          }

          try {
            const parsed = JSON.parse(factsJsonStr);
            extractedFacts = (parsed.facts ?? []).map((f: any) => ({
              ...f,
              chapter: chapterNumber,
              extracted_at: new Date().toISOString(),
            }));
          } catch {
            console.warn(`[stages] Failed to parse extracted facts JSON, using raw output`);
            extractedFacts = [{
              category: "event",
              subject: `第${chapterNumber}章`,
              content: factsOutput.slice(0, 200),
              chapter: chapterNumber,
              extracted_at: new Date().toISOString(),
            }];
          }

          // Save facts to memory/facts/
          const factsDir = join(bookPath, "memory", "facts");
          await mkdir(factsDir, { recursive: true });
          await writeFile(
            join(factsDir, `chapter_${String(chapterNumber).padStart(4, "0")}.json`),
            JSON.stringify(extractedFacts, null, 2),
            "utf-8"
          );
          console.log(`[stages] Extracted and saved ${extractedFacts.length} facts for chapter ${chapterNumber}`);
        } catch (err) {
          console.error(`[stages] Fact extraction failed for chapter ${chapterNumber}:`, err);
        }
      }

      // ── Step 7: Save summary to memory/summaries/ ──
      try {
        const summariesDir = join(bookPath, "memory", "summaries");
        await mkdir(summariesDir, { recursive: true });

        const summaryEntry = {
          chapter: chapterNumber,
          summary,
          word_count: finalContent.length,
          created_at: new Date().toISOString(),
        };

        await writeFile(
          join(summariesDir, `chapter_${String(chapterNumber).padStart(4, "0")}.json`),
          JSON.stringify(summaryEntry, null, 2),
          "utf-8"
        );
        console.log(`[stages] Saved summary for chapter ${chapterNumber} to memory/summaries/`);
      } catch (err) {
        console.error(`[stages] Failed to save summary to memory/summaries/:`, err);
      }

      // ── Step 8: Update character states in memory/character_states/ ──
      try {
        const charStatesDir = join(bookPath, "memory", "character_states");
        await mkdir(charStatesDir, { recursive: true });

        // Write character state files for characters that appeared in this chapter
        const charactersInChapter = chapterOutline?.characters_present ?? [];
        for (const charName of charactersInChapter) {
          const char = bookState.characters.find(
            (c) => c.name === charName || c.id === charName
          );
          if (!char) continue;

          const stateEntry = {
            char_id: char.id,
            name: char.name,
            role: char.role,
            emotional_state: char.emotional_state.current_mood,
            mood_history: char.emotional_state.mood_history ?? [],
            known_facts: char.knowledge.known_facts.slice(-20), // last 20 facts
            misconceptions: char.knowledge.misconceptions ?? [],
            relationships: char.relationships.map((r) => ({
              target: r.target_character,
              type: r.relationship_type,
              dynamic: r.dynamic,
              tension: r.current_tension,
            })),
            last_updated: new Date().toISOString(),
            chapter: chapterNumber,
          };

          await writeFile(
            join(charStatesDir, `${char.id}.json`),
            JSON.stringify(stateEntry, null, 2),
            "utf-8"
          );
        }
        console.log(`[stages] Updated character states for ${charactersInChapter.length} characters`);
      } catch (err) {
        console.error(`[stages] Failed to update character states:`, err);
      }

      // ── Step 9: Commit changes to git ──
      try {
        const { commitChanges } = await import("../utils/state-sync.js");
        commitChanges(bookPath, `Chapter ${chapterNumber}: ${chapterMeta.title}`);
        console.log(`[stages] Git commit completed for chapter ${chapterNumber}`);
      } catch (err) {
        console.error(`[stages] Git commit failed:`, err);
      }

      return {
        stage: "state_sync",
        output: `状态已同步。${eventRecord ? "已更新角色、伏笔和时间线。" : ""}提取了${extractedFacts.length}条记忆事实。章节摘要：${summary}`,
        metadata: {
          chapter_number: chapterNumber,
          word_count: finalContent.length,
          total_word_count: bookState.total_word_count,
          summary,
          event_record_consumed: !!eventRecord,
          characters_updated: eventRecord?.character_updates?.length ?? 0,
          foreshadowing_updated: eventRecord?.foreshadowing?.length ?? 0,
          timeline_updated: eventRecord?.timeline_updates?.length ?? 0,
          memory_facts_extracted: extractedFacts.length,
          memory_summaries_saved: true,
          memory_character_states_updated: (chapterOutline?.characters_present ?? []).length,
        },
      };
    },
  },
];

// ---------------------------------------------------------------------------
// Stage lookup helpers
// ---------------------------------------------------------------------------

/**
 * Get a stage definition by name.
 */
export function getStageDefinition(stage: PipelineStage): StageDefinition | undefined {
  return STAGE_DEFINITIONS.find((s) => s.stage === stage);
}

/**
 * Get all stages in execution order.
 */
export function getAllStages(): StageDefinition[] {
  return STAGE_DEFINITIONS;
}

/**
 * Execute a single pipeline stage.
 */
export async function executeStage(
  stage: PipelineStage,
  ctx: StageContext
): Promise<StageResult> {
  const definition = getStageDefinition(stage);
  if (!definition) {
    throw new Error(`Unknown stage: ${stage}`);
  }

  console.log(`[stages] Executing: ${definition.description}`);

  const startTime = Date.now();
  const result = await definition.execute(ctx);
  const elapsed = Date.now() - startTime;

  console.log(`[stages] Completed: ${stage} (${elapsed}ms)`);

  return result;
}
