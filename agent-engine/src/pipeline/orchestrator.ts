// ============================================================================
// CoNovel Agent Engine — Pipeline Orchestrator
// Manages the execution of the writing pipeline with breakpoint/resume support.
// ============================================================================

import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type {
  PipelineStage,
  PipelineStageState,
  PipelineState,
  BookState,
  ChapterOutline,
} from "../types.js";
import type { VolumeLore } from "../memory/types.js";
import { createMemoryStore } from "../memory/store.js";
import { MemoryConsolidator } from "../memory/consolidator.js";
import {
  STAGE_DEFINITIONS,
  getAllStages,
  executeStage,
  type StageContext,
  type StageResult,
  type LLMCallFunction,
} from "./stages.js";
import { createSharedTools } from "../tools/index.js";

// ---------------------------------------------------------------------------
// Pipeline execution options
// ---------------------------------------------------------------------------

export interface PipelineExecutionOptions {
  bookPath: string;
  chapterNumber: number;
  chapterContent?: string; // Pre-existing content (e.g., from UI editor)
  stages?: PipelineStage[]; // Subset of stages to run (default: all)
  resumeFrom?: PipelineStage; // Resume from this stage
  maxRetries?: number;
  timeoutMs?: number;
  /** If true, only run async (background) stages */
  asyncOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Sync / Async stage split
// ---------------------------------------------------------------------------

/** Stages that run synchronously (user waits for result). */
export const SYNC_STAGES: PipelineStage[] = [
  "context_assembly",
  "character_reasoning",
  "writing",
  "editing",
  "de_ai",
];

/** Stages that run asynchronously in the background after sync completes. */
export const ASYNC_STAGES: PipelineStage[] = [
  "event_recording",
  "fact_check",
  "continuity_check",
  "pacing_check",
  "character_intelligence_review",
  "review_round_1",
  "review_round_2",
  "review_round_3",
  "reflector",
  "state_sync",
];

// ---------------------------------------------------------------------------
// Review early-exit configuration
// ---------------------------------------------------------------------------

/**
 * Thresholds for early-exiting review rounds after round 1.
 * If the review output matches these criteria, rounds 2 and 3 are skipped.
 */
const REVIEW_EARLY_EXIT = {
  /** Maximum number of critical issues allowed to consider review passed */
  maxCriticalIssues: 0,
  /** Maximum number of total issues allowed to consider review passed */
  maxTotalIssues: 3,
  /** Keywords in review output that indicate the review found no problems */
  passKeywords: ["没有发现", "无问题", "质量良好", "无需修改", "质量较高", "no issues", "no critical"],
};

/**
 * Parse review output to determine if it indicates high quality.
 * Returns true if the review found no critical issues (early exit candidate).
 */
function shouldSkipRemainingReviews(reviewOutput: string): boolean {
  if (!reviewOutput) return false;

  // Check for pass keywords
  const lowerOutput = reviewOutput.toLowerCase();
  const hasPassKeyword = REVIEW_EARLY_EXIT.passKeywords.some((kw) =>
    lowerOutput.includes(kw.toLowerCase())
  );
  if (hasPassKeyword) return true;

  // Count critical issues by looking for common patterns in review output
  const criticalPatterns = [
    /严重问题[：:]\s*(\d+)/,
    /critical\s*(?:issues?|problems?)\s*[：:]\s*(\d+)/i,
    /重大问题[：:]\s*(\d+)/,
  ];

  for (const pattern of criticalPatterns) {
    const match = reviewOutput.match(pattern);
    if (match) {
      const count = parseInt(match[1], 10);
      if (count <= REVIEW_EARLY_EXIT.maxCriticalIssues) return true;
    }
  }

  // If the review explicitly says quality is high or no problems
  const qualityPatterns = [
    /整体质量[：:]?\s*(高|良好|优秀|较好)/,
    /overall\s*quality[：:]?\s*(high|good|excellent)/i,
    /总分[：:]?\s*(\d+)/,
  ];

  for (const pattern of qualityPatterns) {
    const match = reviewOutput.match(pattern);
    if (match) return true;
  }

  // Default: don't skip — run all review rounds to be safe
  return false;
}

// ---------------------------------------------------------------------------
// Parallel stage groups (stages that can run concurrently)
// ---------------------------------------------------------------------------

/** Sets of stages that share no dependencies and can execute in parallel. */
const PARALLEL_GROUPS: PipelineStage[][] = [
  ["fact_check", "continuity_check", "pacing_check"],
];

/**
 * Check if a stage is part of a parallel group and return the group.
 */
function findParallelGroup(
  stage: PipelineStage,
  remainingStages: PipelineStage[]
): PipelineStage[] | null {
  for (const group of PARALLEL_GROUPS) {
    if (group.includes(stage)) {
      // Return the intersection of this group with the remaining stages
      // (only stages that haven't been executed yet)
      const runnable = group.filter((s) => remainingStages.includes(s));
      if (runnable.length > 1) return runnable;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Pipeline Orchestrator
// ---------------------------------------------------------------------------

export class PipelineOrchestrator {
  private engine: {
    executeAgent: (
      agentName: string,
      messages: Array<{ role: string; content: string }>,
      options?: { temperature?: number; max_tokens?: number }
    ) => Promise<string>;
    loadBookContext: (bookPath: string) => Promise<BookState>;
    currentBookPath: string | null;
  };

  private currentState: PipelineState | null = null;
  private stageResults: Map<PipelineStage, StageResult> = new Map();

  constructor(engine: {
    executeAgent: (
      agentName: string,
      messages: Array<{ role: string; content: string }>,
      options?: { temperature?: number; max_tokens?: number }
    ) => Promise<string>;
    loadBookContext: (bookPath: string) => Promise<BookState>;
    currentBookPath: string | null;
  }) {
    this.engine = engine;
  }

  /**
   * Execute the full pipeline (or a subset) for a chapter.
   */
  async execute(options: PipelineExecutionOptions): Promise<PipelineState> {
    const {
      bookPath,
      chapterNumber,
      chapterContent,
      stages: requestedStages,
      resumeFrom,
      maxRetries = 2,
      asyncOnly,
    } = options;

    console.log(`[orchestrator] Starting pipeline for chapter ${chapterNumber} from ${bookPath}`);

    // Load book state
    const bookState = await this.engine.loadBookContext(bookPath);

    // Find chapter outline
    const chapterOutline = bookState.outline.chapter_outlines.find(
      (o) => o.chapter_number === chapterNumber
    );

    // Load previous chapter summary
    let previousChapterSummary = "";
    if (chapterNumber > 1) {
      const prevChapter = bookState.chapters.find((c) => c.number === chapterNumber - 1);
      if (prevChapter?.summary) {
        previousChapterSummary = prevChapter.summary;
      } else {
        try {
          const prevPath = join(bookPath, "chapters", `chapter_${String(chapterNumber - 1).padStart(4, "0")}.txt`);
          const content = await readFile(prevPath, "utf-8");
          previousChapterSummary = content.slice(0, 500) + "...";
        } catch {
          // No previous chapter
        }
      }
    }

    // Determine which stages to run
    const allStages = getAllStages();
    let stagesToRun: PipelineStage[];

    if (requestedStages) {
      stagesToRun = requestedStages;
    } else if (asyncOnly) {
      // Only run async (background) stages
      stagesToRun = ASYNC_STAGES;
    } else if (resumeFrom) {
      const resumeIdx = allStages.findIndex((s) => s.stage === resumeFrom);
      stagesToRun = allStages.slice(resumeIdx).map((s) => s.stage);
    } else {
      stagesToRun = allStages.map((s) => s.stage);
    }

    // Initialize pipeline state — preserve if resuming from saved state
    if (!this.currentState) {
      this.currentState = {
        book_path: bookPath,
        chapter_number: chapterNumber,
        stages: stagesToRun.map((stage) => ({
          stage,
          status: "pending" as const,
        })),
        started_at: new Date().toISOString(),
        status: "running",
      };
      this.stageResults = new Map();
    } else {
      // Resuming: mark pipeline as running again
      this.currentState.status = "running";
    }

    // Build the LLM call function — reads tier from agent config for routing
    const llmCall: LLMCallFunction = async (agentName, messages, opts) => {
      console.log(`[orchestrator] LLM call → agent="${agentName}" tier read from agent-config.json`);
      return this.engine.executeAgent(agentName, messages, opts);
    };

    // Instantiate shared tools and build tool registry
    const sharedTools = createSharedTools();
    const toolRegistry: Record<string, (params: any) => Promise<any>> = {};
    for (const tool of sharedTools) {
      toolRegistry[tool.definition.name] = (params: any) =>
        tool.execute(params, { bookPath, chapterNumber });
    }

    // Build stage context
    const baseContext: Omit<StageContext, "stageResults"> = {
      bookPath,
      chapterNumber,
      bookState,
      chapterOutline,
      previousChapterSummary,
      chapterContent,
      llmCall,
      tools: toolRegistry,
    };

    // Execute stages sequentially, with parallel execution for independent groups
    let i = 0;
    while (i < stagesToRun.length) {
      const stageName = stagesToRun[i];

      // Check if this stage is part of a parallel group
      const remainingStages = stagesToRun.slice(i);
      const parallelGroup = findParallelGroup(stageName, remainingStages);

      if (parallelGroup && parallelGroup.length > 1) {
        // Run all stages in the parallel group concurrently
        console.log(`[orchestrator] Parallel group: ${parallelGroup.join(", ")}`);

        const ctx: StageContext = {
          ...baseContext,
          stageResults: this.stageResults,
        };

        const parallelPromises = parallelGroup.map(async (pStage) => {
          const pStageState = this.currentState!.stages.find((s) => s.stage === pStage);
          if (!pStageState) return;

          pStageState.status = "running";
          pStageState.started_at = new Date().toISOString();

          try {
            const result = await executeStage(pStage, ctx);
            this.stageResults.set(pStage, result);
            pStageState.output = result.output;
            pStageState.status = "completed";
            pStageState.completed_at = new Date().toISOString();
            if (result.tokenUsage) {
              pStageState.token_usage = result.tokenUsage;
            }
          } catch (err) {
            const errorMsg = (err as Error).message;
            console.error(`[orchestrator] Parallel stage ${pStage} failed:`, errorMsg);
            pStageState.status = "failed";
            pStageState.error = errorMsg;
            pStageState.completed_at = new Date().toISOString();
          }
        });

        await Promise.all(parallelPromises);

        // Skip past all stages in this parallel group
        i += parallelGroup.length;
      } else {
        // Sequential execution for this stage
        const stageState = this.currentState.stages.find((s) => s.stage === stageName);
        if (!stageState) { i++; continue; }

        console.log(`[orchestrator] Stage: ${stageName}`);

        stageState.status = "running";
        stageState.started_at = new Date().toISOString();

        const ctx: StageContext = {
          ...baseContext,
          stageResults: this.stageResults,
        };

        let retries = 0;
        let success = false;

        while (retries <= maxRetries && !success) {
          try {
            const result = await executeStage(stageName, ctx);

            this.stageResults.set(stageName, result);
            stageState.output = result.output;
            stageState.status = "completed";
            stageState.completed_at = new Date().toISOString();
            if (result.tokenUsage) {
              stageState.token_usage = result.tokenUsage;
            }

            success = true;
          } catch (err) {
            retries++;
            const errorMsg = (err as Error).message;
            console.error(`[orchestrator] Stage ${stageName} failed (attempt ${retries}/${maxRetries + 1}):`, errorMsg);

            if (retries > maxRetries) {
              stageState.status = "failed";
              stageState.error = errorMsg;
              stageState.completed_at = new Date().toISOString();

              // Save pipeline state for resume
              await this.savePipelineState(bookPath, chapterNumber);

              // Don't throw — allow partial pipeline completion
              // But mark pipeline as failed
              this.currentState.status = "failed";
              this.currentState.error = `Stage ${stageName} failed after ${maxRetries + 1} attempts: ${errorMsg}`;
            } else {
              // Wait before retry (exponential backoff)
              await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
            }
          }
        }

        // ── Early exit: skip review_round_2 and review_round_3 if round 1 passed ──
        if (
          stageName === "review_round_1" &&
          success &&
          stageState.output &&
          shouldSkipRemainingReviews(stageState.output)
        ) {
          console.log(`[orchestrator] Review round 1 passed — skipping rounds 2 and 3`);

          for (const skipStage of ["review_round_2", "review_round_3"] as PipelineStage[]) {
            const skipIdx = stagesToRun.indexOf(skipStage);
            if (skipIdx === -1) continue;

            // Mark as skipped in pipeline state
            const skipState = this.currentState!.stages.find((s) => s.stage === skipStage);
            if (skipState) {
              skipState.status = "skipped";
              skipState.completed_at = new Date().toISOString();
              skipState.output = "Skipped: review round 1 passed quality threshold";
            }

            // Record a synthetic stage result so downstream stages (editing) can find it
            this.stageResults.set(skipStage, {
              stage: skipStage,
              output: "Skipped: review round 1 passed quality threshold",
              metadata: { skipped: true, reason: "early_exit" },
            });
          }

          // Advance i past review_round_3
          while (i < stagesToRun.length && stagesToRun[i] !== "editing") {
            i++;
          }
          // Don't increment i further — the next iteration will pick up "editing"
          continue;
        }

        i++;
      }
    }

    // Mark pipeline as completed if all stages succeeded
    if (this.currentState.status === "running") {
      this.currentState.status = "completed";
    }
    this.currentState.completed_at = new Date().toISOString();

    // Save final pipeline state
    await this.savePipelineState(bookPath, chapterNumber);

    console.log(`[orchestrator] Pipeline ${this.currentState.status} for chapter ${chapterNumber}`);
    console.log(`[orchestrator] Results: ${this.stageResults.size} stages completed`);

    // ── Post-pipeline: Memory consolidation ──
    if (this.currentState.status === "completed") {
      try {
        await this.consolidateMemory(bookPath, chapterNumber);
      } catch (err) {
        console.error(`[orchestrator] Memory consolidation failed (non-fatal):`, err);
      }

      // ── Post-pipeline: VolumeLore generation ──
      // Check if the current chapter is the last chapter of any volume
      try {
        for (const act of bookState.outline.act_outlines) {
          if (chapterNumber === act.chapter_range[1]) {
            console.log(
              `[orchestrator] Chapter ${chapterNumber} is the last chapter of volume ${act.act_number} "${act.title}" — generating VolumeLore`
            );

            const memoryStore = createMemoryStore(bookPath);
            const consolidator = new MemoryConsolidator(memoryStore);
            const volumeData = consolidator.generateVolumeLoreData(
              act.act_number,
              act.title,
              act.chapter_range
            );

            // Save placeholder (LLM summary would be generated by reflector agent)
            const volumeLore: VolumeLore = {
              volumeNumber: act.act_number,
              volumeTitle: act.title,
              chapterRange: act.chapter_range,
              summary: `[待生成: 由 Reflector Agent 在下一章开头生成本卷摘要]`,
              keyTurningPoints: volumeData.keyTurningPoints,
              characterGrowth: volumeData.characterGrowth,
              worldChanges: volumeData.worldChanges,
              resolvedForeshadowing: volumeData.resolvedForeshadowing,
              activeForeshadowing: volumeData.activeForeshadowing,
              factCount: volumeData.facts.length,
              createdAt: new Date().toISOString(),
            };
            consolidator.saveVolumeLore(volumeLore);

            console.log(
              `[orchestrator] VolumeLore saved for volume ${act.act_number}: ${volumeData.facts.length} facts compressed`
            );
          }
        }
      } catch (err) {
        console.error(`[orchestrator] VolumeLore generation failed (non-fatal):`, err);
      }
    }

    return this.currentState;
  }

  /**
   * Execute only the synchronous stages (context_assembly → character_reasoning → writing → editing → de_ai).
   * Returns immediately with the result. The caller should invoke `executeAsyncRemaining()`
   * in the background to run the remaining stages.
   */
  async executeSyncOnly(options: PipelineExecutionOptions): Promise<PipelineState> {
    console.log(`[orchestrator] Running SYNC-only pipeline for chapter ${options.chapterNumber}`);

    const syncState = await this.execute({
      ...options,
      stages: SYNC_STAGES,
    });

    console.log(`[orchestrator] Sync pipeline completed — ${syncState.status}`);
    return syncState;
  }

  /**
   * Execute only the async (background) stages.
   * Typically called after `executeSyncOnly()` has completed successfully.
   */
  async executeAsyncRemaining(options: PipelineExecutionOptions): Promise<PipelineState> {
    console.log(`[orchestrator] Running ASYNC pipeline for chapter ${options.chapterNumber}`);

    const asyncState = await this.execute({
      ...options,
      asyncOnly: true,
    });

    console.log(`[orchestrator] Async pipeline completed — ${asyncState.status}`);
    return asyncState;
  }

  /**
   * Consolidate memory: read all facts and summaries, generate long-term memory.
   * This runs after each successful pipeline completion.
   */
  private async consolidateMemory(bookPath: string, _chapterNumber: number): Promise<void> {
    console.log(`[orchestrator] Starting memory consolidation...`);

    // Collect all facts from memory/facts/
    const factsDir = join(bookPath, "memory", "facts");
    let allFacts: any[] = [];
    try {
      const factFiles = await readdir(factsDir);
      for (const file of factFiles) {
        if (!file.endsWith(".json")) continue;
        try {
          const content = await readFile(join(factsDir, file), "utf-8");
          const facts = JSON.parse(content);
          if (Array.isArray(facts)) {
            allFacts.push(...facts);
          }
        } catch {
          // Skip unreadable fact files
        }
      }
    } catch {
      // No facts directory yet
    }

    // Collect all summaries from memory/summaries/
    const summariesDir = join(bookPath, "memory", "summaries");
    let allSummaries: any[] = [];
    try {
      const summaryFiles = await readdir(summariesDir);
      for (const file of summaryFiles) {
        if (!file.endsWith(".json")) continue;
        try {
          const content = await readFile(join(summariesDir, file), "utf-8");
          const summary = JSON.parse(content);
          allSummaries.push(summary);
        } catch {
          // Skip unreadable summary files
        }
      }
    } catch {
      // No summaries directory yet
    }

    // Sort summaries by chapter
    allSummaries.sort((a, b) => (a.chapter ?? 0) - (b.chapter ?? 0));

    // Only consolidate if we have enough data (at least 2 chapters)
    if (allSummaries.length < 2 && allFacts.length < 5) {
      console.log(`[orchestrator] Not enough data for consolidation (${allSummaries.length} summaries, ${allFacts.length} facts). Skipping.`);
      return;
    }

    // Build long-term memory using LLM
    const factsSummary = allFacts.slice(-50).map((f) =>
      `[${f.category ?? 'unknown'}] ${f.subject ?? ''}: ${f.content ?? f.text ?? ''}`
    ).join("\n");

    const summaryChain = allSummaries.map((s) =>
      `第${s.chapter}章: ${s.summary}`
    ).join("\n");

    const longTermPrompt = [
      {
        role: "system",
        content: `你是一个小说记忆整合专家。请根据所有章节的事实和摘要，生成长期记忆。输出JSON格式：
{
  "world_facts": ["事实1", "事实2", ...],
  "active_threads": [
    {"description": "线索描述", "importance": "critical|major|minor", "planted_chapter": 1, "status": "active|resolved"}
  ],
  "style_evolution": "写作风格的演变趋势描述"
}
只输出JSON。world_facts应包含从所有章节中提炼的持久性世界观事实（去重、合并）。
active_threads应包含尚未解决的情节线索。style_evolution应描述写作风格的变化趋势。`,
      },
      {
        role: "user",
        content: `章节数: ${allSummaries.length}\n总事实数: ${allFacts.length}\n\n最近50条事实:\n${factsSummary || '（无）'}\n\n章节摘要链:\n${summaryChain}`,
      },
    ];

    try {
      const llmCall = async (agentName: string, messages: Array<{ role: string; content: string }>, opts?: { temperature?: number; max_tokens?: number }) => {
        return this.engine.executeAgent(agentName, messages, opts);
      };

      const longTermOutput = await llmCall("event_recorder", longTermPrompt, {
        temperature: 0.3,
        max_tokens: 4000,
      });

      // Parse JSON from LLM output
      let longTermJsonStr = longTermOutput;
      const jsonMatch = longTermOutput.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        longTermJsonStr = jsonMatch[1];
      }

      let longTermData: any;
      try {
        longTermData = JSON.parse(longTermJsonStr);
      } catch {
        console.warn(`[orchestrator] Failed to parse long-term memory JSON`);
        longTermData = {
          world_facts: [],
          active_threads: [],
          style_evolution: longTermOutput.slice(0, 500),
        };
      }

      // Add metadata
      longTermData.consolidated_at = new Date().toISOString();
      longTermData.total_facts = allFacts.length;
      longTermData.total_summaries = allSummaries.length;

      // Save to memory/long_term/
      const longTermDir = join(bookPath, "memory", "long_term");
      await mkdir(longTermDir, { recursive: true });
      await writeFile(
        join(longTermDir, "current.json"),
        JSON.stringify(longTermData, null, 2),
        "utf-8"
      );

      // Also save a versioned snapshot
      await writeFile(
        join(longTermDir, `snapshot_${Date.now()}.json`),
        JSON.stringify(longTermData, null, 2),
        "utf-8"
      );

      console.log(`[orchestrator] Memory consolidation complete: ${longTermData.world_facts?.length ?? 0} world facts, ${longTermData.active_threads?.length ?? 0} active threads`);
    } catch (err) {
      console.error(`[orchestrator] Long-term memory generation failed:`, err);
    }
  }

  /**
   * Save pipeline state to disk for resume support.
   */
  private async savePipelineState(bookPath: string, chapterNumber: number): Promise<void> {
    if (!this.currentState) return;

    const pipelineDir = join(bookPath, "pipeline");
    await mkdir(pipelineDir, { recursive: true });

    const stateFile = join(pipelineDir, `chapter_${String(chapterNumber).padStart(4, "0")}_state.json`);
    await writeFile(stateFile, JSON.stringify(this.currentState, null, 2), "utf-8");

    // Also save individual stage results
    for (const [stage, result] of this.stageResults) {
      const resultFile = join(pipelineDir, `chapter_${String(chapterNumber).padStart(4, "0")}_${stage}.json`);
      await writeFile(resultFile, JSON.stringify(result, null, 2), "utf-8");
    }

    console.log(`[orchestrator] Pipeline state saved to ${pipelineDir}`);
  }

  /**
   * Load a previous pipeline state for resume.
   */
  async loadPipelineState(
    bookPath: string,
    chapterNumber: number
  ): Promise<PipelineState | null> {
    const stateFile = join(
      bookPath,
      "pipeline",
      `chapter_${String(chapterNumber).padStart(4, "0")}_state.json`
    );

    try {
      const content = await readFile(stateFile, "utf-8");
      return JSON.parse(content) as PipelineState;
    } catch {
      return null;
    }
  }

  /**
   * Get the last completed stage for a chapter (for resume).
   */
  async getLastCompletedStage(
    bookPath: string,
    chapterNumber: number
  ): Promise<PipelineStage | null> {
    const state = await this.loadPipelineState(bookPath, chapterNumber);
    if (!state) return null;

    // Find the last completed stage
    for (let i = state.stages.length - 1; i >= 0; i--) {
      if (state.stages[i].status === "completed") {
        return state.stages[i].stage;
      }
    }

    return null;
  }

  /**
   * Resume a pipeline from the last completed stage.
   */
  async resume(bookPath: string, chapterNumber: number): Promise<PipelineState | null> {
    const lastStage = await this.getLastCompletedStage(bookPath, chapterNumber);
    if (!lastStage) {
      console.log("[orchestrator] No previous state found, starting fresh");
      return this.execute({ bookPath, chapterNumber });
    }

    console.log(`[orchestrator] Resuming from stage after: ${lastStage}`);

    // Load saved pipeline state so execute() can preserve it
    const savedState = await this.loadPipelineState(bookPath, chapterNumber);
    if (savedState) {
      this.currentState = savedState;
    }

    // Load saved stage results from individual files
    const pipelineDir = join(bookPath, "pipeline");
    const prefix = `chapter_${String(chapterNumber).padStart(4, "0")}_`;
    try {
      const files = await readdir(pipelineDir);
      for (const file of files) {
        if (!file.startsWith(prefix) || file.endsWith("_state.json")) continue;
        // Extract stage name: filename is prefix + stageName + ".json"
        const stagePart = file.slice(prefix.length, -5); // remove prefix and .json
        try {
          const content = await readFile(join(pipelineDir, file), "utf-8");
          const result = JSON.parse(content) as StageResult;
          this.stageResults.set(stagePart as PipelineStage, result);
        } catch {
          // Skip unreadable result files
        }
      }
    } catch {
      // No pipeline directory yet
    }

    return this.execute({ bookPath, chapterNumber, resumeFrom: lastStage });
  }

  /**
   * Get current pipeline state.
   */
  getState(): PipelineState | null {
    return this.currentState;
  }

  /**
   * Get results for a specific stage.
   */
  getStageResult(stage: PipelineStage): StageResult | undefined {
    return this.stageResults.get(stage);
  }

  /**
   * Get all stage results.
   */
  getAllResults(): Map<PipelineStage, StageResult> {
    return new Map(this.stageResults);
  }
}
