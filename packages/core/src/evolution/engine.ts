import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import {
  FeedbackRecord,
  EvolutionStrategy,
  StyleEvolution,
  AgentLearningRecord,
} from './types.js';
import { MemoryManager } from '../memory/manager.js';
import { AgentRegistry } from '../agents/registry.js';
import { AgentRole } from '../agents/types.js';

/**
 * EvolutionEngine - 自进化引擎
 *
 * 实现两大进化机制：
 * 1. 反馈学习系统 - 基于审阅反馈调整Agent策略
 * 2. 风格记忆系统 - 提取和追踪写作风格进化
 */
export class EvolutionEngine {
  private stateDir: string;
  private memoryManager: MemoryManager;
  private agentRegistry: AgentRegistry;
  private feedbacks: Map<string, FeedbackRecord[]> = new Map(); // bookId -> records
  private strategies: EvolutionStrategy[] = [];
  private learningRecords: AgentLearningRecord[] = [];

  constructor(
    stateDir: string,
    memoryManager: MemoryManager,
    agentRegistry: AgentRegistry
  ) {
    this.stateDir = stateDir;
    this.memoryManager = memoryManager;
    this.agentRegistry = agentRegistry;

    const evoDir = join(stateDir, 'evolution');
    if (!existsSync(evoDir)) mkdirSync(evoDir, { recursive: true });

    this.loadData();
  }

  // ===== Feedback Learning System =====

  /**
   * 记录反馈
   */
  async recordFeedback(feedback: Omit<FeedbackRecord, 'id' | 'timestamp'>): Promise<FeedbackRecord> {
    const record: FeedbackRecord = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      ...feedback,
    };

    if (!this.feedbacks.has(feedback.bookId)) {
      this.feedbacks.set(feedback.bookId, []);
    }
    this.feedbacks.get(feedback.bookId)!.push(record);

    // Update agent performance in registry
    this.agentRegistry.updatePerformance(
      feedback.agentRole as AgentRole,
      feedback.score,
      feedback.issues
    );

    // Record in memory manager
    await this.memoryManager.recordAgentScore(
      feedback.agentRole,
      parseInt(feedback.chapterId) || 0,
      feedback.score,
      feedback.issues,
      0 // duration not tracked here
    );

    this.saveData();
    return record;
  }

  /**
   * 分析反馈趋势
   */
  async analyzeFeedbackTrend(
    bookId: string,
    agentRole: string,
    lastNChapters: number = 10
  ): Promise<{
    trend: 'improving' | 'stable' | 'declining';
    avgScore: number;
    commonIssues: Array<{ issue: string; count: number }>;
    recommendations: string[];
  }> {
    const records = (this.feedbacks.get(bookId) || [])
      .filter(r => r.agentRole === agentRole)
      .slice(-lastNChapters);

    if (records.length === 0) {
      return {
        trend: 'stable',
        avgScore: 5,
        commonIssues: [],
        recommendations: ['需要更多章节数据来分析趋势'],
      };
    }

    const avgScore = records.reduce((a, b) => a + b.score, 0) / records.length;

    // Calculate trend
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (records.length >= 6) {
      const recent = records.slice(-3).map(r => r.score);
      const previous = records.slice(-6, -3).map(r => r.score);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;

      if (recentAvg > previousAvg + 0.5) trend = 'improving';
      else if (recentAvg < previousAvg - 0.5) trend = 'declining';
    }

    // Count common issues
    const issueCounts: Record<string, number> = {};
    for (const record of records) {
      for (const issue of record.issues) {
        issueCounts[issue] = (issueCounts[issue] || 0) + 1;
      }
    }
    const commonIssues = Object.entries(issueCounts)
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Generate recommendations
    const recommendations = this.generateRecommendations(agentRole, trend, commonIssues, avgScore);

    return { trend, avgScore, commonIssues, recommendations };
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(
    agentRole: string,
    trend: string,
    commonIssues: Array<{ issue: string; count: number }>,
    avgScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (trend === 'declining') {
      recommendations.push(`⚠️ ${agentRole} 性能下降，建议审查最近的提示词修改`);
    }

    if (avgScore < 5) {
      recommendations.push(`📊 ${agentRole} 平均得分较低 (${avgScore.toFixed(1)})，建议调整策略`);
    }

    for (const { issue, count } of commonIssues.slice(0, 3)) {
      if (count >= 3) {
        recommendations.push(`🔄 常见问题"${issue}"出现${count}次，建议在提示词中添加针对性约束`);
      }
    }

    if (recommendations.length === 0) {
      recommendations.push(`✅ ${agentRole} 表现良好，保持当前策略`);
    }

    return recommendations;
  }

  /**
   * 自动进化策略生成
   */
  async generateEvolutionStrategy(
    agentRole: AgentRole,
    bookId: string
  ): Promise<EvolutionStrategy> {
    const trend = await this.analyzeFeedbackTrend(bookId, agentRole);

    let strategy = '';
    const promptAdjustments: Record<string, string> = {};
    const weightChanges: Record<string, number> = {};

    if (trend.trend === 'declining' && trend.commonIssues.length > 0) {
      // Focus on most common issue
      const topIssue = trend.commonIssues[0];
      strategy = `针对常见问题"${topIssue.issue}"添加专门约束，提升该维度权重`;
      promptAdjustments[`avoid_${topIssue.issue.replace(/\s+/g, '_')}`] =
        `特别注意避免: ${topIssue.issue}`;
      weightChanges[topIssue.issue] = 0.1;
    } else if (trend.avgScore > 8) {
      // Already performing well, try minor refinements
      strategy = '当前表现优秀，尝试微调以探索更好效果';
    } else {
      // Stable performance, focus on gradual improvement
      strategy = '保持当前策略，关注低分维度的渐进式提升';
      for (const { issue } of trend.commonIssues.slice(0, 2)) {
        promptAdjustments[`focus_${issue.replace(/\s+/g, '_')}`] =
          `重点关注改进: ${issue}`;
      }
    }

    const evolution: EvolutionStrategy = {
      agentRole,
      strategy,
      promptAdjustments,
      weightChanges,
      appliedAt: new Date().toISOString(),
    };

    this.strategies.push(evolution);
    this.saveData();

    return evolution;
  }

  // ===== Style Memory System =====

  /**
   * 分析风格进化
   */
  async analyzeStyleEvolution(
    bookId: string,
    fromChapter: number,
    toChapter: number
  ): Promise<StyleEvolution> {
    const styleMemory = await this.memoryManager.getStyleMemory(bookId);

    const changes: StyleEvolution['changes'] = [];
    const successfulExperiments: StyleEvolution['successfulExperiments'] = [];

    if (styleMemory && styleMemory.fingerprints.length >= 2) {
      const fromFp = styleMemory.fingerprints.find(f => f.chapterNumber === fromChapter);
      const toFp = styleMemory.fingerprints.find(f => f.chapterNumber === toChapter);

      if (fromFp && toFp) {
        // Compare sentence patterns
        changes.push({
          metric: '平均句长',
          fromValue: fromFp.sentencePatterns.avgLength,
          toValue: toFp.sentencePatterns.avgLength,
          description: `从 ${fromFp.sentencePatterns.avgLength.toFixed(1)} 变为 ${toFp.sentencePatterns.avgLength.toFixed(1)}`,
        });

        // Compare dialogue ratio
        changes.push({
          metric: '对话比例',
          fromValue: fromFp.paragraphRhythm.dialogueRatio,
          toValue: toFp.paragraphRhythm.dialogueRatio,
          description: `从 ${(fromFp.paragraphRhythm.dialogueRatio * 100).toFixed(1)}% 变为 ${(toFp.paragraphRhythm.dialogueRatio * 100).toFixed(1)}%`,
        });

        // Compare AI pattern score
        changes.push({
          metric: 'AI痕迹分数',
          fromValue: fromFp.aiPatternScore,
          toValue: toFp.aiPatternScore,
          description: `从 ${fromFp.aiPatternScore.toFixed(2)} 变为 ${toFp.aiPatternScore.toFixed(2)}`,
        });
      }

      // Find successful experiments
      if (styleMemory.successfulExperiments) {
        successfulExperiments.push(
          ...styleMemory.successfulExperiments.filter(
            e => e.chapterNumber >= fromChapter && e.chapterNumber <= toChapter
          )
        );
      }
    }

    const evolution: StyleEvolution = {
      bookId,
      chapterRange: { from: fromChapter, to: toChapter },
      changes,
      successfulExperiments,
      timestamp: new Date().toISOString(),
    };

    return evolution;
  }

  /**
   * 记录学习成果
   */
  async recordLearning(record: Omit<AgentLearningRecord, 'createdAt'>): Promise<AgentLearningRecord> {
    const fullRecord: AgentLearningRecord = {
      ...record,
      createdAt: new Date().toISOString(),
    };

    this.learningRecords.push(fullRecord);
    this.saveData();

    return fullRecord;
  }

  /**
   * 获取Agent的学习记录
   */
  getLearningRecords(agentRole: string, limit: number = 20): AgentLearningRecord[] {
    return this.learningRecords
      .filter(r => r.agentRole === agentRole)
      .slice(-limit);
  }

  /**
   * 获取进化统计
   */
  getEvolutionStats(bookId: string): {
    totalFeedbacks: number;
    avgScore: number;
    activeStrategies: number;
    totalLearnings: number;
  } {
    const bookFeedbacks = this.feedbacks.get(bookId) || [];
    const avgScore = bookFeedbacks.length > 0
      ? bookFeedbacks.reduce((a, b) => a + b.score, 0) / bookFeedbacks.length
      : 0;

    return {
      totalFeedbacks: bookFeedbacks.length,
      avgScore,
      activeStrategies: this.strategies.length,
      totalLearnings: this.learningRecords.length,
    };
  }

  // ===== Persistence =====

  private loadData(): void {
    const feedbackPath = join(this.stateDir, 'evolution', 'feedbacks.json');
    if (existsSync(feedbackPath)) {
      const raw = readFileSync(feedbackPath, 'utf-8');
      const data = JSON.parse(raw);
      this.feedbacks = new Map(Object.entries(data));
    }

    const strategiesPath = join(this.stateDir, 'evolution', 'strategies.json');
    if (existsSync(strategiesPath)) {
      this.strategies = JSON.parse(readFileSync(strategiesPath, 'utf-8'));
    }

    const learningsPath = join(this.stateDir, 'evolution', 'learnings.json');
    if (existsSync(learningsPath)) {
      this.learningRecords = JSON.parse(readFileSync(learningsPath, 'utf-8'));
    }
  }

  private saveData(): void {
    const evoDir = join(this.stateDir, 'evolution');

    writeFileSync(
      join(evoDir, 'feedbacks.json'),
      JSON.stringify(Object.fromEntries(this.feedbacks), null, 2)
    );
    writeFileSync(
      join(evoDir, 'strategies.json'),
      JSON.stringify(this.strategies, null, 2)
    );
    writeFileSync(
      join(evoDir, 'learnings.json'),
      JSON.stringify(this.learningRecords, null, 2)
    );
  }
}
