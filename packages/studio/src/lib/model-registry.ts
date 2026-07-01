/**
 * Model registry — metadata for well-known models.
 * Used for context window display, reasoning capability indicators, etc.
 */

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  maxOutput: number;
  supportsReasoning: boolean;
  reasoningLevels?: string[];
}

export const MODEL_REGISTRY: ModelInfo[] = [
  // OpenAI
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', contextWindow: 128000, maxOutput: 16384, supportsReasoning: false },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', contextWindow: 128000, maxOutput: 16384, supportsReasoning: false },
  { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai', contextWindow: 1047576, maxOutput: 32768, supportsReasoning: false },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'openai', contextWindow: 1047576, maxOutput: 32768, supportsReasoning: false },
  { id: 'o3', name: 'o3', provider: 'openai', contextWindow: 200000, maxOutput: 100000, supportsReasoning: true, reasoningLevels: ['low', 'medium', 'high'] },
  { id: 'o3-mini', name: 'o3-mini', provider: 'openai', contextWindow: 200000, maxOutput: 100000, supportsReasoning: true, reasoningLevels: ['low', 'medium', 'high'] },
  { id: 'o4-mini', name: 'o4-mini', provider: 'openai', contextWindow: 200000, maxOutput: 100000, supportsReasoning: true, reasoningLevels: ['low', 'medium', 'high'] },
  // Anthropic
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', provider: 'anthropic', contextWindow: 200000, maxOutput: 32000, supportsReasoning: false },
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic', contextWindow: 200000, maxOutput: 64000, supportsReasoning: false },
  { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', provider: 'anthropic', contextWindow: 200000, maxOutput: 64000, supportsReasoning: false },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic', contextWindow: 200000, maxOutput: 8192, supportsReasoning: false },
  // DeepSeek
  { id: 'deepseek-chat', name: 'DeepSeek V3', provider: 'deepseek', contextWindow: 64000, maxOutput: 8192, supportsReasoning: false },
  { id: 'deepseek-reasoner', name: 'DeepSeek R1', provider: 'deepseek', contextWindow: 64000, maxOutput: 8192, supportsReasoning: true, reasoningLevels: ['low', 'medium', 'high'] },
];

export function lookupModel(modelId: string): ModelInfo | undefined {
  return MODEL_REGISTRY.find((m) => m.id === modelId);
}
