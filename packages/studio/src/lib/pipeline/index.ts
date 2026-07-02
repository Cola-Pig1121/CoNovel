/**
 * Pipeline orchestrator — manages the 12-stage writing pipeline.
 */

import { api } from '../api';
import { buildWritingContext, formatContextForWriting } from '../context-builder';
import { getLatestSnapshot, getRecentSummaries } from '../memory';
import { runStage, type StageInput, type StageOutput } from './stages';
import { PIPELINE_STAGES, STAGE_PROGRESS, type PipelineStage } from './prompts';

export interface PipelineState {
  bookId: string;
  chapterNumber: number;
  currentStage: PipelineStage | null;
  progress: number;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  stageResults: Record<string, any>;
  errors: string[];
  tokenUsage: { promptTokens: number; completionTokens: number };
  startedAt: string;
  completedAt?: string;
}

export interface PipelineCallbacks {
  onStageStart?: (stage: PipelineStage, progress: number) => void;
  onStageComplete?: (stage: PipelineStage, output: StageOutput, progress: number) => void;
  onError?: (stage: PipelineStage, error: string) => void;
}

/**
 * Run the full writing pipeline for a chapter.
 */
export async function runPipeline(
  bookId: string,
  chapterNumber: number,
  callbacks?: PipelineCallbacks,
): Promise<PipelineState> {
  const state: PipelineState = {
    bookId,
    chapterNumber,
    currentStage: null,
    progress: 0,
    status: 'running',
    stageResults: {},
    errors: [],
    tokenUsage: { promptTokens: 0, completionTokens: 0 },
    startedAt: new Date().toISOString(),
  };

  try {
    // Fetch book state
    const bookState = await api.get<any>(`/api/books/${bookId}`);
    const chaptersData = await api.get<{ chapters: any[] }>(`/api/books/${bookId}/chapters`);
    const currentChapter = chaptersData.chapters?.find(
      (c: any) => c.chapter_number === chapterNumber || c.num === chapterNumber,
    );

    // Get previous chapter for continuity
    let previousContent = '';
    let previousChapterNum = chapterNumber - 1;
    if (previousChapterNum >= 1) {
      try {
        const prevCh = await api.get<any>(`/api/books/${bookId}/chapters/${previousChapterNum}`);
        previousContent = prevCh.content || '';
      } catch {
        // No previous chapter
      }
    }

    // Get memory context
    const [previousSnapshot, recentSummaries] = await Promise.all([
      getLatestSnapshot(bookId),
      getRecentSummaries(bookId, 3),
    ]);

    // Build context
    const contextPacket = await buildWritingContext(
      bookId,
      chapterNumber,
      currentChapter?.outline || '',
      previousSnapshot,
      recentSummaries,
      previousContent,
    );

    // Format context for LLM
    const { system, user } = formatContextForWriting(contextPacket, chapterNumber);

    // Create initial stage input
    const stageInput: StageInput = {
      bookId,
      chapterNumber,
      chapterTitle: currentChapter?.title || `第${chapterNumber}章`,
      chapterContent: currentChapter?.content || '',
      chapterOutline: currentChapter?.outline || '',
      bookState,
      previousSnapshot,
      recentSummaries,
      contextPacket: { system, user },
      previousStageResults: {},
    };

    // Run stages sequentially
    for (const stage of PIPELINE_STAGES) {
      state.currentStage = stage;
      state.progress = STAGE_PROGRESS[stage];
      callbacks?.onStageStart?.(stage, state.progress);

      try {
        const output = await runStage(stage, stageInput);

        // Store result
        state.stageResults[stage] = output.result;
        state.tokenUsage.promptTokens += output.tokenUsage.promptTokens;
        state.tokenUsage.completionTokens += output.tokenUsage.completionTokens;

        // Feed output to next stage's input
        stageInput.previousStageResults[stage] = output.result;

        // Special handling: writing stage produces chapter content
        if (stage === 'writing' && output.result?.text) {
          stageInput.chapterContent = output.result.text;
        }
        if (stage === 'editing' && output.result?.text) {
          stageInput.chapterContent = output.result.text;
        }

        callbacks?.onStageComplete?.(stage, output, state.progress);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        state.errors.push(`${stage}: ${errorMsg}`);
        state.stageResults[stage] = { error: errorMsg };
        callbacks?.onError?.(stage, errorMsg);
      }
    }

    state.status = 'completed';
    state.progress = 100;
    state.completedAt = new Date().toISOString();
  } catch (err: unknown) {
    state.status = 'error';
    const errorMsg = err instanceof Error ? err.message : String(err);
    state.errors.push(errorMsg);
  }

  return state;
}
