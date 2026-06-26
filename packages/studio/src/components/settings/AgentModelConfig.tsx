'use client';

import { useState, useEffect, useCallback } from 'react';

// Agent Model Config - Per-Agent模型配置组件
// 配置持久化到 ~/.config/conovel/agents.json

interface AgentConfig {
  role: string;
  name: string;
  nameZh: string;
  provider: string;
  modelId: string;
  temperature: number;
  maxTokens: number;
  contextWindow: number;
  reasoningEffort?: string;
}

interface Provider {
  id: string;
  name: string;
  models: { id: string; supportsReasoning?: boolean; reasoningLevels?: string[] }[];
  enabled: boolean;
}

const AGENT_ROLES: Array<{ role: string; name: string; nameZh: string; category: string }> = [
  { role: 'architect', name: 'Architect', nameZh: '故事架构师', category: '核心创作' },
  { role: 'writer', name: 'Writer', nameZh: '写作特工', category: '核心创作' },
  { role: 'character-intelligence', name: 'Character Intelligence', nameZh: '角色智能体', category: '核心创作' },
  { role: 'reviewer', name: 'Reviewer', nameZh: '审阅官', category: '质量控制' },
  { role: 'editor', name: 'Editor', nameZh: '编辑', category: '质量控制' },
  { role: 'de-ai-editor', name: 'De-AI Editor', nameZh: '去AI味编辑', category: '质量控制' },
  { role: 'fact-checker', name: 'Fact Checker', nameZh: '事实核查官', category: '质量控制' },
  { role: 'continuity', name: 'Continuity', nameZh: '连续性检查官', category: '质量控制' },
  { role: 'pacing-controller', name: 'Pacing Controller', nameZh: '节奏控制官', category: '质量控制' },
  { role: 'style-analyzer', name: 'Style Analyzer', nameZh: '风格分析师', category: '辅助' },
  { role: 'observer', name: 'Observer', nameZh: '观察者', category: '辅助' },
  { role: 'character-designer', name: 'Character Designer', nameZh: '角色设计师', category: '辅助' },
  { role: 'foreshadowing', name: 'Foreshadowing', nameZh: '伏笔管理官', category: '辅助' },
  { role: 'radar', name: 'Radar', nameZh: '趋势雷达', category: '辅助' },
  { role: 'reflector', name: 'Reflector', nameZh: '反思官', category: '辅助' },
];

export function AgentModelConfig() {
  const [configs, setConfigs] = useState<AgentConfig[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string>('architect');

  // Load from API on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/config?type=agents').then(r => r.json()),
      fetch('/api/config?type=providers').then(r => r.json()),
    ]).then(([agentsData, providersData]) => {
      setConfigs(agentsData.agents || []);
      setProviders(providersData.providers || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Save single agent config
  const saveAgentConfig = useCallback(async (role: string, updates: Partial<AgentConfig>) => {
    setConfigs(prev => prev.map(c => c.role === role ? { ...c, ...updates } : c));
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'single-agent', role, updates }),
    });
  }, []);

  // Batch save all agents
  const saveAllConfigs = useCallback(async (newConfigs: AgentConfig[]) => {
    setConfigs(newConfigs);
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'agents', agents: newConfigs }),
    });
  }, []);

  const selectedConfig = configs.find(c => c.role === selectedAgent);

  // Get models from providers for a specific provider id
  const getModelsForProvider = (providerId: string): string[] => {
    const provider = providers.find(p => p.id === providerId || p.name === providerId);
    return provider?.models.map(m => m.id) || [];
  };

  if (loading) return <div className="text-muted text-sm">加载配置中...</div>;

  const categories = [...new Set(AGENT_ROLES.map(a => a.category))];

  return (
    <div className="flex gap-8">
      {/* Agent List */}
      <div className="w-72 flex-shrink-0">
        <div className="mb-4">
          <h3 className="label-editorial text-muted">Agent 列表</h3>
        </div>
        <div className="space-y-6">
          {categories.map(category => (
            <div key={category}>
              <p className="text-xs text-muted mb-2 font-mono tracking-wider uppercase">{category}</p>
              <div className="space-y-1">
                {AGENT_ROLES.filter(a => a.category === category).map(agent => (
                  <button
                    key={agent.role}
                    onClick={() => setSelectedAgent(agent.role)}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      selectedAgent === agent.role ? 'bg-foreground text-background' : 'hover:bg-foreground/5'
                    }`}
                  >
                    <span className="font-sans">{agent.nameZh}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration Panel */}
      {selectedConfig ? (
        <div className="flex-1">
          <div className="card-editorial">
            <div className="mb-6">
              <h3 className="font-serif text-lg">{selectedConfig.nameZh}</h3>
              <p className="font-mono text-sm text-muted mt-1">{selectedConfig.name}</p>
            </div>
            <div className="space-y-6">
              {/* Model Provider */}
              <div>
                <label className="label-editorial block mb-2">模型供应商</label>
                <select
                  value={selectedConfig.provider}
                  onChange={(e) => {
                    const newProvider = e.target.value;
                    const models = getModelsForProvider(newProvider);
                    saveAgentConfig(selectedConfig.role, {
                      provider: newProvider,
                      modelId: models[0] || '',
                    });
                  }}
                  className="input-editorial"
                >
                  {providers.filter(p => p.enabled).map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Model Selection */}
              <div>
                <label className="label-editorial block mb-2">模型选择</label>
                <select
                  value={selectedConfig.modelId}
                  onChange={(e) => {
                    const modelId = e.target.value;
                    // Check if selected model supports reasoning
                    const provider = providers.find(p => p.name === selectedConfig.provider);
                    const model = provider?.models.find(m => m.id === modelId);
                    const updates: Record<string, any> = { modelId };
                    if (model?.supportsReasoning && !selectedConfig.reasoningEffort) {
                      updates.reasoningEffort = 'medium'; // Default to medium
                    } else if (!model?.supportsReasoning) {
                      updates.reasoningEffort = '';
                    }
                    saveAgentConfig(selectedConfig.role, updates);
                  }}
                  className="input-editorial"
                >
                  {getModelsForProvider(selectedConfig.provider).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Reasoning Effort */}
              {(() => {
                const provider = providers.find(p => p.name === selectedConfig.provider);
                const model = provider?.models.find(m => m.id === selectedConfig.modelId);
                if (!model?.supportsReasoning) return null;
                const levels = model.reasoningLevels || ['low', 'medium', 'high'];
                return (
                  <div>
                    <label className="label-editorial block mb-2">思考强度 (Reasoning Effort)</label>
                    <select
                      value={selectedConfig.reasoningEffort || ''}
                      onChange={(e) => saveAgentConfig(selectedConfig.role, { reasoningEffort: e.target.value })}
                      className="input-editorial"
                    >
                      <option value="">不设置</option>
                      {levels.map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted mt-1">控制模型的思考深度。low=快速, medium=平衡, high=深度推理</p>
                  </div>
                );
              })()}

              {/* Parameters */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-editorial block mb-2">Temperature</label>
                  <input type="number" min="0" max="2" step="0.1" value={selectedConfig.temperature}
                    onChange={(e) => saveAgentConfig(selectedConfig.role, { temperature: parseFloat(e.target.value) })}
                    className="input-editorial" />
                  <p className="text-xs text-muted mt-1">0 = 精确，1 = 创造性</p>
                </div>
                <div>
                  <label className="label-editorial block mb-2">Max Tokens</label>
                  <input type="number" min="256" step="256" value={selectedConfig.maxTokens}
                    onChange={(e) => saveAgentConfig(selectedConfig.role, { maxTokens: parseInt(e.target.value) })}
                    className="input-editorial" />
                </div>
              </div>

              {/* Context Window */}
              <div>
                <label className="label-editorial block mb-2">上下文窗口</label>
                <input type="number" min="4096" step="1000" value={selectedConfig.contextWindow}
                  onChange={(e) => saveAgentConfig(selectedConfig.role, { contextWindow: parseInt(e.target.value) })}
                  className="input-editorial" />
                <p className="text-xs text-muted mt-1">模型支持的最大上下文长度</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 card-editorial">
            <h4 className="font-serif text-sm mb-4">快速配置</h4>
            <p className="text-xs text-muted mb-4">
              按角色复杂度选择模型，平衡质量和成本。选择供应商后，手动指定三个等级的模型。
            </p>

            <TierConfig providers={providers} configs={configs} onSave={saveAllConfigs} />

            <p className="text-xs text-muted mt-3 font-mono">
              配置目录: ~/.config/conovel/
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted text-sm">
          选择左侧Agent进行配置
        </div>
      )}
    </div>
  );
}

// ===== Tier Config Component =====

const DEEP_REASONING_ROLES = ['architect', 'character-intelligence'];
const LIGHTWEIGHT_ROLES = ['fact-checker', 'continuity', 'foreshadowing', 'observer', 'radar'];

function TierConfig({
  providers,
  configs,
  onSave,
}: {
  providers: { name: string; enabled: boolean; models: { id: string }[] }[];
  configs: AgentConfig[];
  onSave: (configs: AgentConfig[]) => void;
}) {
  const enabled = providers.filter(p => p.enabled);
  const allModels = enabled.flatMap(p => p.models.map(m => ({ provider: p.name, modelId: m.id, label: `${p.name} / ${m.id}` })));

  const [provider, setProvider] = useState(enabled[0]?.name || '');
  const [strongModel, setStrongModel] = useState('');
  const [mediumModel, setMediumModel] = useState('');
  const [lightModel, setLightModel] = useState('');

  // Update provider options when providers change
  const providerModels = allModels.filter(m => m.provider === provider);

  const handleApply = () => {
    onSave(configs.map(c => {
      const needsDeep = DEEP_REASONING_ROLES.includes(c.role);
      const isLight = LIGHTWEIGHT_ROLES.includes(c.role);
      let modelId = mediumModel;
      if (needsDeep) modelId = strongModel;
      if (isLight) modelId = lightModel;
      return { ...c, provider, modelId };
    }));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-muted block mb-1">供应商</label>
        <select value={provider} onChange={e => { setProvider(e.target.value); setStrongModel(''); setMediumModel(''); setLightModel(''); }} className="input-editorial">
          {enabled.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-sm text-muted block mb-1">强模型（深度推理）</label>
          <select value={strongModel} onChange={e => setStrongModel(e.target.value)} className="input-editorial text-xs">
            <option value="">未选择</option>
            {providerModels.map(m => <option key={m.modelId} value={m.modelId}>{m.modelId}</option>)}
          </select>
          <p className="text-xs text-muted mt-1">架构师、角色智能体</p>
        </div>
        <div>
          <label className="text-sm text-muted block mb-1">中等模型（创作审阅）</label>
          <select value={mediumModel} onChange={e => setMediumModel(e.target.value)} className="input-editorial text-xs">
            <option value="">未选择</option>
            {providerModels.map(m => <option key={m.modelId} value={m.modelId}>{m.modelId}</option>)}
          </select>
          <p className="text-xs text-muted mt-1">写作、编辑、审阅官等</p>
        </div>
        <div>
          <label className="text-sm text-muted block mb-1">轻量模型（简单检查）</label>
          <select value={lightModel} onChange={e => setLightModel(e.target.value)} className="input-editorial text-xs">
            <option value="">未选择</option>
            {providerModels.map(m => <option key={m.modelId} value={m.modelId}>{m.modelId}</option>)}
          </select>
          <p className="text-xs text-muted mt-1">事实核查、连续性等</p>
        </div>
      </div>

      <button
        onClick={handleApply}
        disabled={!provider || !strongModel || !mediumModel || !lightModel}
        className="btn-editorial-primary text-xs"
      >
        应用分配
      </button>
    </div>
  );
}
