import { StateManager } from '../state/manager.js';
import { MemoryManager } from '../memory/manager.js';
import { AgentRegistry } from '../agents/registry.js';
import { AgentRole, AGENT_DEFINITIONS } from '../agents/types.js';
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
import { getAgentLLMConfig, callLLM, LLMConfig } from '../llm/client.js';
import { loadAgentSystemPrompt } from '../llm/instructions.js';

// Agent skill mappings
const AGENT_SKILLS: Record<AgentRole, string[]> = {
  'architect': ['outline-builder', 'character-design'],
  'writer': ['scene-writing', 'webnovel-techniques', 'anti-ai-edit'],
  'character-intelligence': ['character-design'],
  'reviewer': [],
  'editor': ['scene-writing', 'style-calibration'],
  'de-ai-editor': ['anti-ai-edit'],
  'observer': [],
  'character-designer': ['character-design', 'naming'],
  'fact-checker': [],
  'continuity': [],
  'pacing-controller': ['webnovel-techniques'],
  'foreshadowing': [],
  'style-analyzer': ['style-calibration'],
  'radar': [],
  'reflector': [],
};

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
   * 运行Agent - 通过LiteLLM网关调用AI模型
   */
  private async runAgent(role: AgentRole, input: Record<string, unknown>): Promise<AgentStageResult> {
    const startTime = Date.now();
    const bookId = input.bookId as string;

    try {
      // 1. 获取Agent的LLM配置
      const llmConfig = getAgentLLMConfig(role);
      if (!llmConfig) {
        return {
          agentRole: role,
          stage: this.getStageForAgent(role),
          success: false,
          output: '',
          issues: [`Agent ${role} 未配置模型。请在设置页面配置供应商和模型。`],
          duration: Date.now() - startTime,
        };
      }

      // 2. 加载系统提示词（instructions + skills + constraints + style）
      const skills = AGENT_SKILLS[role] || [];
      const systemPrompt = loadAgentSystemPrompt(bookId, role, skills);

      if (!systemPrompt) {
        return {
          agentRole: role,
          stage: this.getStageForAgent(role),
          success: false,
          output: '',
          issues: [`Agent ${role} 无系统提示词`],
          duration: Date.now() - startTime,
        };
      }

      // 3. 构建用户消息
      const userMessage = this.buildUserMessage(role, input);

      // 4. 调用LLM
      const response = await callLLM(llmConfig, systemPrompt, userMessage);

      // 5. 解析输出
      const { output, score, issues } = this.parseAgentOutput(role, response.content);

      const result: AgentStageResult = {
        agentRole: role,
        stage: this.getStageForAgent(role),
        success: true,
        output,
        score,
        issues,
        duration: Date.now() - startTime,
      };

      // Record token usage
      if (response.usage) {
        this.tokenUsage = this.tokenUsage || { prompt: 0, completion: 0 };
        this.tokenUsage.prompt += response.usage.promptTokens;
        this.tokenUsage.completion += response.usage.completionTokens;
      }

      // Record performance
      this.agentRegistry.updatePerformance(role, score || 5, issues);

      return result;
    } catch (error) {
      return {
        agentRole: role,
        stage: this.getStageForAgent(role),
        success: false,
        output: '',
        issues: [`Agent ${role} 执行失败: ${error}`],
        duration: Date.now() - startTime,
      };
    }
  }

  private tokenUsage = { prompt: 0, completion: 0 };

  /**
   * 构建用户消息 - 根据Agent角色组装上下文
   */
  private buildUserMessage(role: AgentRole, input: Record<string, unknown>): string {
    const ctx = input.context as Record<string, any> || {};
    const chapterNum = input.chapterNumber || 'N/A';
    const previousOutput = input.previousOutput as string || '';

    switch (role) {
      case 'character-intelligence':
        return `请基于以下角色档案和情境，推理该角色在此时此地的心理状态和行为反应。

## 角色档案
${ctx.characterProfile || '暂无'}

## 当前情境
${ctx.currentSituation || '暂无'}

## 近期经历
${ctx.recentHistory || '暂无'}

## 人物关系
${ctx.relationshipContext || '暂无'}

请输出：
1. 心理状态分析
2. 行为预测（动作、对话、表情）
3. 与角色设定的一致性检查

直接输出分析结果，不要加标题或序号。`;

      case 'writer':
        return `请创作第${chapterNum}章的正文。

## 章节大纲
${ctx.chapterOutline || '暂无大纲'}

## 前一章摘要
${ctx.previousChapterSummary || '这是第一章'}

## 角色简介
${ctx.characterBriefs || '暂无角色信息'}

## 风格要求
${ctx.styleAnchor || '默认风格'}

## 叙事入口模式
本章使用: ${ctx.entryMode || '默认'}
${ctx.entryMode === 'action_pivot' ? '从进行中的动作开始写。' : ''}
${ctx.entryMode === 'dialogue_opening' ? '从角色对话开始写。' : ''}
${ctx.entryMode === 'sensory_anchor' ? '从一个具体的感官细节开始写。' : ''}
${ctx.entryMode === 'interior_moment' ? '从角色内心的一个清晰想法开始写。' : ''}
${ctx.entryMode === 'consequence_first' ? '从上一章的结果开始写。' : ''}
${ctx.entryMode === 'environment_shift' ? '从场景/天气/时间的变化开始写。' : ''}
${ctx.entryMode === 'close_observation' ? '从一个细微的观察开始写。' : ''}
${ctx.entryMode === 'collision_setup' ? '从即将发生的冲突铺垫开始写。' : ''}

${ctx.reviewFeedback ? `\n## 审阅反馈（请修改以下问题）\n${ctx.reviewFeedback}` : ''}

## 写作要求
- 输出纯小说文本，不要包含分析、注释、元信息
- 段落厚重（200-500字），禁连续3段<90字
- 对话要符合角色性格，动作穿插对话
- 情感优先：每个场景服务明确情感目标
- 剧情加速上限：每章最多1个A/B/C级触发

直接输出小说正文，不要加标题、序号或分析。`;

      case 'reviewer':
        return `请对以下章节进行13维度结构化审阅。

## 章节内容
${previousOutput || ctx.chapterText || '暂无'}

## 章节大纲
${ctx.chapterOutline || '暂无'}

## 角色状态
${ctx.characterStates || '暂无'}

## 审阅维度
1.爽点交付 2.一致性 3.节奏 4.OOC 5.连续性 6.阅读力 7.钩子质量 8.大纲遵循 9.角色声音 10.对话真实性 11.世界观 12.伏笔管理 13.叙事张力

## 输出格式
请用JSON格式输出：
{
  "overallScore": 数字(0-10),
  "verdict": "pass" 或 "conditional_pass" 或 "fail",
  "issues": ["[P0]问题描述", "[P1]问题描述", "[P2]问题描述"],
  "suggestions": ["建议1", "建议2"]
}

P0=必须修复(逻辑矛盾/设定违反)，P1=建议修改(节奏/风格)，P2=可选优化。`;

      case 'de-ai-editor':
        return `请对以下文本进行28项AI痕迹检测和最小修补。

## 待检测文本
${previousOutput || ctx.chapterText || '暂无'}

## 禁词列表
${ctx.bannedWords?.join('、') || '不禁、仿佛、映入眼帘、微微、淡淡、缓缓'}

## 核心原则
修补，不重写。作者优先。回滚闸门。
每个命中项做一次最小修补——删除模板短语，把信息塞回原文语流。
修补率：轻度≤15%，中度≤25%，重度≤35%。

## 输出
修补后的纯文本，不要加任何分析、标记或注释。`;

      case 'editor':
        return `请润色以下章节文本。

## 待润色文本
${previousOutput || ctx.chapterText || '暂无'}

## 风格指南
${ctx.styleGuide || '默认风格'}

## 润色要求
- 保持原文风格和意图
- 优化文字表达和段落结构
- 提升对话自然度
- 不要大幅重写，只做必要修改

直接输出润色后的文本。`;

      default:
        // Generic message for other agents
        const contextStr = Object.entries(ctx)
          .map(([k, v]) => `${k}: ${v}`)
          .filter(([_, v]) => v)
          .join('\n');
        return `任务：${role}\n章节：${chapterNum}\n\n上下文：\n${contextStr || '无额外上下文'}`;
    }
  }

  /**
   * 解析Agent输出 - 提取文本、评分和问题
   */
  private parseAgentOutput(role: AgentRole, rawOutput: string): { output: string; score: number; issues: string[] } {
    // For reviewer, try to parse JSON
    if (role === 'reviewer') {
      try {
        // Try to extract JSON from the output
        const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            output: rawOutput,
            score: parsed.overallScore || 7,
            issues: parsed.issues || [],
          };
        }
      } catch {
        // Not JSON, treat as plain text review
      }
    }

    // For de-ai-editor, the output IS the fixed text
    if (role === 'de-ai-editor') {
      return { output: rawOutput, score: 7, issues: [] };
    }

    // For writer/editor, the output IS the text
    if (role === 'writer' || role === 'editor') {
      return { output: rawOutput, score: 7, issues: [] };
    }

    // Default: output is the response text
    return { output: rawOutput, score: 7, issues: [] };
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
