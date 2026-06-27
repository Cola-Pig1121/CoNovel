import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * LiteLLM Client - 通过LiteLLM网关调用AI模型
 *
 * 支持OpenAI兼容格式和Anthropic格式。
 * 配置从 ~/.config/conovel/ 读取。
 */

export interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  reasoningEffort?: string;
  apiFormat: 'openai' | 'anthropic' | 'responses';
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiFormat: 'openai' | 'anthropic' | 'responses';
  apiKey: string;
  models: { id: string; contextWindow: number }[];
  enabled: boolean;
}

interface AgentConfigFile {
  role: string;
  provider: string;
  modelId: string;
  temperature: number;
  maxTokens: number;
  contextWindow: number;
  reasoningEffort?: string;
}

function getConfigDir(): string {
  return join(homedir(), '.config', 'conovel');
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
 */
export function getAgentLLMConfig(agentRole: string): LLMConfig | null {
  const configDir = getConfigDir();
  const providers = readJson<ProviderConfig[]>(join(configDir, 'providers.json'), []);
  const agents = readJson<AgentConfigFile[]>(join(configDir, 'agents.json'), []);

  const agentConfig = agents.find(a => a.role === agentRole);
  if (!agentConfig || !agentConfig.provider || !agentConfig.modelId) return null;

  // Find the provider
  const provider = providers.find(p => p.name === agentConfig.provider && p.enabled);
  if (!provider) return null;

  return {
    baseUrl: provider.baseUrl,
    apiKey: provider.apiKey,
    model: agentConfig.modelId,
    temperature: agentConfig.temperature,
    maxTokens: agentConfig.maxTokens,
    reasoningEffort: agentConfig.reasoningEffort,
    apiFormat: provider.apiFormat,
  };
}

/**
 * 通过LiteLLM网关调用LLM
 */
export async function callLLM(
  config: LLMConfig,
  systemPrompt: string,
  userMessage: string,
): Promise<LLMResponse> {
  const url = config.baseUrl.replace(/\/+$/, '');

  if (config.apiFormat === 'anthropic') {
    return callAnthropic(url, config.apiKey, config.model, systemPrompt, userMessage, config);
  } else {
    return callOpenAICompatible(url, config.apiKey, config.model, systemPrompt, userMessage, config);
  }
}

/**
 * OpenAI兼容格式调用（LiteLLM默认）
 */
async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  config: LLMConfig,
): Promise<LLMResponse> {
  const body: Record<string, any> = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: config.temperature,
    max_tokens: config.maxTokens,
  };

  // Add reasoning effort for supported models
  if (config.reasoningEffort) {
    body.reasoning_effort = config.reasoningEffort;
  }

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(300000), // 5 minute timeout
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`LLM API error ${response.status}: ${errorText}`);
  }

  const data: any = await response.json();
  const choice = data.choices?.[0];

  return {
    content: choice?.message?.content || '',
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens || 0,
      completionTokens: data.usage.completion_tokens || 0,
      totalTokens: data.usage.total_tokens || 0,
    } : undefined,
  };
}

/**
 * Anthropic格式调用
 */
async function callAnthropic(
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  config: LLMConfig,
): Promise<LLMResponse> {
  const body: Record<string, any> = {
    model,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userMessage },
    ],
    max_tokens: config.maxTokens,
    temperature: config.temperature,
  };

  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(300000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
  }

  const data: any = await response.json();
  const content = data.content?.[0]?.text || '';

  return {
    content,
    usage: data.usage ? {
      promptTokens: data.usage.input_tokens || 0,
      completionTokens: data.usage.output_tokens || 0,
      totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
    } : undefined,
  };
}

/**
 * 流式调用LLM（用于实时输出）
 */
export async function* streamLLM(
  config: LLMConfig,
  systemPrompt: string,
  userMessage: string,
): AsyncGenerator<{ chunk: string; done: boolean; usage?: LLMResponse['usage'] }> {
  const url = config.baseUrl.replace(/\/+$/, '');

  const body: Record<string, any> = {
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    stream: true,
  };

  if (config.reasoningEffort) {
    body.reasoning_effort = config.reasoningEffort;
  }

  const response = await fetch(`${url}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(300000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`LLM API error ${response.status}: ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            yield { chunk: '', done: true };
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const chunk = parsed.choices?.[0]?.delta?.content || '';
            if (chunk) {
              yield { chunk, done: false };
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
