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

    // Build the LLM call function
    const llmCall: LLMCallFunction = async (agentName, messages, opts) => {
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

    return this.currentState;
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
