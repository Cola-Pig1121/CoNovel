import { AgentConfig, AgentResult, AgentRole } from './types.js';

/**
 * BaseAgent - Agent基类
 *
 * 所有Agent的抽象基类，定义了Agent的生命周期和基本接口。
 */
export abstract class BaseAgent {
  protected config: AgentConfig;
  protected isRunning: boolean = false;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  get role(): AgentRole {
    return this.config.role;
  }

  get name(): string {
    return this.config.nameZh;
  }

  get enabled(): boolean {
    return this.config.enabled;
  }

  /**
   * 执行Agent任务 - 子类必须实现
   */
  abstract execute(input: AgentInput): Promise<AgentResult>;

  /**
   * 验证输入参数 - 子类可覆盖
   */
  protected validateInput(input: AgentInput): boolean {
    return !!input.context;
  }

  /**
   * 构建系统提示词 - 结合instructions和上下文
   */
  protected buildSystemPrompt(): string {
    return this.config.instructions;
  }

  /**
   * 记录性能数据
   */
  protected async recordPerformance(result: AgentResult): Promise<void> {
    // Performance tracking is handled by EvolutionEngine
    // This is a hook for subclasses if needed
  }
}

// ===== Agent Input Types =====

export interface AgentInput {
  context: Record<string, unknown>;
  bookId: string;
  chapterNumber?: number;
  previousOutput?: string; // Output from previous pipeline stage
  metadata?: Record<string, unknown>;
}

// ===== Specialized Input Types =====

export interface WriterInput extends AgentInput {
  context: {
    chapterOutline: string;
    previousChapterSummary: string;
    characterBriefs: string;
    novelPlanExcerpt: string;
    styleAnchor: string;
    entryMode: string;
    characterIntelOutput?: string; // From Character Intelligence Agent
  };
}

export interface ReviewerInput extends AgentInput {
  context: {
    chapterText: string;
    chapterOutline: string;
    previousChapter: string;
    characterStates: string;
    foreshadowingStatus: string;
    timelineEvents: string;
  };
}

export interface CharacterIntelligenceInput extends AgentInput {
  context: {
    characterProfile: string;
    currentSituation: string;
    recentHistory: string;
    relationshipContext: string;
    emotionalState: string;
  };
}

export interface FactCheckerInput extends AgentInput {
  context: {
    chapterText: string;
    knownFacts: string;
    characterStates: string;
    timeline: string;
  };
}

export interface EditorInput extends AgentInput {
  context: {
    chapterText: string;
    styleGuide: string;
    reviewIssues: string[];
  };
}

export interface DeAIInput extends AgentInput {
  context: {
    chapterText: string;
    bannedWords: string[];
    aiPatterns: string[];
  };
}

export interface PacingInput extends AgentInput {
  context: {
    chapterText: string;
    recentChaptersSummary: string;
    targetPacing: string;
    eventDensity: number;
  };
}
