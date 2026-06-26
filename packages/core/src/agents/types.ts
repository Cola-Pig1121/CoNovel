import { z } from 'zod';

// ===== Agent Roles =====
export const AgentRoleEnum = z.enum([
  'architect',           // 故事架构师
  'writer',              // 写作特工
  'character-intelligence', // 角色智能体 ★
  'reviewer',            // 审阅官
  'editor',              // 编辑
  'observer',            // 观察者
  'character-designer',  // 角色设计师
  'style-analyzer',      // 风格分析师
  'fact-checker',        // 事实核查官
  'continuity',          // 连续性检查官
  'pacing-controller',   // 节奏控制官
  'foreshadowing',       // 伏笔管理官
  'de-ai-editor',        // 去AI味编辑
  'radar',               // 趋势雷达
  'reflector',           // 反思官
]);
export type AgentRole = z.infer<typeof AgentRoleEnum>;

// ===== Model Provider =====
export const ModelProviderSchema = z.enum([
  'openai',
  'anthropic',
  'google',
  'deepseek',
  'ollama',
  'custom',
]);
export type ModelProvider = z.infer<typeof ModelProviderSchema>;

// ===== API Format =====
export const ApiFormatSchema = z.enum([
  'openai',          // Chat Completions (/chat/completions)
  'anthropic',       // Anthropic Messages (/v1/messages)
  'responses',       // Responses (/responses)
]);
export type ApiFormat = z.infer<typeof ApiFormatSchema>;

// ===== Model Configuration =====
export const ModelConfigSchema = z.object({
  provider: ModelProviderSchema,
  modelId: z.string(),                    // e.g., "claude-sonnet-4", "gpt-4o"
  baseUrl: z.string().url().optional(),   // Custom API endpoint
  apiKey: z.string().optional(),          // API key (stored encrypted in production)
  apiFormat: ApiFormatSchema.default('openai'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().positive().default(4096),
  contextWindow: z.number().positive().default(200000),
});
export type ModelConfig = z.infer<typeof ModelConfigSchema>;

// ===== Agent Configuration =====
export const AgentConfigSchema = z.object({
  role: AgentRoleEnum,
  name: z.string(),
  nameZh: z.string(),
  description: z.string(),
  instructions: z.string(),              // System prompt content
  model: ModelConfigSchema,
  skills: z.array(z.string()).default([]), // Skill file paths
  tools: z.array(z.string()).default([]),  // Tool names
  maxRetries: z.number().min(0).default(2),
  timeout: z.number().positive().default(120000), // ms
  enabled: z.boolean().default(true),
});
export type AgentConfig = z.infer<typeof AgentConfigSchema>;

// ===== Agent Performance =====
export const AgentPerformanceSchema = z.object({
  agentId: z.string(),
  totalTasks: z.number().min(0).default(0),
  avgScore: z.number().min(0).max(10).default(5),
  scoreHistory: z.array(z.number().min(0).max(10)).default([]),
  commonIssues: z.record(z.number()).default({}), // issue -> count
  improvementRate: z.number().default(0),
  lastUpdated: z.string().datetime(),
});
export type AgentPerformance = z.infer<typeof AgentPerformanceSchema>;

// ===== Agent Execution Result =====
export interface AgentResult {
  agentRole: AgentRole;
  success: boolean;
  output: string;
  score?: number;
  issues?: string[];
  duration: number; // ms
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

// ===== Agent Definitions =====
export const AGENT_DEFINITIONS: Record<AgentRole, Omit<AgentConfig, 'model'>> = {
  'architect': {
    role: 'architect',
    name: 'Architect',
    nameZh: '故事架构师',
    description: '负责大纲构建、情节设计、世界观架构。将抽象构思转化为可执行的章节大纲。',
    instructions: '', // Loaded from instructions.md
    skills: ['outline-builder'],
    tools: ['novel-manager'],
    maxRetries: 2,
    timeout: 120000,
    enabled: true,
  },
  'writer': {
    role: 'writer',
    name: 'Writer',
    nameZh: '写作特工',
    description: '负责章节正文创作。从章节简报生成纯小说文本，使用多种叙事入口模式避免结构单调。',
    instructions: '',
    skills: ['scene-writing'],
    tools: ['chapter-writer'],
    maxRetries: 2,
    timeout: 180000,
    enabled: true,
  },
  'character-intelligence': {
    role: 'character-intelligence',
    name: 'Character Intelligence',
    nameZh: '角色智能体',
    description: '角色智能体，完全沉浸在指定角色中进行思维推理。模拟角色的心理活动、行为预测和决策过程。',
    instructions: '',
    skills: ['character-design'],
    tools: ['novel-manager'],
    maxRetries: 2,
    timeout: 120000,
    enabled: true,
  },
  'reviewer': {
    role: 'reviewer',
    name: 'Reviewer',
    nameZh: '审阅官',
    description: '多维度质量审阅。综合逻辑、节奏、文笔、角色一致性等多个维度进行结构化评审。',
    instructions: '',
    skills: [],
    tools: ['review-pipeline'],
    maxRetries: 1,
    timeout: 120000,
    enabled: true,
  },
  'editor': {
    role: 'editor',
    name: 'Editor',
    nameZh: '编辑',
    description: '文字润色、结构调整。优化文字表达，调整段落结构，提升阅读体验。',
    instructions: '',
    skills: ['style-calibration'],
    tools: [],
    maxRetries: 2,
    timeout: 120000,
    enabled: true,
  },
  'observer': {
    role: 'observer',
    name: 'Observer',
    nameZh: '观察者',
    description: '监控叙事事件，记录关键信息。追踪角色出场、地点变化、事件发生。',
    instructions: '',
    skills: [],
    tools: ['novel-manager'],
    maxRetries: 1,
    timeout: 60000,
    enabled: true,
  },
  'character-designer': {
    role: 'character-designer',
    name: 'Character Designer',
    nameZh: '角色设计师',
    description: '角色档案设计、关系图谱构建。创建详细的角色设定和人物关系网络。',
    instructions: '',
    skills: ['character-design'],
    tools: ['novel-manager'],
    maxRetries: 2,
    timeout: 120000,
    enabled: true,
  },
  'style-analyzer': {
    role: 'style-analyzer',
    name: 'Style Analyzer',
    nameZh: '风格分析师',
    description: '提取风格指纹、风格校准。分析文本风格特征，确保全书风格一致。',
    instructions: '',
    skills: ['style-calibration'],
    tools: [],
    maxRetries: 1,
    timeout: 60000,
    enabled: true,
  },
  'fact-checker': {
    role: 'fact-checker',
    name: 'Fact Checker',
    nameZh: '事实核查官',
    description: '事实一致性检查。验证角色状态、地点、时间线等事实是否前后一致。',
    instructions: '',
    skills: [],
    tools: ['review-pipeline'],
    maxRetries: 1,
    timeout: 60000,
    enabled: true,
  },
  'continuity': {
    role: 'continuity',
    name: 'Continuity Checker',
    nameZh: '连续性检查官',
    description: '跨章节连续性验证。检查章节间的情节衔接、角色行为连续性。',
    instructions: '',
    skills: [],
    tools: ['review-pipeline'],
    maxRetries: 1,
    timeout: 60000,
    enabled: true,
  },
  'pacing-controller': {
    role: 'pacing-controller',
    name: 'Pacing Controller',
    nameZh: '节奏控制官',
    description: '节奏曲线分析、节拍控制。确保故事节奏张弛有度，避免单调。',
    instructions: '',
    skills: [],
    tools: ['review-pipeline'],
    maxRetries: 1,
    timeout: 60000,
    enabled: true,
  },
  'foreshadowing': {
    role: 'foreshadowing',
    name: 'Foreshadowing Manager',
    nameZh: '伏笔管理官',
    description: '伏笔追踪、回收提醒。管理伏笔的植入、推进和回收。',
    instructions: '',
    skills: [],
    tools: ['novel-manager'],
    maxRetries: 1,
    timeout: 60000,
    enabled: true,
  },
  'de-ai-editor': {
    role: 'de-ai-editor',
    name: 'De-AI Editor',
    nameZh: '去AI味编辑',
    description: '检测并消除AI写作痕迹。识别高频AI词汇、句式模式等特征并修正。',
    instructions: '',
    skills: ['anti-ai-edit'],
    tools: [],
    maxRetries: 2,
    timeout: 120000,
    enabled: true,
  },
  'radar': {
    role: 'radar',
    name: 'Radar',
    nameZh: '趋势雷达',
    description: '市场趋势扫描、题材分析。分析当前市场热点和读者偏好。',
    instructions: '',
    skills: [],
    tools: [],
    maxRetries: 1,
    timeout: 60000,
    enabled: true,
  },
  'reflector': {
    role: 'reflector',
    name: 'Reflector',
    nameZh: '反思官',
    description: '章节质量反思、改进建议。回顾已完成章节，提出改进方向。',
    instructions: '',
    skills: [],
    tools: ['evolution-tracker'],
    maxRetries: 1,
    timeout: 60000,
    enabled: true,
  },
};
