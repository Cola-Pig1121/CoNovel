import { useAgentConfigStore } from '@/stores/agentConfigStore'

type AgentCategory = 'core' | 'quality' | 'auxiliary'

const CATEGORY_META: Record<AgentCategory, { label: string; description: string }> = {
  core: {
    label: '核心智能体',
    description: '主要写作和推理智能体',
  },
  quality: {
    label: '质量智能体',
    description: '审阅、编辑和质量控制',
  },
  auxiliary: {
    label: '辅助智能体',
    description: '支持和系统级智能体',
  },
}

export default function Agents() {
  const { agents } = useAgentConfigStore()

  const grouped = Object.entries(CATEGORY_META).map(([key, meta]) => ({
    key: key as AgentCategory,
    ...meta,
    agents: agents.filter((a) => {
      if (key === 'core') return ['executive_editor', 'story_architect', 'narrative_writer', 'character_designer', 'character_intelligence'].includes(a.role)
      if (key === 'quality') return ['reviewer', 'editor', 'de_ai_editor', 'fact_checker', 'continuity_checker', 'pacing_controller', 'foreshadowing_tracker'].includes(a.role)
      return ['style_analyzer', 'observer', 'radar', 'reflector'].includes(a.role)
    }),
  }))

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-8 py-6">
        <h1 className="font-serif text-3xl">智能体矩阵</h1>
        <p className="text-muted text-sm mt-1">
          监控和配置所有写作智能体
        </p>
      </header>

      {/* Content */}
      <main className="px-8 py-8 space-y-12">
        {grouped.map((group) => (
          <section key={group.key}>
            <div className="mb-4">
              <h2 className="font-serif text-xl">{group.label}</h2>
              <p className="text-muted text-sm mt-1">{group.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.agents.map((agent) => (
                <div
                  key={agent.name}
                  className="border border-border p-6 rounded-none hover:border-foreground transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-serif text-lg leading-tight">
                        {agent.nameZh}
                      </h3>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted mt-1">
                        {agent.name}
                      </p>
                    </div>
                    <span
                      className={`w-2 h-2 mt-2 rounded-none ${
                        agent.enabled
                          ? 'bg-foreground'
                          : 'bg-muted/30'
                      }`}
                      title={agent.enabled ? 'Enabled' : 'Disabled'}
                    />
                  </div>

                  <p className="text-sm text-muted mb-4">{agent.role}</p>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
                        模型
                      </span>
                      <span className="text-foreground">{agent.modelId ?? '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
                        温度
                      </span>
                      <span className="text-foreground">
                        {agent.temperature?.toFixed(1) ?? '—'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}
