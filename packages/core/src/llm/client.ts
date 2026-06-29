import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * LLM Client - 通过Python脚本桥接调用AI模型
 *
 * 使用litellm SDK的Python能力：
 * - 自动扫描服务商模型
 * - 检测思考强度
 * - 统一参数归一化
 * - 多供应商支持
 *
 * TypeScript通过child_process调用Python脚本，
 * 脚本通过litellm SDK执行实际的LLM调用。
 */

export interface LLMConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  reasoningEffort?: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * 查找Python脚本路径
 */
function findBridgeScript(): string {
  // Try multiple locations
  const candidates = [
    join(process.cwd(), '..', '..', 'scripts', 'llm_bridge.py'),
    join(process.cwd(), 'scripts', 'llm_bridge.py'),
    join(__dirname, '..', '..', '..', '..', 'scripts', 'llm_bridge.py'),
  ];

  for (const p of candidates) {
    if (existsSync(p)) return p;
  }

  // Default path
  return join(process.cwd(), '..', '..', 'scripts', 'llm_bridge.py');
}

/**
 * 调用Python桥接脚本
 */
function callPythonBridge(action: string, inputData: Record<string, unknown>): Record<string, any> {
  const scriptPath = findBridgeScript();
  const inputJson = JSON.stringify(inputData).replace(/"/g, '\\"');

  try {
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const output = execSync(
      `${pythonCmd} "${scriptPath}" --action ${action} --input "${inputJson}"`,
      {
        encoding: 'utf-8',
        timeout: 300000, // 5 minutes
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
        },
      }
    );

    return JSON.parse(output.trim());
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error),
    };
  }
}

/**
 * 通过Python脚本调用LLM
 */
export async function callLLM(
  config: LLMConfig,
  systemPrompt: string,
  userMessage: string,
): Promise<LLMResponse> {
  const result = callPythonBridge('completion', {
    model: config.model,
    system: systemPrompt,
    user: userMessage,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    reasoning_effort: config.reasoningEffort,
  });

  if (!result.success) {
    throw new Error(result.error || 'LLM call failed');
  }

  return {
    content: result.content || '',
    usage: result.usage ? {
      promptTokens: result.usage.promptTokens || 0,
      completionTokens: result.usage.completionTokens || 0,
      totalTokens: result.usage.totalTokens || 0,
    } : undefined,
  };
}

/**
 * 扫描服务商可用模型
 */
export async function scanModels(provider: string, apiKey?: string, baseUrl?: string): Promise<Array<{
  id: string;
  supportsReasoning: boolean;
  reasoningLevels: string[];
  contextWindow: number;
}>> {
  const result = callPythonBridge('scan_models', {
    provider,
    api_key: apiKey,
    base_url: baseUrl,
  });

  return result.models || [];
}

/**
 * 检测模型是否支持思考强度
 */
export async function checkReasoning(modelId: string): Promise<{
  supportsReasoning: boolean;
  reasoningLevels: string[];
}> {
  const result = callPythonBridge('check_reasoning', {
    model: modelId,
  });

  return {
    supportsReasoning: result.supportsReasoning || false,
    reasoningLevels: result.reasoningLevels || [],
  };
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (existsSync(filePath)) {
      return JSON.parse(readFileSync(filePath, 'utf-8'));
    }
  } catch { /* ignore */ }
  return fallback;
}

/**
 * 获取Agent的LLM配置
 * 从 ~/.config/conovel/ 读取供应商和Agent配置，
 * 组装成litellm格式的模型名（如 "openai/gpt-4o"）
 */
export function getAgentLLMConfig(agentRole: string): LLMConfig | null {
  const configDir = join(homedir(), '.config', 'conovel');

  interface ProviderFile { name: string; enabled: boolean; }
  interface AgentFile { role: string; provider: string; modelId: string; temperature: number; maxTokens: number; reasoningEffort?: string; }

  const providers = readJson<ProviderFile[]>(join(configDir, 'providers.json'), []);
  const agents = readJson<AgentFile[]>(join(configDir, 'agents.json'), []);

  const agentConfig = agents.find(a => a.role === agentRole);
  if (!agentConfig || !agentConfig.provider || !agentConfig.modelId) return null;

  const provider = providers.find(p => p.name === agentConfig.provider && p.enabled);
  if (!provider) return null;

  // Build litellm model string: "provider/model_id"
  // e.g., "openai/gpt-4o" or "anthropic/claude-sonnet-4"
  const litellmModel = `${agentConfig.provider.toLowerCase()}/${agentConfig.modelId}`;

  return {
    model: litellmModel,
    temperature: agentConfig.temperature,
    maxTokens: agentConfig.maxTokens,
    reasoningEffort: agentConfig.reasoningEffort,
  };
}
