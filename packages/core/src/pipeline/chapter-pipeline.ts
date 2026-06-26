import { StateManager } from '../state/manager.js';
import { MemoryManager } from '../memory/manager.js';
import { AgentRegistry } from '../agents/registry.js';
import { AgentRole } from '../agents/types.js';
import {
  PipelineStage,
  PipelineResult,
  PipelineConfig,
  DEFAULT_PIPELINE_CONFIG,
  AgentStageResult,
  AssembledContext,
  QualityGate,
} from './types.js';
import { ChapterState } from '../state/types.js';

/**
 * ChapterPipeline - 章节创作流水线
 *
 * 协调多个Agent完成从上下文组装到状态同步的完整章节创作流程。
 * 包含5层质量门禁和自动重试机制。
 */
export class ChapterPipeline {
  private stateManager: StateManager;
  private memoryManager: MemoryManager;
  private agentRegistry: AgentRegistry;
  private config: PipelineConfig;

  constructor(
    stateManager: StateManager,
    memoryManager: MemoryManager,
    agentRegistry: AgentRegistry,
    config: Partial<PipelineConfig> = {}
  ) {
    this.stateManager = stateManager;
    this.memoryManager = memoryManager;
    this.agentRegistry = agentRegistry;
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };
  }

  /**
   * 执行完整的章节创作流水线
   */
  async execute(bookId: string, chapterNumber: number): Promise<PipelineResult> {
    const startTime = Date.now();
    const agentResults: AgentStageResult[] = [];
    const gateStatus: QualityGate = {
      l1_memorySync: false,
      l2_factCheck: false,
      l3_continuity: false,
      l4_styleCalibration: false,
      l5_deAi: false,
    };

    let chapterState: ChapterState = {
      chapterNumber,
      bookId,
      wordCount: 0,
      status: 'context_assembled',
      qualityGate: gateStatus,
      agentScores: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let finalOutput = '';
    let reviewRound = 0;

    try {
      // ===== Stage 1: Context Assembly =====
      const context = await this.assembleContext(bookId, chapterNumber);
      chapterState.status = 'context_assembled';
      await this.stateManager.saveChapterState(chapterState);

      // ===== Stage 2: Character Intelligence =====
      if (this.isAgentEnabled('character-intelligence')) {
        const ciResult = await this.runAgent('character-intelligence', {
          context: {
            characterProfile: context.characterBriefs,
            currentSituation: context.chapterOutline,
            recentHistory: context.previousChapterSummary,
            relationshipContext: context.foreshadowingStatus,
            emotionalState: '',
          },
          bookId,
          chapterNumber,
        });
        agentResults.push(ciResult);
        if (ciResult.score) chapterState.agentScores['character-intelligence'] = ciResult.score;
      }

      // ===== Stage 3: Writing =====
      const writerResult = await this.runAgent('writer', {
        context: {
          chapterOutline: context.chapterOutline,
          previousChapterSummary: context.previousChapterSummary,
          characterBriefs: context.characterBriefs,
          novelPlanExcerpt: context.novelPlanExcerpt,
          styleAnchor: context.styleAnchor,
          entryMode: context.entryMode,
        },
        bookId,
        chapterNumber,
      });
      agentResults.push(writerResult);
      finalOutput = writerResult.output;
      chapterState.status = 'drafted';
      chapterState.wordCount = this.estimateWordCount(finalOutput);
      await this.stateManager.saveChapterState(chapterState);

      // ===== Stage 4: Observation =====
      if (this.isAgentEnabled('observer')) {
        const obsResult = await this.runAgent('observer', {
          context: { chapterText: finalOutput, chapterOutline: context.chapterOutline },
          bookId,
          chapterNumber,
          previousOutput: finalOutput,
        });
        agentResults.push(obsResult);
      }

      // ===== Stage 5-7: Quality Checks (Parallel) =====
      const checkPromises: Promise<AgentStageResult>[] = [];

      if (this.isAgentEnabled('fact-checker')) {
        checkPromises.push(this.runAgent('fact-checker', {
          context: {
            chapterText: finalOutput,
            knownFacts: context.worldSettings,
            characterStates: context.characterBriefs,
            timeline: context.timelineEvents,
          },
          bookId,
          chapterNumber,
          previousOutput: finalOutput,
        }));
      }

      if (this.isAgentEnabled('continuity')) {
        checkPromises.push(this.runAgent('continuity', {
          context: {
            chapterText: finalOutput,
            previousChapter: context.previousChapterSummary,
            characterStates: context.characterBriefs,
            foreshadowingStatus: context.foreshadowingStatus,
          },
          bookId,
          chapterNumber,
          previousOutput: finalOutput,
        }));
      }

      if (this.isAgentEnabled('pacing-controller')) {
        checkPromises.push(this.runAgent('pacing-controller', {
          context: {
            chapterText: finalOutput,
            recentChaptersSummary: context.previousChapterSummary,
            targetPacing: 'balanced',
            eventDensity: 0.5,
          },
          bookId,
          chapterNumber,
          previousOutput: finalOutput,
        }));
      }

      const checkResults = await Promise.all(checkPromises);
      agentResults.push(...checkResults);

      // ===== Stage 8: Review =====
      let needsRewrite = false;
      for (let round = 0; round < this.config.maxReviewRounds; round++) {
        const reviewResult = await this.runAgent('reviewer', {
          context: {
            chapterText: finalOutput,
            chapterOutline: context.chapterOutline,
            previousChapter: context.previousChapterSummary,
            characterStates: context.characterBriefs,
            foreshadowingStatus: context.foreshadowingStatus,
            timelineEvents: context.timelineEvents,
          },
          bookId,
          chapterNumber,
          previousOutput: finalOutput,
        });
        agentResults.push(reviewResult);

        // Check if rewrite is needed
        if (reviewResult.issues && reviewResult.issues.length > 0) {
          const criticalIssues = reviewResult.issues.filter(i => i.startsWith('[P0]'));
          if (criticalIssues.length > 0 && reviewRound < this.config.maxRewriteRounds) {
            // Rewrite
            const rewriteResult = await this.runAgent('writer', {
              context: {
                chapterOutline: context.chapterOutline,
                previousChapterSummary: context.previousChapterSummary,
                characterBriefs: context.characterBriefs,
                novelPlanExcerpt: context.novelPlanExcerpt,
                styleAnchor: context.styleAnchor,
                entryMode: context.entryMode,
                reviewFeedback: reviewResult.issues.join('\n'),
              },
              bookId,
              chapterNumber,
              previousOutput: finalOutput,
            });
            finalOutput = rewriteResult.output;
            reviewRound++;
            needsRewrite = true;
          } else {
            // Log non-critical issues and continue
            for (const issue of reviewResult.issues) {
              if (!issue.startsWith('[P0]')) {
                console.log(`[Review] Non-critical issue: ${issue}`);
              }
            }
          }
        } else {
          break; // No issues, proceed
        }
      }

      chapterState.status = 'reviewed';

      // ===== Stage 9: Editing =====
      if (this.isAgentEnabled('editor')) {
        const editResult = await this.runAgent('editor', {
          context: {
            chapterText: finalOutput,
            styleGuide: context.styleAnchor,
            reviewIssues: agentResults
              .filter(r => r.agentRole === 'reviewer')
              .flatMap(r => r.issues || []),
          },
          bookId,
          chapterNumber,
          previousOutput: finalOutput,
        });
        agentResults.push(editResult);
        finalOutput = editResult.output;
      }

      // ===== Stage 10: De-AI =====
      if (this.isAgentEnabled('de-ai-editor')) {
        const deaiResult = await this.runAgent('de-ai-editor', {
          context: {
            chapterText: finalOutput,
            bannedWords: [],
            aiPatterns: [],
          },
          bookId,
          chapterNumber,
          previousOutput: finalOutput,
        });
        agentResults.push(deaiResult);
        finalOutput = deaiResult.output;
        gateStatus.l5_deAi = true;
      }

      // ===== Stage 11: Reflector =====
      if (this.isAgentEnabled('reflector')) {
        const reflectResult = await this.runAgent('reflector', {
          context: {
            chapterText: finalOutput,
            agentResults: agentResults.map(r => `${r.agentRole}: ${r.output}`).join('\n'),
            pipelineDuration: Date.now() - startTime,
          },
          bookId,
          chapterNumber,
          previousOutput: finalOutput,
        });
        agentResults.push(reflectResult);
      }

      // ===== Stage 12: State Sync =====
      gateStatus.l1_memorySync = true;
      gateStatus.l2_factCheck = agentResults.some(r => r.agentRole === 'fact-checker' && r.success);
      gateStatus.l3_continuity = agentResults.some(r => r.agentRole === 'continuity' && r.success);
      gateStatus.l4_styleCalibration = agentResults.some(r => r.agentRole === 'style-analyzer' && r.success);

      chapterState.status = 'completed';
      chapterState.qualityGate = gateStatus;
      chapterState.updatedAt = new Date().toISOString();
      await this.stateManager.saveChapterState(chapterState);

      return {
        bookId,
        chapterNumber,
        stage: 'state_sync',
        success: true,
        output: finalOutput,
        gateStatus,
        agentResults,
        duration: Date.now() - startTime,
        wordCount: chapterState.wordCount,
      };
    } catch (error) {
      chapterState.status = 'drafted';
      chapterState.updatedAt = new Date().toISOString();
      await this.stateManager.saveChapterState(chapterState);

      return {
        bookId,
        chapterNumber,
        stage: 'state_sync',
        success: false,
        output: finalOutput,
        gateStatus,
        agentResults,
        duration: Date.now() - startTime,
        wordCount: chapterState.wordCount,
      };
    }
  }

  /**
   * 组装上下文 - 从状态和记忆中提取当前章节需要的所有信息
   */
  private async assembleContext(bookId: string, chapterNumber: number): Promise<AssembledContext> {
    const state = await this.stateManager.loadState(bookId);

    // Get chapter outline
    let chapterOutline = '';
    for (const volume of state.outline.volumes) {
      const chapter = volume.chapters.find(c => c.chapterNumber === chapterNumber);
      if (chapter) {
        chapterOutline = `标题: ${chapter.title || '未命名'}\n摘要: ${chapter.summary}\n核心事件: ${chapter.coreEvent}\n目标情感: ${chapter.targetEmotion}\n钩子: ${chapter.hooks.join(', ')}\n角色: ${chapter.characters.join(', ')}\n地点: ${chapter.location}\n目标字数: ${chapter.wordTarget}`;
        break;
      }
    }

    // Get previous chapter summary
    let previousChapterSummary = '';
    if (chapterNumber > 1) {
      const prevState = await this.stateManager.loadChapterState(bookId, chapterNumber - 1);
      if (prevState) {
        previousChapterSummary = `第${chapterNumber - 1}章完成，字数: ${prevState.wordCount}`;
      }
    }

    // Get character briefs
    const characterBriefs = state.characters
      .map(c => `${c.name} (${c.role}): ${c.personality.join(', ')}. 背景: ${c.background}. 目标: ${c.goals.join(', ')}`)
      .join('\n');

    // Get novel plan excerpt
    const novelPlanExcerpt = state.outline.volumes
      .map(v => `卷${v.volumeNumber} ${v.title}: ${v.summary}`)
      .join('\n');

    // Get style anchor
    const styleMemory = await this.memoryManager.getStyleMemory(bookId);
    const styleAnchor = styleMemory?.styleAnchor || '默认风格';

    // Get foreshadowing status
    const overdue = await this.stateManager.getOverdueForeshadowing(bookId, chapterNumber);
    const activeForeshadowing = state.foreshadowing.filter(f => f.status !== 'resolved');
    const foreshadowingStatus = `活跃伏笔 (${activeForeshadowing.length}):\n` +
      activeForeshadowing.map(f => `- ${f.description} (植入于第${f.plantedIn}章, 紧迫度: ${f.urgency})`).join('\n') +
      (overdue.length > 0 ? `\n逾期伏笔 (${overdue.length}):\n` +
        overdue.map(f => `- ${f.description} (已逾期)`).join('\n') : '');

    // Get timeline events for recent chapters
    const recentEvents = state.timeline
      .filter(e => e.chapterNumber >= chapterNumber - 3 && e.chapterNumber <= chapterNumber)
      .map(e => `第${e.chapterNumber}章: ${e.description} (${e.location}, ${e.significance})`)
      .join('\n');

    // Get world settings
    const worldSettings = Object.entries(state.worldSettings)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    // Select entry mode based on chapter number
    const entryModes = [
      'action_pivot',       // 从进行中的动作开始
      'dialogue_opening',   // 从角色对话开始
      'sensory_anchor',     // 从感官细节开始
      'interior_moment',    // 从角色内心独白开始
      'consequence_first',  // 从上一章的结果开始
      'environment_shift',  // 从场景/天气/时间变化开始
      'close_observation',  // 从细微观察开始
      'collision_setup',    // 从即将发生的冲突铺垫开始
    ];
    const entryMode = entryModes[chapterNumber % entryModes.length];

    return {
      chapterOutline,
      previousChapterSummary,
      characterBriefs,
      novelPlanExcerpt,
      styleAnchor,
      foreshadowingStatus,
      timelineEvents: recentEvents,
      worldSettings,
      entryMode,
    };
  }

  /**
   * 运行Agent
   */
  private async runAgent(role: AgentRole, input: Record<string, unknown>): Promise<AgentStageResult> {
    const startTime = Date.now();
    const config = this.agentRegistry.getConfig(role);

    try {
      // In production, this would call the AI model via Vercel AI Gateway
      // For now, we return a placeholder
      const output = `[${config.nameZh}] Agent execution placeholder for chapter ${input.chapterNumber || 'N/A'}`;

      const result: AgentStageResult = {
        agentRole: role,
        stage: this.getStageForAgent(role),
        success: true,
        output,
        score: 7,
        issues: [],
        duration: Date.now() - startTime,
      };

      // Record performance
      this.agentRegistry.updatePerformance(role, result.score || 5, result.issues);

      return result;
    } catch (error) {
      return {
        agentRole: role,
        stage: this.getStageForAgent(role),
        success: false,
        output: '',
        issues: [`Agent execution failed: ${error}`],
        duration: Date.now() - startTime,
      };
    }
  }

  private getStageForAgent(role: AgentRole): PipelineStage {
    const stageMap: Record<AgentRole, PipelineStage> = {
      'architect': 'context_assembly',
      'writer': 'writing',
      'character-intelligence': 'character_intelligence',
      'reviewer': 'review',
      'editor': 'editing',
      'observer': 'observation',
      'character-designer': 'context_assembly',
      'style-analyzer': 'context_assembly',
      'fact-checker': 'fact_check',
      'continuity': 'continuity_check',
      'pacing-controller': 'pacing_check',
      'foreshadowing': 'context_assembly',
      'de-ai-editor': 'de_ai',
      'radar': 'context_assembly',
      'reflector': 'reflector',
    };
    return stageMap[role];
  }

  private isAgentEnabled(role: AgentRole): boolean {
    try {
      return this.agentRegistry.getConfig(role).enabled;
    } catch {
      return false;
    }
  }

  private estimateWordCount(text: string): number {
    // Count Chinese characters and words
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    return chineseChars + englishWords;
  }
}
