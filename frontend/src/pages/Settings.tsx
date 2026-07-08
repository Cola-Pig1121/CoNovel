import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProviderStore } from '@/stores/providerStore'
import { useAgentConfigStore, TIER_AGENT_MAP, TIER_LABELS } from '@/stores/agentConfigStore'
import type { TierLevel } from '@/stores/agentConfigStore'
import type { Provider, ModelEntry } from '@/lib/types'

type SettingsTab = 'providers' | 'agentConfig' | 'skills'

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('providers')
  const initProviders = useProviderStore((s) => s.init)
  const initAgents = useAgentConfigStore((s) => s.init)

  useEffect(() => {
    initProviders()
    initAgents()
  }, [initProviders, initAgents])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-8 py-6">
        <Link to="/" className="text-[10px] uppercase tracking-[0.2em] text-muted hover:text-foreground transition-colors">
          ← 首页
        </Link>
        <h1 className="font-serif text-3xl">设置</h1>
        <p className="text-muted text-sm mt-1">
          配置 LLM Provider 和 Agent 模型分配（数据存储在浏览器本地）
        </p>
      </header>

      <div className="border-b border-border px-8">
        <div className="flex gap-8">
          {([
            { key: 'providers', label: 'Providers' },
            { key: 'agentConfig', label: 'Agent Model Config' },
            { key: 'skills', label: '技能' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`text-xs uppercase tracking-widest px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="px-8 py-8">
        {activeTab === 'providers' && <ProvidersPanel />}
        {activeTab === 'agentConfig' && <AgentConfigPanel />}
        {activeTab === 'skills' && <SkillsPanel />}
      </main>
    </div>
  )
}

// =============================================================================
// Providers Panel
// =============================================================================

function ProvidersPanel() {
  const { providers, addProvider, updateProvider, deleteProvider, toggleProvider, resetToDefaults } =
    useProviderStore()
  const [editing, setEditing] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-serif text-xl">LLM Providers</h2>
          <p className="text-muted text-sm mt-1">
            管理 API 提供商连接，所有配置保存在浏览器 localStorage
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={resetToDefaults}
            className="text-xs uppercase tracking-widest border border-border px-4 py-2 hover:border-foreground transition-colors"
          >
            重置默认
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="text-xs uppercase tracking-widest border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors"
          >
            + 添加 Provider
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <AddProviderForm
          onAdd={(data) => {
            addProvider(data)
            setShowAdd(false)
          }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* Provider list */}
      <div className="space-y-3">
        {providers.map((provider) => (
          <div key={provider.id}>
            {editing === provider.id ? (
              <EditProviderForm
                provider={provider}
                onSave={(data) => {
                  updateProvider(provider.id, data)
                  setEditing(null)
                }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div className="border border-border p-6 hover:border-foreground transition-colors flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-serif text-lg">{provider.name}</h3>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
                      {provider.models.length} 模型
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
                      {provider.apiFormat}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1">{provider.baseUrl}</p>
                  <p className="text-[10px] text-muted mt-1 font-mono">
                    {provider.apiKey ? `sk-...${provider.apiKey.slice(-4)}` : '未配置 API Key'}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleProvider(provider.id)}
                    className={`w-10 h-5 border transition-colors flex items-center ${
                      provider.enabled
                        ? 'bg-foreground border-foreground justify-end'
                        : 'bg-transparent border-border justify-start'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 mx-0.5 transition-colors ${
                        provider.enabled ? 'bg-background' : 'bg-muted/40'
                      }`}
                    />
                  </button>

                  <button
                    onClick={() => setEditing(provider.id)}
                    className="text-[10px] uppercase tracking-[0.2em] text-muted hover:text-foreground transition-colors px-2 py-1"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => deleteProvider(provider.id)}
                    className="text-[10px] uppercase tracking-[0.2em] text-muted hover:text-foreground transition-colors px-2 py-1"
                  >
                    删除
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Add Provider Form ---

function AddProviderForm({
  onAdd,
  onCancel,
}: {
  onAdd: (data: Omit<Provider, 'id'>) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiFormat, setApiFormat] = useState<'openai' | 'anthropic' | 'custom'>('openai')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !baseUrl) return
    onAdd({ name, baseUrl, apiKey, apiFormat, models: [], enabled: true })
  }

  return (
    <form onSubmit={handleSubmit} className="border border-border p-6 space-y-4">
      <h3 className="font-serif text-lg">添加 Provider</h3>
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-1">名称</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="我的 Provider"
            className="w-full border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-foreground transition-colors"
            required
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-1">API Format</span>
          <select
            value={apiFormat}
            onChange={(e) => setApiFormat(e.target.value as 'openai' | 'anthropic' | 'custom')}
            className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-foreground transition-colors"
          >
            <option value="openai">OpenAI Compatible</option>
            <option value="anthropic">Anthropic</option>
            <option value="custom">Custom</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-1">Base URL</span>
        <input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://api.example.com/v1"
          className="w-full border border-border bg-transparent px-3 py-2 text-sm font-mono focus:outline-none focus:border-foreground transition-colors"
          required
        />
      </label>
      <label className="block">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-1">API Key</span>
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          type="password"
          placeholder="sk-..."
          className="w-full border border-border bg-transparent px-3 py-2 text-sm font-mono focus:outline-none focus:border-foreground transition-colors"
        />
      </label>
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs uppercase tracking-widest border border-border px-4 py-2 hover:border-foreground transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          className="text-xs uppercase tracking-widest border border-foreground px-6 py-2 bg-foreground text-background hover:bg-transparent hover:text-foreground transition-colors"
        >
          添加
        </button>
      </div>
    </form>
  )
}

// --- Edit Provider Form ---

function EditProviderForm({
  provider,
  onSave,
  onCancel,
}: {
  provider: Provider
  onSave: (data: Partial<Provider>) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(provider.name)
  const [baseUrl, setBaseUrl] = useState(provider.baseUrl)
  const [apiKey, setApiKey] = useState(provider.apiKey)
  const [apiFormat, setApiFormat] = useState(provider.apiFormat)
  const [newModelName, setNewModelName] = useState('')
  const [newModelContext, setNewModelContext] = useState('128000')
  const [newModelOutput, setNewModelOutput] = useState('16384')
  const { addModel, deleteModel } = useProviderStore()

  function handleSave() {
    onSave({ name, baseUrl, apiKey, apiFormat })
  }

  function handleAddModel(e: React.FormEvent) {
    e.preventDefault()
    if (!newModelName) return
    const model: ModelEntry = {
      id: newModelName.toLowerCase().replace(/\s+/g, '-'),
      name: newModelName,
      contextWindow: parseInt(newModelContext) || 128000,
      maxOutput: parseInt(newModelOutput) || 16384,
    }
    addModel(provider.id, model)
    setNewModelName('')
  }

  return (
    <div className="border border-border p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-serif text-lg">编辑 {provider.name}</h3>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="text-xs uppercase tracking-widest border border-border px-4 py-2 hover:border-foreground transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="text-xs uppercase tracking-widest border border-foreground px-6 py-2 bg-foreground text-background hover:bg-transparent hover:text-foreground transition-colors"
          >
            保存
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-1">名称</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-foreground transition-colors"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-1">API Format</span>
          <select
            value={apiFormat}
            onChange={(e) => setApiFormat(e.target.value as 'openai' | 'anthropic' | 'custom')}
            className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-foreground transition-colors"
          >
            <option value="openai">OpenAI Compatible</option>
            <option value="anthropic">Anthropic</option>
            <option value="custom">Custom</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-1">Base URL</span>
        <input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          className="w-full border border-border bg-transparent px-3 py-2 text-sm font-mono focus:outline-none focus:border-foreground transition-colors"
        />
      </label>
      <label className="block">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-1">API Key</span>
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          type="password"
          className="w-full border border-border bg-transparent px-3 py-2 text-sm font-mono focus:outline-none focus:border-foreground transition-colors"
        />
      </label>

      {/* 模型列表 */}
      <div className="border-t border-border pt-4">
        <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted mb-3">模型列表</h4>
        <div className="space-y-2">
          {provider.models.map((m) => (
            <div key={m.id} className="flex items-center justify-between border border-border px-3 py-2">
              <div className="flex items-center gap-4 text-xs">
                <span className="font-mono">{m.name}</span>
                <span className="text-muted">{m.contextWindow ? `${(m.contextWindow / 1000).toFixed(0)}K` : '—'} ctx</span>
                <span className="text-muted">{m.maxOutput ? `${(m.maxOutput / 1000).toFixed(0)}K` : '—'} out</span>
              </div>
              <button
                onClick={() => deleteModel(provider.id, m.id)}
                className="text-[10px] text-muted hover:text-foreground transition-colors"
              >
                删除
              </button>
            </div>
          ))}
        </div>

        {/* 添加模型 */}
        <form onSubmit={handleAddModel} className="flex gap-2 mt-3">
          <input
            value={newModelName}
            onChange={(e) => setNewModelName(e.target.value)}
            placeholder="模型名称"
            className="flex-1 border border-border bg-transparent px-3 py-2 text-xs focus:outline-none focus:border-foreground transition-colors"
          />
          <input
            value={newModelContext}
            onChange={(e) => setNewModelContext(e.target.value)}
            placeholder="上下文"
            className="w-20 border border-border bg-transparent px-3 py-2 text-xs font-mono focus:outline-none focus:border-foreground transition-colors"
          />
          <input
            value={newModelOutput}
            onChange={(e) => setNewModelOutput(e.target.value)}
            placeholder="输出"
            className="w-20 border border-border bg-transparent px-3 py-2 text-xs font-mono focus:outline-none focus:border-foreground transition-colors"
          />
          <button
            type="submit"
            className="text-xs uppercase tracking-widest border border-foreground px-3 py-2 hover:bg-foreground hover:text-background transition-colors"
          >
            +
          </button>
        </form>
      </div>
    </div>
  )
}

// =============================================================================
// Agent Config Panel
// =============================================================================

function AgentConfigPanel() {
  const { agents, tierPresets, updateAgent, setTierPreset, batchAssignByTier, resetToDefaults } =
    useAgentConfigStore()
  const providers = useProviderStore((s) => s.providers)
  const enabledProviders = providers.filter((p) => p.enabled)

  function getModelsForProvider(providerId: string) {
    const p = providers.find((pp) => pp.id === providerId)
    return p?.models ?? []
  }

  const tierLevels: TierLevel[] = ['strong', 'medium', 'light']

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-serif text-xl">Agent 模型配置</h2>
          <p className="text-muted text-sm mt-1">
            为每个 Agent 分配 Provider 和模型，调整参数
          </p>
        </div>
        <button
          onClick={resetToDefaults}
          className="text-xs uppercase tracking-widest border border-border px-4 py-2 hover:border-foreground transition-colors"
        >
          重置默认
        </button>
      </div>

      {/* ── Tier Configuration Cards ── */}
      <div className="grid grid-cols-3 gap-4">
        {tierLevels.map((tier) => {
          const meta = TIER_LABELS[tier]
          const preset = tierPresets.find((p) => p.tier === tier)
          const agentCount = TIER_AGENT_MAP[tier].length
          return (
            <div
              key={tier}
              className="border border-border p-5 space-y-4 hover:border-foreground/30 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-base">{meta.name}</h3>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
                    {meta.nameZh}
                  </span>
                </div>
                <p className="text-xs text-muted mt-1">{meta.description}</p>
                <p className="text-[10px] text-muted mt-0.5">
                  {agentCount} 个 Agent
                </p>
              </div>

              {/* Provider dropdown */}
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-1">Provider</span>
                <select
                  value={preset?.providerId ?? ''}
                  onChange={(e) => {
                    const newProviderId = e.target.value
                    const models = getModelsForProvider(newProviderId)
                    const currentModelId = preset?.modelId ?? ''
                    const newModelId = models.some((m) => m.id === currentModelId)
                      ? currentModelId
                      : models[0]?.id ?? ''
                    setTierPreset(tier, newProviderId, newModelId)
                  }}
                  className="w-full border border-border bg-background text-xs px-3 py-2 focus:outline-none focus:border-foreground transition-colors"
                >
                  {enabledProviders.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>

              {/* Model dropdown */}
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-1">Model</span>
                <select
                  value={preset?.modelId ?? ''}
                  onChange={(e) => {
                    setTierPreset(tier, preset?.providerId ?? enabledProviders[0]?.id ?? '', e.target.value)
                  }}
                  className="w-full border border-border bg-background text-xs px-3 py-2 focus:outline-none focus:border-foreground transition-colors"
                >
                  {getModelsForProvider(preset?.providerId ?? '').map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </label>

              {/* Assign All button */}
              <button
                onClick={() => batchAssignByTier(tier)}
                className="w-full text-xs uppercase tracking-widest border border-foreground px-4 py-2 bg-foreground text-background hover:bg-transparent hover:text-foreground transition-colors"
              >
                全部分配
              </button>

              {/* Agent list preview */}
              <div className="text-[10px] text-muted font-mono leading-relaxed">
                {TIER_AGENT_MAP[tier].map((role) => {
                  const agent = agents.find((a) => a.role === role)
                  return (
                    <div key={role} className="flex justify-between">
                      <span>{agent?.nameZh ?? role}</span>
                      <span className="text-foreground/40">{agent?.modelId ?? '—'}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Agent Table ── */}
      <div className="border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-muted font-normal">Agent</th>
              <th className="text-left px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-muted font-normal">Tier</th>
              <th className="text-left px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-muted font-normal">Provider</th>
              <th className="text-left px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-muted font-normal">Model</th>
              <th className="text-left px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-muted font-normal">Temperature</th>
              <th className="text-left px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-muted font-normal">Max Tokens</th>
              <th className="text-left px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-muted font-normal">状态</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => {
              const models = getModelsForProvider(agent.providerId)
              return (
                <tr
                  key={agent.role}
                  className="border-b border-border last:border-b-0 hover:bg-foreground/[0.02] transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="font-serif text-sm">{agent.nameZh}</div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted mt-0.5">{agent.role}</div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={agent.reasoningEffort ?? 'medium'}
                      onChange={(e) => updateAgent(agent.role, { reasoningEffort: e.target.value as TierLevel })}
                      className="border border-border bg-transparent text-xs px-3 py-2 focus:outline-none focus:border-foreground transition-colors"
                    >
                      {tierLevels.map((t) => (
                        <option key={t} value={t}>{TIER_LABELS[t].name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={agent.providerId}
                      onChange={(e) => {
                        const newProviderId = e.target.value
                        const newModels = getModelsForProvider(newProviderId)
                        updateAgent(agent.role, {
                          providerId: newProviderId,
                          modelId: newModels[0]?.id ?? '',
                        })
                      }}
                      className="border border-border bg-transparent text-xs px-3 py-2 focus:outline-none focus:border-foreground transition-colors w-full"
                    >
                      {enabledProviders.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={agent.modelId}
                      onChange={(e) => updateAgent(agent.role, { modelId: e.target.value })}
                      className="border border-border bg-transparent text-xs px-3 py-2 focus:outline-none focus:border-foreground transition-colors w-full"
                    >
                      {models.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={agent.temperature}
                        onChange={(e) => updateAgent(agent.role, { temperature: parseFloat(e.target.value) })}
                        className="flex-1 accent-foreground"
                      />
                      <span className="text-xs text-muted w-8 text-right tabular-nums">
                        {agent.temperature.toFixed(1)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      value={agent.maxTokens}
                      onChange={(e) => updateAgent(agent.role, { maxTokens: parseInt(e.target.value) || 2048 })}
                      className="w-20 border border-border bg-transparent text-xs px-3 py-2 font-mono focus:outline-none focus:border-foreground transition-colors"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => updateAgent(agent.role, { enabled: !agent.enabled })}
                      className={`w-10 h-5 border transition-colors flex items-center ${
                        agent.enabled
                          ? 'bg-foreground border-foreground justify-end'
                          : 'bg-transparent border-border justify-start'
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 mx-0.5 transition-colors ${
                          agent.enabled ? 'bg-background' : 'bg-muted/40'
                        }`}
                      />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// =============================================================================
// Skills Panel
// =============================================================================

interface SkillEntry {
  name: string
  source: 'builtin' | 'custom'
  description: string
  filePath?: string
}

const BUILTIN_SKILLS: SkillEntry[] = [
  { name: 'polish', source: 'builtin', description: '文本润色 — 提升文笔质量和表现力' },
  { name: 'de-ai', source: 'builtin', description: '去 AI 味 — 移除 AI 典型写作痕迹' },
  { name: 'fact-check', source: 'builtin', description: '事实核查 — 验证情节一致性' },
  { name: 'character-intelligence', source: 'builtin', description: '角色智能 — 分析角色行为一致性' },
  { name: 'pacing', source: 'builtin', description: '节奏分析 — 检测叙事节奏问题' },
]

function SkillsPanel() {
  const [skills, setSkills] = useState<SkillEntry[]>(BUILTIN_SKILLS)
  const [importMode, setImportMode] = useState(false)
  const [importName, setImportName] = useState('')
  const [importContent, setImportContent] = useState('')
  const [importSource, setImportSource] = useState('')
  const [importDesc, setImportDesc] = useState('')
  const [importMessage, setImportMessage] = useState<string | null>(null)

  function handleImport() {
    if (!importName.trim() || !importContent.trim()) {
      setImportMessage('请填写技能名称和内容')
      return
    }
    // Add as custom skill (stored in state; in production would persist to backend)
    setSkills((prev) => [
      ...prev,
      {
        name: importName.trim(),
        source: 'custom',
        description: importDesc.trim() || `自定义技能: ${importName.trim()}`,
        filePath: importSource.trim() || undefined,
      },
    ])
    setImportMessage(`技能 "${importName.trim()}" 已导入`)
    setImportName('')
    setImportContent('')
    setImportSource('')
    setImportDesc('')
    setTimeout(() => setImportMessage(null), 3000)
  }

  function handleRemoveSkill(name: string) {
    setSkills((prev) => prev.filter((s) => s.name !== name))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-serif text-xl">技能管理</h2>
          <p className="text-muted text-sm mt-1">
            管理 Agent 使用的技能（.md 格式 prompt 模板）
          </p>
        </div>
        <button
          onClick={() => setImportMode(!importMode)}
          className="text-xs uppercase tracking-widest border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors"
        >
          {importMode ? '收起' : '+ 导入技能'}
        </button>
      </div>

      {/* Import form */}
      {importMode && (
        <div className="border border-border p-6 space-y-4">
          <h3 className="font-serif text-lg">导入自定义技能</h3>
          <p className="text-xs text-muted">
            支持从本地 .md 文件导入技能 prompt 模板。粘贴文件内容或提供文件路径。
          </p>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-1">
                技能名称
              </span>
              <input
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                placeholder="my-skill"
                className="w-full border border-border bg-transparent px-3 py-2 text-sm font-mono focus:outline-none focus:border-foreground transition-colors"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-1">
                文件路径（可选）
              </span>
              <input
                value={importSource}
                onChange={(e) => setImportSource(e.target.value)}
                placeholder="/path/to/skill.md"
                className="w-full border border-border bg-transparent px-3 py-2 text-sm font-mono focus:outline-none focus:border-foreground transition-colors"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-1">
              描述
            </span>
            <input
              value={importDesc}
              onChange={(e) => setImportDesc(e.target.value)}
              placeholder="技能描述..."
              className="w-full border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-foreground transition-colors"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-1">
              技能内容（.md 格式）
            </span>
            <textarea
              value={importContent}
              onChange={(e) => setImportContent(e.target.value)}
              placeholder="# Skill Name&#10;&#10;Your skill prompt template here..."
              rows={8}
              className="w-full border border-border bg-transparent px-3 py-2 text-sm font-mono focus:outline-none focus:border-foreground transition-colors placeholder:text-muted resize-none"
            />
          </label>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setImportMode(false)}
              className="text-xs uppercase tracking-widest border border-border px-4 py-2 hover:border-foreground transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleImport}
              className="text-xs uppercase tracking-widest border border-foreground px-6 py-2 bg-foreground text-background hover:bg-transparent hover:text-foreground transition-colors"
            >
              导入
            </button>
          </div>
          {importMessage && (
            <p className="text-xs text-foreground mt-2">{importMessage}</p>
          )}
        </div>
      )}

      {/* Skill list */}
      <div className="space-y-2">
        {skills.map((skill) => (
          <div
            key={skill.name}
            className="border border-border p-4 flex items-center justify-between hover:border-foreground transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm">{skill.name}</span>
                <span
                  className={`text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 border ${
                    skill.source === 'builtin'
                      ? 'border-border text-muted'
                      : 'border-foreground text-foreground'
                  }`}
                >
                  {skill.source === 'builtin' ? '内置' : '自定义'}
                </span>
              </div>
              <p className="text-xs text-muted mt-1">{skill.description}</p>
              {skill.filePath && (
                <p className="text-[10px] text-muted font-mono mt-1">{skill.filePath}</p>
              )}
            </div>
            {skill.source === 'custom' && (
              <button
                onClick={() => handleRemoveSkill(skill.name)}
                className="text-[10px] uppercase tracking-[0.2em] text-muted hover:text-foreground transition-colors px-2 py-1"
              >
                删除
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
