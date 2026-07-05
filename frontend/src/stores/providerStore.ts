import { create } from 'zustand'
import type { Provider, ModelEntry } from '@/lib/types'
import { settingsApi } from '@/lib/api'

// --- 内置预设 Provider ---

const BUILTIN_PROVIDERS: Provider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiFormat: 'openai',
    apiKey: '',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000, maxOutput: 16384 },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000, maxOutput: 16384 },
      { id: 'o1', name: 'o1', contextWindow: 200000, maxOutput: 100000 },
      { id: 'o3-mini', name: 'o3-mini', contextWindow: 200000, maxOutput: 100000 },
    ],
    enabled: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com',
    apiFormat: 'anthropic',
    apiKey: '',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', contextWindow: 200000, maxOutput: 16000 },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', contextWindow: 200000, maxOutput: 8192 },
    ],
    enabled: true,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    apiFormat: 'openai',
    apiKey: '',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3', contextWindow: 64000, maxOutput: 8192 },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1', contextWindow: 64000, maxOutput: 8192 },
    ],
    enabled: false,
  },
]

// --- Store ---

let idCounter = Date.now()
function genId() {
  return `p_${(idCounter++).toString(36)}`
}

interface ProviderStore {
  providers: Provider[]
  loaded: boolean
  loading: boolean
  error: string | null

  // 初始化：从后端 API 加载
  init: () => Promise<void>

  // CRUD（先更新本地状态，再异步持久化到后端）
  addProvider: (data: Omit<Provider, 'id'>) => Promise<void>
  updateProvider: (id: string, data: Partial<Provider>) => Promise<void>
  deleteProvider: (id: string) => Promise<void>
  toggleProvider: (id: string) => Promise<void>

  // 模型管理
  addModel: (providerId: string, model: ModelEntry) => Promise<void>
  deleteModel: (providerId: string, modelId: string) => Promise<void>

  // 工具方法
  getEnabledProviders: () => Provider[]
  getProviderById: (id: string) => Provider | undefined
  getAllModels: () => { providerId: string; providerName: string; model: ModelEntry }[]
  resetToDefaults: () => Promise<void>
}

async function persist(providers: Provider[]) {
  try {
    await settingsApi.updateProviders(providers)
  } catch (e) {
    console.error('Failed to persist providers:', e)
  }
}

export const useProviderStore = create<ProviderStore>((set, get) => ({
  providers: [],
  loaded: false,
  loading: false,
  error: null,

  init: async () => {
    if (get().loaded) return
    set({ loading: true, error: null })
    try {
      const data = await settingsApi.getProviders()
      const providers = data.providers ?? data ?? []
      // 如果后端返回空列表，用内置预设初始化
      if (Array.isArray(providers) && providers.length === 0) {
        set({ providers: BUILTIN_PROVIDERS, loaded: true, loading: false })
        persist(BUILTIN_PROVIDERS)
      } else {
        set({ providers: Array.isArray(providers) ? providers : BUILTIN_PROVIDERS, loaded: true, loading: false })
      }
    } catch {
      set({ providers: BUILTIN_PROVIDERS, loaded: true, loading: false })
    }
  },

  addProvider: async (data) => {
    const provider: Provider = { ...data, id: genId() }
    const next = [...get().providers, provider]
    set({ providers: next })
    persist(next)
  },

  updateProvider: async (id, data) => {
    const next = get().providers.map((p) => (p.id === id ? { ...p, ...data } : p))
    set({ providers: next })
    persist(next)
  },

  deleteProvider: async (id) => {
    const next = get().providers.filter((p) => p.id !== id)
    set({ providers: next })
    persist(next)
  },

  toggleProvider: async (id) => {
    const next = get().providers.map((p) =>
      p.id === id ? { ...p, enabled: !p.enabled } : p,
    )
    set({ providers: next })
    persist(next)
  },

  addModel: async (providerId, model) => {
    const next = get().providers.map((p) =>
      p.id === providerId ? { ...p, models: [...p.models, model] } : p,
    )
    set({ providers: next })
    persist(next)
  },

  deleteModel: async (providerId, modelId) => {
    const next = get().providers.map((p) =>
      p.id === providerId
        ? { ...p, models: p.models.filter((m) => m.id !== modelId) }
        : p,
    )
    set({ providers: next })
    persist(next)
  },

  getEnabledProviders: () => get().providers.filter((p) => p.enabled),
  getProviderById: (id) => get().providers.find((p) => p.id === id),
  getAllModels: () =>
    get().providers.flatMap((p) =>
      p.models.map((m) => ({
        providerId: p.id,
        providerName: p.name,
        model: m,
      })),
    ),

  resetToDefaults: async () => {
    set({ providers: BUILTIN_PROVIDERS })
    persist(BUILTIN_PROVIDERS)
  },
}))
