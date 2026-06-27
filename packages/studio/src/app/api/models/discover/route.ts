import { NextRequest, NextResponse } from 'next/server';

// Model Discovery API
// Fetches models from a provider's /v1/models endpoint
// Detects reasoning/thinking capabilities

interface DiscoveredModel {
  id: string;
  owned_by?: string;
  supportsReasoning: boolean;
  reasoningLevels: string[];
  contextWindow?: number;
}

// Known reasoning models and their capabilities
const REASONING_MODELS: Record<string, string[]> = {
  // OpenAI reasoning models
  'o1': ['low', 'medium', 'high'],
  'o1-mini': ['low', 'medium', 'high'],
  'o1-pro': ['low', 'medium', 'high'],
  'o3': ['low', 'medium', 'high'],
  'o3-mini': ['low', 'medium', 'high'],
  'o4-mini': ['low', 'medium', 'high'],
  'gpt-5': ['low', 'medium', 'high', 'max'],
  'gpt-5-mini': ['low', 'medium', 'high'],
  // Anthropic reasoning models
  'claude-3-7-sonnet': ['low', 'medium', 'high'],
  'claude-sonnet-4': ['low', 'medium', 'high'],
  'claude-opus-4': ['low', 'medium', 'high', 'max'],
  'claude-opus-4-6': ['low', 'medium', 'high', 'max'],
  // DeepSeek reasoning models
  'deepseek-r1': ['low', 'medium', 'high'],
  'deepseek-reasoner': ['low', 'medium', 'high'],
  // Google reasoning models
  'gemini-2.5-pro': ['low', 'medium', 'high'],
  'gemini-2.5-flash': ['low', 'medium', 'high'],
  // xAI
  'grok-3': ['low', 'medium', 'high'],
};

function detectReasoningFromModelId(modelId: string): { supports: boolean; levels: string[] } {
  const lower = modelId.toLowerCase();

  // Direct match
  for (const [pattern, levels] of Object.entries(REASONING_MODELS)) {
    if (lower.includes(pattern.toLowerCase())) {
      return { supports: true, levels };
    }
  }

  // Heuristic: check for reasoning-related keywords
  if (lower.includes('reason') || lower.includes('think') || lower.includes('o1') || lower.includes('o3')) {
    return { supports: true, levels: ['low', 'medium', 'high'] };
  }

  return { supports: false, levels: [] };
}

async function fetchModelsFromProvider(baseUrl: string, apiKey?: string, apiFormat?: string): Promise<DiscoveredModel[]> {
  // Normalize base URL
  let url = baseUrl.replace(/\/+$/, '');

  // Try common model listing endpoints
  const endpoints = ['/v1/models', '/models'];

  for (const endpoint of endpoints) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(`${url}${endpoint}`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        const rawModels = data.data || data.models || data || [];

        if (Array.isArray(rawModels)) {
          return rawModels.map((m: any) => {
            const modelId = m.id || m.model || m.name || '';
            const reasoning = detectReasoningFromModelId(modelId);

            return {
              id: modelId,
              owned_by: m.owned_by || m.owner || '',
              supportsReasoning: reasoning.supports,
              reasoningLevels: reasoning.levels,
              contextWindow: m.context_window || m.max_context_length || undefined,
            };
          }).filter((m: DiscoveredModel) => m.id); // Filter out empty entries
        }
      }
    } catch {
      // Try next endpoint
      continue;
    }
  }

  return [];
}

/** POST /api/models/discover — discover models from a provider */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { baseUrl, apiKey, apiFormat } = body;

  if (!baseUrl) {
    return NextResponse.json({ error: 'baseUrl is required' }, { status: 400 });
  }

  try {
    // Try Python bridge first (uses litellm's model database)
    const { scanModels } = await import('@conovel/core');
    const providerName = baseUrl.includes('anthropic') ? 'anthropic'
      : baseUrl.includes('openai') ? 'openai'
      : baseUrl.includes('deepseek') ? 'deepseek'
      : 'custom';

    try {
      const litellmModels = await scanModels(providerName, apiKey, baseUrl);
      if (litellmModels.length > 0) {
        return NextResponse.json({
          success: true,
          models: litellmModels.map(m => ({
            id: m.id,
            supportsReasoning: m.supportsReasoning,
            reasoningLevels: m.reasoningLevels,
            contextWindow: m.contextWindow,
          })),
          count: litellmModels.length,
          reasoningCount: litellmModels.filter(m => m.supportsReasoning).length,
          source: 'litellm',
        });
      }
    } catch {
      // Python bridge not available, fall back to HTTP
    }

    // Fallback: direct HTTP scan
    const models = await fetchModelsFromProvider(baseUrl, apiKey, apiFormat);

    return NextResponse.json({
      success: true,
      models,
      count: models.length,
      reasoningCount: models.filter(m => m.supportsReasoning).length,
      source: 'http',
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error),
      models: [],
    }, { status: 500 });
  }
}

/** GET /api/models/discover — get reasoning model info */
export async function GET() {
  return NextResponse.json({
    knownReasoningModels: REASONING_MODELS,
    reasoningLevels: ['low', 'medium', 'high', 'max'],
    tip: 'POST with { baseUrl, apiKey? } to discover models from a provider endpoint.',
  });
}
