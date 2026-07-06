import { create } from 'zustand'
import { agentsApi } from '@/lib/api'

// --- Tier Types ---

export type TierLevel = 'strong' | 'medium' | 'light'

export interface TierPreset {
  tier: TierLevel
  providerId: string
  modelId: string
}

/** Static mapping: which agents belong to each tier. */
export const TIER_AGENT_MAP: Record<TierLevel, string[]> = {
  strong: ['story_architect', 'narrative_writer', 'reviewer', 'character_intelligence'],
  medium: ['executive_editor', 'character_designer', 'editor', 'de_ai_editor', 'style_analyzer', 'reflector'],
  light: ['fact_checker', 'continuity_checker', 'pacing_controller', 'foreshadowing_tracker', 'observer', 'radar'],
}

export const TIER_LABELS: Record<TierLevel, { name: string; nameZh: string; description: string }> = {
  strong: { name: 'Strong', nameZh: '强力', description: '核心写作 Agent (Strong 模型)' },
  medium: { name: 'Medium', nameZh: '中等', description: '标准任务 Agent (Medium 模型)' },
  light: { name: 'Light', nameZh: '轻量', description: '辅助 Agent (Light 模型)' },
}

// --- 16 Agents ---

export interface AgentAssignment {
  role: string
  name: string
  nameZh: string
  providerId: string
  modelId: string
  temperature: number
  maxTokens: number
  reasoningEffort: TierLevel
  enabled: boolean
}

const DEFAULT_AGENTS: AgentAssignment[] = [
  // Strong tier
  { role: 'story_architect', name: 'Story Architect', nameZh: '故事架构师', providerId: 'openai', modelId: 'gpt-4o', temperature: 0.7, maxTokens: 4096, reasoningEffort: 'strong', enabled: true },
  { role: 'narrative_writer', name: 'Narrative Writer', nameZh: '叙事写手', providerId: 'openai', modelId: 'gpt-4o', temperature: 0.8, maxTokens: 8192, reasoningEffort: 'strong', enabled: true },
  { role: 'reviewer', name: 'Reviewer', nameZh: '审稿人', providerId: 'openai', modelId: 'gpt-4o', temperature: 0.3, maxTokens: 4096, reasoningEffort: 'strong', enabled: true },
  { role: 'character_intelligence', name: 'Character Intelligence', nameZh: '★角色智能', providerId: 'openai', modelId: 'gpt-4o-mini', temperature: 0.5, maxTokens: 4096, reasoningEffort: 'strong', enabled: true },
  // Medium tier
  { role: 'executive_editor', name: 'Executive Editor', nameZh: '主编', providerId: 'openai', modelId: 'gpt-4o-mini', temperature: 0.3, maxTokens: 4096, reasoningEffort: 'medium', enabled: true },
  { role: 'character_designer', name: 'Character Designer', nameZh: '角色设计师', providerId: 'openai', modelId: 'gpt-4o-mini', temperature: 0.6, maxTokens: 4096, reasoningEffort: 'medium', enabled: true },
  { role: 'editor', name: 'Editor', nameZh: '编辑', providerId: 'openai', modelId: 'gpt-4o-mini', temperature: 0.5, maxTokens: 4096, reasoningEffort: 'medium', enabled: true },
  { role: 'de_ai_editor', name: 'De-AI Editor', nameZh: '去AI味编辑', providerId: 'openai', modelId: 'gpt-4o-mini', temperature: 0.4, maxTokens: 4096, reasoningEffort: 'medium', enabled: true },
  { role: 'style_analyzer', name: 'Style Analyzer', nameZh: '文风分析', providerId: 'openai', modelId: 'gpt-4o-mini', temperature: 0.5, maxTokens: 4096, reasoningEffort: 'medium', enabled: true },
  { role: 'reflector', name: 'Reflector', nameZh: '反思者', providerId: 'openai', modelId: 'gpt-4o-mini', temperature: 0.6, maxTokens: 4096, reasoningEffort: 'medium', enabled: true },
  // Light tier
  { role: 'fact_checker', name: 'Fact Checker', nameZh: '事实核查', providerId: 'openai', modelId: 'gpt-4o-mini', temperature: 0.1, maxTokens: 2048, reasoningEffort: 'light', enabled: true },
  { role: 'continuity_checker', name: 'Continuity Checker', nameZh: '连续性检查', providerId: 'openai', modelId: 'gpt-4o-mini', temperature: 0.1, maxTokens: 2048, reasoningEffort: 'light', enabled: true },
  { role: 'pacing_controller', name: 'Pacing Controller', nameZh: '节奏控制', providerId: 'openai', modelId: 'gpt-4o-mini', temperature: 0.3, maxTokens: 2048, reasoningEffort: 'light', enabled: true },
  { role: 'foreshadowing_tracker', name: 'Foreshadowing Tracker', nameZh: '伏笔追踪', providerId: 'openai', modelId: 'gpt-4o-mini', temperature: 0.2, maxTokens: 2048, reasoningEffort: 'light', enabled: true },
  { role: 'observer', name: 'Observer', nameZh: '观察者', providerId: 'openai', modelId: 'gpt-4o-mini', temperature: 0.2, maxTokens: 2048, reasoningEffort: 'light', enabled: true },
  { role: 'radar', name: 'Radar', nameZh: '雷达', providerId: 'openai', modelId: 'gpt-4o-mini', temperature: 0.5, maxTokens: 2048, reasoningEffort: 'light', enabled: true },
]

// --- localStorage helpers ---

const TIER_PRESETS_KEY = 'conovel-tier-presets'

function loadTierPresets(): TierPreset[] {
  try {
    const raw = localStorage.getItem(TIER_PRESETS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length === 3) return parsed
    }
  } catch { /* ignore */ }
  // Default presets: use strong defaults for all tiers
  return [
    { tier: 'strong', providerId: 'openai', modelId: 'gpt-4o' },
    { tier: 'medium', providerId: 'openai', modelId: 'gpt-4o-mini' },
    { tier: 'light', providerId: 'openai', modelId: 'gpt-4o-mini' },
  ]
}

function saveTierPresets(presets: TierPreset[]) {
  try {
    localStorage.setItem(TIER_PRESETS_KEY, JSON.stringify(presets))
  } catch { /* ignore */ }
}

// --- Store ---

interface AgentConfigStore {
  agents: AgentAssignment[]
  tierPresets: TierPreset[]
  loaded: boolean
  loading: boolean

  init: () => Promise<void>
  updateAgent: (role: string, data: Partial<AgentAssignment>) => Promise<void>
  batchAssign: (providerId: string, modelId: string, roles?: string[]) => Promise<void>
  setTierPreset: (tier: TierLevel, providerId: string, modelId: string) => void
  batchAssignByTier: (tier: TierLevel) => Promise<void>
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
  tierPresets: loadTierPresets(),
  loaded: false,
  loading: false,

  init: async () => {
    if (get().loaded) return
    set({ loading: true })
    try {
      const data = await agentsApi.listConfig()
      const agents = data.config ?? data ?? []
      if (Array.isArray(agents) && agents.length > 0) {
        // Ensure all agents have reasoningEffort (migrate old configs)
        const migrated = agents.map((a: AgentAssignment) => ({
          ...a,
          reasoningEffort: a.reasoningEffort ?? inferTier(a.role),
        }))
        set({ agents: migrated, loaded: true, loading: false })
      } else {
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

  setTierPreset: (tier, providerId, modelId) => {
    const presets = get().tierPresets.map((p) =>
      p.tier === tier ? { ...p, providerId, modelId } : p,
    )
    set({ tierPresets: presets })
    saveTierPresets(presets)
  },

  batchAssignByTier: async (tier) => {
    const preset = get().tierPresets.find((p) => p.tier === tier)
    if (!preset) return

    const targetRoles = TIER_AGENT_MAP[tier]
    const next = get().agents.map((a) => {
      if (!targetRoles.includes(a.role)) return a
      return { ...a, providerId: preset.providerId, modelId: preset.modelId }
    })
    set({ agents: next })
    persistAgents(next)
  },

  resetToDefaults: async () => {
    const defaults = loadTierPresets()
    set({ agents: DEFAULT_AGENTS, tierPresets: defaults })
    saveTierPresets(defaults)
    persistAgents(DEFAULT_AGENTS)
  },

  getAgentByRole: (role) => get().agents.find((a) => a.role === role),
}))

// --- Helpers ---

/** Infer tier from role name using the static mapping. */
function inferTier(role: string): TierLevel {
  for (const [tier, roles] of Object.entries(TIER_AGENT_MAP)) {
    if (roles.includes(role)) return tier as TierLevel
  }
  return 'medium'
}
