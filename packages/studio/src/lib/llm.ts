/**
 * LLM calling core — routes calls through Tauri IPC to the Rust backend.
 * Supports OpenAI-compatible and Anthropic providers directly,
 * no Python/litellm dependency.
 */

import { tauriInvoke, isTauri } from './tauri';
import type { Provider } from './providers';

export interface LLMRequest {
  provider: Provider;
  modelId: string;
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  usage: { promptTokens: number; completionTokens: number };
  finishReason: string;
}

/** Parse JSON from LLM response, handling markdown code blocks. */
export function parseJSON(text: string): any {
  let str = text;
  const match = str.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) str = match[1];
  return JSON.parse(str.trim());
}

/**
 * Call an LLM through the Rust backend (Tauri IPC).
 * Falls back to browser mode if not running in Tauri.
 */
export async function callLLM(params: LLMRequest): Promise<LLMResponse> {
  const {
    provider,
    modelId,
    system,
    user,
    temperature = 0.7,
    maxTokens = 4096,
  } = params;

  if (!isTauri()) {
    throw new Error('LLM calls require the Tauri desktop app. API keys are stored locally.');
  }

  const input = JSON.stringify({
    model_id: modelId,
    system,
    user,
    temperature,
    max_tokens: maxTokens,
    provider_id: provider.id,
  });

  const result = await tauriInvoke<{
    success: boolean;
    content: string;
    usage: { prompt_tokens: number; completion_tokens: number };
    finish_reason: string;
    error?: string;
  }>('call_llm', {
    baseUrl: provider.baseUrl,
    apiKey: provider.apiKey,
    apiFormat: provider.apiFormat,
    input,
  });

  if (!result.success) {
    throw new Error(result.error || 'LLM call failed');
  }

  return {
    content: result.content,
    usage: {
      promptTokens: result.usage?.prompt_tokens ?? 0,
      completionTokens: result.usage?.completion_tokens ?? 0,
    },
    finishReason: result.finish_reason || 'stop',
  };
}
