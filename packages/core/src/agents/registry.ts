import { AgentConfig, AgentPerformance, AgentRole, AGENT_DEFINITIONS, ModelConfig } from './types.js';
import { BaseAgent } from './base.js';

/**
 * AgentRegistry - Agent注册表和管理器
 *
 * 管理所有Agent的配置、实例化和模型绑定。
 * 支持Per-Agent模型配置。
 */
export class AgentRegistry {
  private configs: Map<AgentRole, AgentConfig> = new Map();
  private instances: Map<AgentRole, BaseAgent> = new Map();
  private performances: Map<AgentRole, AgentPerformance> = new Map();

  /**
   * 初始化注册表，加载默认配置
   */
  constructor(defaultModel?: ModelConfig) {
    // Initialize all agent configs with default model
    for (const [role, def] of Object.entries(AGENT_DEFINITIONS)) {
      const config: AgentConfig = {
        ...def,
        model: defaultModel || {
          provider: 'openai',
          modelId: 'gpt-4o',
          apiFormat: 'openai',
          temperature: 0.7,
          maxTokens: 4096,
          contextWindow: 200000,
        },
      };
      this.configs.set(role as AgentRole, config);

      // Initialize performance tracking
      this.performances.set(role as AgentRole, {
        agentId: role,
        totalTasks: 0,
        avgScore: 5,
        scoreHistory: [],
        commonIssues: {},
        improvementRate: 0,
        lastUpdated: new Date().toISOString(),
      });
    }
  }

  /**
   * 获取Agent配置
   */
  getConfig(role: AgentRole): AgentConfig {
    const config = this.configs.get(role);
    if (!config) throw new Error(`Agent not found: ${role}`);
    return config;
  }

  /**
   * 更新Agent模型配置
   */
  updateModel(role: AgentRole, model: Partial<ModelConfig>): void {
    const config = this.configs.get(role);
    if (!config) throw new Error(`Agent not found: ${role}`);

    config.model = { ...config.model, ...model };
  }

  /**
   * 更新Agent完整配置
   */
  updateConfig(role: AgentRole, updates: Partial<AgentConfig>): void {
    const config = this.configs.get(role);
    if (!config) throw new Error(`Agent not found: ${role}`);

    Object.assign(config, updates);
  }

  /**
   * 获取所有Agent配置
   */
  getAllConfigs(): AgentConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * 获取Agent性能数据
   */
  getPerformance(role: AgentRole): AgentPerformance {
    return this.performances.get(role)!;
  }

  /**
   * 更新Agent性能数据
   */
  updatePerformance(role: AgentRole, score: number, issues: string[] = []): void {
    const perf = this.performances.get(role);
    if (!perf) return;

    perf.totalTasks++;
    perf.scoreHistory.push(score);
    // Keep last 100 scores
    if (perf.scoreHistory.length > 100) {
      perf.scoreHistory = perf.scoreHistory.slice(-100);
    }
    perf.avgScore = perf.scoreHistory.reduce((a, b) => a + b, 0) / perf.scoreHistory.length;

    // Track common issues
    for (const issue of issues) {
      perf.commonIssues[issue] = (perf.commonIssues[issue] || 0) + 1;
    }

    // Calculate improvement rate (last 10 vs previous 10)
    if (perf.scoreHistory.length >= 20) {
      const recent = perf.scoreHistory.slice(-10);
      const previous = perf.scoreHistory.slice(-20, -10);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
      perf.improvementRate = (recentAvg - previousAvg) / previousAvg;
    }

    perf.lastUpdated = new Date().toISOString();
  }

  /**
   * 导出所有配置（用于持久化）
   */
  exportConfigs(): Record<string, AgentConfig> {
    const result: Record<string, AgentConfig> = {};
    for (const [role, config] of this.configs) {
      result[role] = config;
    }
    return result;
  }

  /**
   * 导入配置（从持久化恢复）
   */
  importConfigs(configs: Record<string, AgentConfig>): void {
    for (const [role, config] of Object.entries(configs)) {
      if (this.configs.has(role as AgentRole)) {
        this.configs.set(role as AgentRole, config);
      }
    }
  }

  /**
   * 获取已启用的Agent列表
   */
  getEnabledAgents(): AgentConfig[] {
    return Array.from(this.configs.values()).filter(c => c.enabled);
  }

  /**
   * 启用/禁用Agent
   */
  setEnabled(role: AgentRole, enabled: boolean): void {
    const config = this.configs.get(role);
    if (config) config.enabled = enabled;
  }
}
