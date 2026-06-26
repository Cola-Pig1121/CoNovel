'use client';

import { useState, useEffect, useCallback } from 'react';

// Provider Manager - 模型供应商管理组件
// 配置持久化到 ~/.config/conovel/providers.json

interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  apiFormat: 'openai' | 'anthropic' | 'responses';
  apiKey: string;
  models: ModelEntry[];
  status: 'connected' | 'disconnected' | 'error';
  enabled: boolean;
}

interface ModelEntry {
  id: string;
  contextWindow: number;
}

const EMPTY_PROVIDER: Provider = {
  id: '',
  name: '',
  baseUrl: '',
  apiFormat: 'openai',
  apiKey: '',
  models: [],
  status: 'disconnected',
  enabled: true,
};

export function ProviderManager() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddModelModal, setShowAddModelModal] = useState(false);
  const [newModelId, setNewModelId] = useState('');
  const [newModelContext, setNewModelContext] = useState(200000);

  // Load from API on mount
  useEffect(() => {
    fetch('/api/config?type=providers')
      .then(r => r.json())
      .then(data => {
        setProviders(data.providers || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Save to API
  const saveProviders = useCallback(async (updated: Provider[]) => {
    setProviders(updated);
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'providers', providers: updated }),
    });
  }, []);

  // When editing provider changes, keep editing reference in sync
  useEffect(() => {
    if (editingProvider) {
      const fresh = providers.find(p => p.id === editingProvider.id);
      if (fresh) setEditingProvider(fresh);
    }
  }, [providers]);

  const handleAddProvider = async (provider: Omit<Provider, 'id' | 'status'>) => {
    const newProvider: Provider = {
      ...provider,
      id: provider.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      status: 'disconnected',
    };
    const updated = [...providers, newProvider];
    await saveProviders(updated);
    setEditingProvider(newProvider);
    setShowAddModal(false);
  };

  const handleDeleteProvider = async (id: string) => {
    const updated = providers.filter(p => p.id !== id);
    await saveProviders(updated);
    if (editingProvider?.id === id) setEditingProvider(null);
  };

  const handleToggleProvider = async (id: string) => {
    const updated = providers.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p);
    await saveProviders(updated);
    if (editingProvider?.id === id) {
      const fresh = updated.find(p => p.id === id);
      if (fresh) setEditingProvider(fresh);
    }
  };

  const handleSaveEditing = async () => {
    if (!editingProvider) return;
    const updated = providers.map(p => p.id === editingProvider.id ? editingProvider : p);
    await saveProviders(updated);
  };

  const handleAddModel = async () => {
    if (!editingProvider || !newModelId) return;
    const model: ModelEntry = { id: newModelId, contextWindow: newModelContext };
    const updatedProvider = {
      ...editingProvider,
      models: [...editingProvider.models, model],
    };
    const updated = providers.map(p => p.id === editingProvider.id ? updatedProvider : p);
    await saveProviders(updated);
    setEditingProvider(updatedProvider);
    setShowAddModelModal(false);
    setNewModelId('');
    setNewModelContext(200000);
  };

  const handleDeleteModel = async (providerId: string, modelId: string) => {
    const updated = providers.map(p => {
      if (p.id === providerId) {
        return { ...p, models: p.models.filter(m => m.id !== modelId) };
      }
      return p;
    });
    await saveProviders(updated);
    // Sync editing state
    const fresh = updated.find(p => p.id === providerId);
    if (fresh) setEditingProvider(fresh);
  };

  if (loading) return <div className="text-muted text-sm">加载配置中...</div>;

  return (
    <div className="flex gap-8">
      {/* Provider List */}
      <div className="w-64 flex-shrink-0">
        <div className="mb-4">
          <h3 className="label-editorial text-muted">供应商列表</h3>
        </div>
        <div className="space-y-2">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className={`w-full text-left px-4 py-3 text-sm transition-colors border ${
                editingProvider?.id === provider.id
                  ? 'border-foreground bg-foreground/5'
                  : 'border-border hover:border-foreground/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setEditingProvider(provider)}
                  className="flex-1 text-left"
                >
                  <span className={`font-sans ${!provider.enabled ? 'text-muted line-through' : ''}`}>{provider.name}</span>
                </button>
                <button
                  onClick={() => handleToggleProvider(provider.id)}
                  className={`ml-2 w-9 h-5 rounded-full transition-colors relative ${
                    provider.enabled ? 'bg-foreground' : 'bg-muted/30'
                  }`}
                  title={provider.enabled ? '点击禁用' : '点击启用'}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-background transition-transform ${
                    provider.enabled ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setShowAddModal(true)} className="w-full mt-4 px-4 py-3 text-sm border border-border hover:border-foreground transition-colors">
          + 添加供应商
        </button>
        <p className="text-xs text-muted mt-3 font-mono">
          配置目录: ~/.config/conovel/
        </p>
      </div>

      {/* Provider Configuration Panel */}
      {editingProvider ? (
        <div className="flex-1">
          <div className="card-editorial">
            <h3 className="font-serif text-lg mb-6">供应商配置</h3>
            <div className="space-y-6">
              <div>
                <label className="label-editorial block mb-2">名称</label>
                <input type="text" value={editingProvider.name} onChange={(e) => setEditingProvider({ ...editingProvider, name: e.target.value })} className="input-editorial" placeholder="如：智谱 GLM" />
              </div>
              <div>
                <label className="label-editorial block mb-2">Base URL</label>
                <input type="url" value={editingProvider.baseUrl} onChange={(e) => setEditingProvider({ ...editingProvider, baseUrl: e.target.value })} className="input-editorial" placeholder="https://api.example.com/v1" />
              </div>
              <div>
                <label className="label-editorial block mb-2">API Key</label>
                <input type="password" value={editingProvider.apiKey} onChange={(e) => setEditingProvider({ ...editingProvider, apiKey: e.target.value })} className="input-editorial" placeholder="输入 API Key" />
              </div>
              <div>
                <label className="label-editorial block mb-2">API 格式</label>
                <select value={editingProvider.apiFormat} onChange={(e) => setEditingProvider({ ...editingProvider, apiFormat: e.target.value as Provider['apiFormat'] })} className="input-editorial">
                  <option value="openai">Chat Completions (/chat/completions)</option>
                  <option value="anthropic">Anthropic Messages (/v1/messages)</option>
                  <option value="responses">Responses (/responses)</option>
                </select>
              </div>

              {/* Model List */}
              <div>
                <label className="label-editorial block mb-2">模型列表</label>
                <div className="space-y-2 mb-3">
                  {editingProvider.models.map((model) => (
                    <div key={model.id} className="flex items-center justify-between py-2 px-3 border border-border">
                      <div>
                        <p className="font-mono text-sm">{model.id}</p>
                        <p className="text-xs text-muted mt-0.5">上下文窗口: {model.contextWindow.toLocaleString()}</p>
                      </div>
                      <button onClick={() => handleDeleteModel(editingProvider.id, model.id)} className="text-muted hover:text-foreground text-xs">删除</button>
                    </div>
                  ))}
                  {editingProvider.models.length === 0 && (
                    <p className="text-sm text-muted py-2">暂无模型</p>
                  )}
                </div>
                <button onClick={() => setShowAddModelModal(true)} className="btn-editorial text-xs">+ 添加模型</button>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4 border-t border-border">
                <button onClick={() => handleDeleteProvider(editingProvider.id)} className="text-sm text-red-600 hover:text-red-700">删除供应商</button>
                <div className="flex-1" />
                <button onClick={() => setEditingProvider(null)} className="btn-editorial">取消</button>
                <button onClick={handleSaveEditing} className="btn-editorial-primary">保存配置</button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted text-sm">
          选择左侧供应商进行配置
        </div>
      )}

      {/* Add Model Modal */}
      {showAddModelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border w-96 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-lg">添加模型</h3>
              <button onClick={() => setShowAddModelModal(false)} className="text-muted hover:text-foreground">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label-editorial block mb-2">模型 ID</label>
                <input type="text" value={newModelId} onChange={(e) => setNewModelId(e.target.value)} className="input-editorial" placeholder="如：gpt-4o, deepseek-chat" />
              </div>
              <div>
                <label className="label-editorial block mb-2">上下文窗口</label>
                <input type="number" value={newModelContext} onChange={(e) => setNewModelContext(Number(e.target.value))} className="input-editorial" />
              </div>
            </div>
            <div className="flex gap-4 mt-6 pt-4 border-t border-border">
              <button onClick={() => setShowAddModelModal(false)} className="btn-editorial flex-1">取消</button>
              <button onClick={handleAddModel} className="btn-editorial-primary flex-1" disabled={!newModelId}>保存</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Provider Modal */}
      {showAddModal && (
        <AddProviderModal onAdd={handleAddProvider} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}

function AddProviderModal({ onAdd, onClose }: { onAdd: (p: Omit<Provider, 'id' | 'status'>) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('http://localhost:4000');
  const [apiKey, setApiKey] = useState('');
  const [apiFormat, setApiFormat] = useState<Provider['apiFormat']>('openai');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border w-[32rem] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-serif text-lg">添加供应商</h3>
            <p className="text-xs text-muted mt-1">通过 LiteLLM 网关统一管理模型调用</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground">✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label-editorial block mb-2">名称</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-editorial" placeholder="如：My LiteLLM Gateway" />
          </div>
          <div>
            <label className="label-editorial block mb-2">Base URL</label>
            <input type="url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="input-editorial" placeholder="http://localhost:4000" />
            <p className="text-xs text-muted mt-1">LiteLLM 默认端口 4000，格式为 OpenAI 兼容</p>
          </div>
          <div>
            <label className="label-editorial block mb-2">API Key</label>
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="input-editorial" placeholder="sk-... 或 LiteLLM Master Key" />
          </div>
          <div>
            <label className="label-editorial block mb-2">API 格式</label>
            <select value={apiFormat} onChange={(e) => setApiFormat(e.target.value as Provider['apiFormat'])} className="input-editorial">
              <option value="openai">OpenAI Compatible — /chat/completions (LiteLLM 默认)</option>
              <option value="anthropic">Anthropic — /v1/messages (直连 Anthropic)</option>
              <option value="responses">Responses — /responses</option>
            </select>
          </div>
        </div>
        <div className="flex gap-4 mt-6 pt-4 border-t border-border">
          <button onClick={onClose} className="btn-editorial flex-1">取消</button>
          <button onClick={() => { if (name && baseUrl) onAdd({ name, baseUrl, apiKey, apiFormat, models: [], enabled: true }); }} className="btn-editorial-primary flex-1" disabled={!name || !baseUrl}>添加供应商</button>
        </div>
      </div>
    </div>
  );
}
