import { create } from 'zustand'
import { agentsApi } from '@/lib/api'

// --- 16 个 Agent 定义 ---

export interface AgentAssignment {
  role: string
  name: string
  nameZh: string
  providerId: string
  modelId: string
  temperature: number
  maxTokens: number
  enabled: boolean
}

const DEFAULT_AGENTS: AgentAssignment[] = [
  { role: 'executive_editor', name: 'Executive Editor', nameZh: '主编', providerId: 'openai', modelId: 'gpt-4o-mini', temperature: 0.3, maxTokens: 4096, enabled: true },
  { role: 'story_architect', name: 'Story Architect', nameZh: '故事架构师', providerId: 'openai', modelId: 'gpt-4o', temperature: 0.7, maxTokens: 4096, enabled: true },
  { role: 'narrative_writer', name: 'Narrative Writer', nameZh: '叙事写手', providerId: 'openai', modelId: 'gpt-4o', temperature: 0.8, maxTokens: 8192, enabled: true },
  { role: 'character_designer', name: 'Character Designer', nameZh: '角色设计师', providerId: 'openai', modelId: 'gpt-4o-mini', temperature: 0.6, maxTokens: 4096, enabled: true },
  { role: 'character_intelligence', name: 'Character Intelligence', nameZh: '★角色智能', providerId: 'openai', modelId: 'gpt-4o-mini', temperature: 0.5, maxTokens: 4096, enabled: true },
  { role: 'reviewer', name: 'Reviewer', nameZh: '审稿人', providerId: 'openai', modelId: 'gpt-4o', temperature: 0.3, maxTokens: 4096, enabled: true },
  { role: 'editor', name: 'Editor', nameZh: '编辑', providerId: 'openai', modelId: 'gpt-4o-mini', temperature: 0.5, maxTokens: 4096, enabled: true },
  { role: 'de_ai_editor', name: 'De-AI Editor', nameZh: '去AI味编辑', providerId: 'openai', modelId: 'gpt-4o-mini', temperature: 0.4, maxTokens: 4096, enabled: true },
  { role: 'fact_checker', name: 'Fact Checker', nameZh: '事实核查', providerId: 'openai', modelId: 'gpt-4o-mini', temperature: 0.1, maxTokens: 2048, enabled: true },
  { role: 'continuity_checker', name: 'Continuity Checker', nameZh: '连续性检查', providerId: 'openai', modelId: 'gpt-4o-mini', temperature: 0.1, maxTokens: 2048, enabled: true },
  { role: 'pacing_controller', name: 'Pacing Controller', nameZh: '节奏控制', providerId: 'openai', modelId: 'gpt-4o-mini', temperature: 0.3, maxTokens: 2048, enabled: true },
  { role: 'foreshadowing_tracker', name: 'Foreshadowing Tracker', nameZh: '伏笔追踪', providerId: 'openai', modelId: 'gpt-4o-mini', temperature: 0.2, maxTokens: 2048, enabled: true },
  { role: 'style_analyzer', name: 'Style Analyzer', nameZh: '文风分析', providerId: 'openai', modelId: 'gpt-4o-mini', temperature: 0.5, maxTokens: 4096, enabled: true },
  { role: 'observer', name: 'Observer', nameZh: '观察者', providerId: 'openai', modelId: 'gpt-4o-mini', temperature: 0.2, maxTokens: 2048, enabled: true },
  { role: 'radar', name: 'Radar', nameZh: '雷达', providerId: 'openai', modelId: 'gpt-4o-mini', temperature: 0.5, maxTokens: 2048, enabled: true },
  { role: 'reflector', name: 'Reflector', nameZh: '反思者', providerId: 'openai', modelId: 'gpt-4o-mini', temperature: 0.6, maxTokens: 4096, enabled: true },
]

// --- Store ---

interface AgentConfigStore {
  agents: AgentAssignment[]
  loaded: boolean
  loading: boolean

  init: () => Promise<void>
  updateAgent: (role: string, data: Partial<AgentAssignment>) => Promise<void>
  batchAssign: (providerId: string, modelId: string, roles?: string[]) => Promise<void>
  resetToDefaults: () => Promise<void>
  getAgentByRole: (role: string) => AgentAssignment | undefined
}

async function persistAgents(agents: AgentAssignment[]) {
  try {
    await agentsApi.updateConfig(agents)
  } catch (e) {
    console.error('Failed to persist agent config:', e)
  }
}

export const useAgentConfigStore = create<AgentConfigStore>((set, get) => ({
  agents: [],
  loaded: false,
  loading: false,

  init: async () => {
    if (get().loaded) return
    set({ loading: true })
    try {
      const data = await agentsApi.listConfig()
      const agents = data.config ?? data ?? []
      if (Array.isArray(agents) && agents.length > 0) {
        set({ agents, loaded: true, loading: false })
      } else {
        // 空配置，用默认值初始化并写入后端
        set({ agents: DEFAULT_AGENTS, loaded: true, loading: false })
        persistAgents(DEFAULT_AGENTS)
      }
    } catch {
      set({ agents: DEFAULT_AGENTS, loaded: true, loading: false })
    }
  },

  updateAgent: async (role, data) => {
    const next = get().agents.map((a) =>
      a.role === role ? { ...a, ...data } : a,
    )
    set({ agents: next })
    persistAgents(next)
  },

  batchAssign: async (providerId, modelId, roles) => {
    const next = get().agents.map((a) => {
      if (roles && !roles.includes(a.role)) return a
      return { ...a, providerId, modelId }
    })
    set({ agents: next })
    persistAgents(next)
  },

  resetToDefaults: async () => {
    set({ agents: DEFAULT_AGENTS })
    persistAgents(DEFAULT_AGENTS)
  },

  getAgentByRole: (role) => get().agents.find((a) => a.role === role),
}))
