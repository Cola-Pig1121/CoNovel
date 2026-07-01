/**
 * Provider configuration management.
 * Reads/writes provider config via the Tauri backend API.
 */

import { api } from './api';

export interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  apiFormat: 'openai' | 'anthropic';
  apiKey: string;
  models: ModelEntry[];
  enabled: boolean;
}

export interface ModelEntry {
  id: string;
  contextWindow: number;
  supportsReasoning?: boolean;
  reasoningLevels?: string[];
}

/** Fetch all configured providers from the backend. */
export async function getProviders(): Promise<Provider[]> {
  const data = await api.get<{ providers: Provider[] }>('/api/config?type=providers');
  return data.providers || [];
}

/** Find the provider and model entry that owns a given model ID. */
export async function getProviderForModel(
  modelId: string,
): Promise<{ provider: Provider; model: ModelEntry } | null> {
  const providers = await getProviders();
  for (const p of providers) {
    if (!p.enabled) continue;
    const m = p.models.find((m) => m.id === modelId);
    if (m) return { provider: p, model: m };
  }
  return null;
}

/** Save the full providers list back to the backend. */
export async function saveProviders(providers: Provider[]): Promise<void> {
  await api.put('/api/config', { type: 'providers', providers });
}
