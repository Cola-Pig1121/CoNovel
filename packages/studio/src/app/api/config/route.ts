import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Config directory: ~/.config/conovel/
const CONFIG_DIR = join(homedir(), '.config', 'conovel');
const PROVIDERS_FILE = join(CONFIG_DIR, 'providers.json');
const AGENTS_FILE = join(CONFIG_DIR, 'agents.json');

// Ensure config directory exists
function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

// ===== Default Configs =====

interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  apiFormat: 'openai' | 'anthropic' | 'responses';
  apiKey: string;
  models: { id: string; contextWindow: number }[];
  status: 'connected' | 'disconnected' | 'error';
  enabled: boolean;
}

interface AgentConfig {
  role: string;
  name: string;
  nameZh: string;
  provider: string;
  modelId: string;
  temperature: number;
  maxTokens: number;
  contextWindow: number;
}

// 默认无预置供应商，用户通过 LiteLLM 或自定义端点配置
const DEFAULT_PROVIDERS: Provider[] = [];

// 默认Agent配置 - 模型ID留空，用户通过 LiteLLM 网关自行配置
// 智能分配原则：深度推理用强模型，轻量检查用快模型
const DEFAULT_AGENTS: AgentConfig[] = [
  // 核心创作 - 需要强推理能力
  { role: 'architect', name: 'Architect', nameZh: '故事架构师', provider: '', modelId: '', temperature: 0.7, maxTokens: 4096, contextWindow: 200000 },
  { role: 'writer', name: 'Writer', nameZh: '写作特工', provider: '', modelId: '', temperature: 0.8, maxTokens: 8192, contextWindow: 200000 },
  { role: 'character-intelligence', name: 'Character Intelligence', nameZh: '角色智能体', provider: '', modelId: '', temperature: 0.7, maxTokens: 4096, contextWindow: 200000 },
  // 质量控制
  { role: 'reviewer', name: 'Reviewer', nameZh: '审阅官', provider: '', modelId: '', temperature: 0.3, maxTokens: 4096, contextWindow: 200000 },
  { role: 'editor', name: 'Editor', nameZh: '编辑', provider: '', modelId: '', temperature: 0.5, maxTokens: 4096, contextWindow: 200000 },
  { role: 'de-ai-editor', name: 'De-AI Editor', nameZh: '去AI味编辑', provider: '', modelId: '', temperature: 0.5, maxTokens: 4096, contextWindow: 200000 },
  { role: 'fact-checker', name: 'Fact Checker', nameZh: '事实核查官', provider: '', modelId: '', temperature: 0.1, maxTokens: 2048, contextWindow: 200000 },
  { role: 'continuity', name: 'Continuity', nameZh: '连续性检查官', provider: '', modelId: '', temperature: 0.1, maxTokens: 2048, contextWindow: 200000 },
  { role: 'pacing-controller', name: 'Pacing Controller', nameZh: '节奏控制官', provider: '', modelId: '', temperature: 0.5, maxTokens: 2048, contextWindow: 200000 },
  // 辅助
  { role: 'style-analyzer', name: 'Style Analyzer', nameZh: '风格分析师', provider: '', modelId: '', temperature: 0.3, maxTokens: 2048, contextWindow: 200000 },
  { role: 'observer', name: 'Observer', nameZh: '观察者', provider: '', modelId: '', temperature: 0.3, maxTokens: 2048, contextWindow: 200000 },
  { role: 'character-designer', name: 'Character Designer', nameZh: '角色设计师', provider: '', modelId: '', temperature: 0.7, maxTokens: 4096, contextWindow: 200000 },
  { role: 'foreshadowing', name: 'Foreshadowing', nameZh: '伏笔管理官', provider: '', modelId: '', temperature: 0.3, maxTokens: 2048, contextWindow: 200000 },
  { role: 'radar', name: 'Radar', nameZh: '趋势雷达', provider: '', modelId: '', temperature: 0.5, maxTokens: 2048, contextWindow: 200000 },
  { role: 'reflector', name: 'Reflector', nameZh: '反思官', provider: '', modelId: '', temperature: 0.5, maxTokens: 4096, contextWindow: 200000 },
];

// ===== Read/Write Helpers =====

function readProviders(): Provider[] {
  ensureConfigDir();
  if (!existsSync(PROVIDERS_FILE)) {
    writeFileSync(PROVIDERS_FILE, JSON.stringify(DEFAULT_PROVIDERS, null, 2), 'utf-8');
    return DEFAULT_PROVIDERS;
  }
  return JSON.parse(readFileSync(PROVIDERS_FILE, 'utf-8'));
}

function writeProviders(providers: Provider[]) {
  ensureConfigDir();
  writeFileSync(PROVIDERS_FILE, JSON.stringify(providers, null, 2), 'utf-8');
}

function readAgents(): AgentConfig[] {
  ensureConfigDir();
  if (!existsSync(AGENTS_FILE)) {
    writeFileSync(AGENTS_FILE, JSON.stringify(DEFAULT_AGENTS, null, 2), 'utf-8');
    return DEFAULT_AGENTS;
  }
  return JSON.parse(readFileSync(AGENTS_FILE, 'utf-8'));
}

function writeAgents(agents: AgentConfig[]) {
  ensureConfigDir();
  writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2), 'utf-8');
}

// ===== GET =====

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all';

  try {
    switch (type) {
      case 'providers':
        return NextResponse.json({ providers: readProviders() });
      case 'agents':
        return NextResponse.json({ agents: readAgents() });
      default:
        return NextResponse.json({
          providers: readProviders(),
          agents: readAgents(),
          configDir: CONFIG_DIR,
        });
    }
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// ===== PUT (Update) =====

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { type } = body;

  try {
    switch (type) {
      case 'providers': {
        const { providers } = body;
        writeProviders(providers);
        return NextResponse.json({ success: true, providers: readProviders() });
      }
      case 'agents': {
        const { agents } = body;
        writeAgents(agents);
        return NextResponse.json({ success: true, agents: readAgents() });
      }
      case 'single-agent': {
        const { role, updates } = body;
        const agents = readAgents();
        const idx = agents.findIndex(a => a.role === role);
        if (idx === -1) {
          return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }
        agents[idx] = { ...agents[idx], ...updates };
        writeAgents(agents);
        return NextResponse.json({ success: true, agents });
      }
      default:
        return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
