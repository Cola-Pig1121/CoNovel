<script>
  import { onMount } from 'svelte';
  import { api } from '$lib/api';
  import { toasts } from '$lib/stores/toast';

  let providers = $state([]);
  let loading = $state(true);
  let editingProvider = $state(null);
  let showAddModal = $state(false);
  let scanning = $state(false);

  let newName = $state('');
  let newBaseUrl = $state('https://api.openai.com/v1');
  let newApiKey = $state('');
  let newApiFormat = $state('openai');

  const API_FORMATS = [
    { value: 'openai', label: 'OpenAI Compatible (/chat/completions)' },
    { value: 'anthropic', label: 'Anthropic (/v1/messages)' },
  ];

  onMount(loadProviders);

  async function loadProviders() {
    try { const data = await api.get('/api/config?type=providers'); providers = data.providers || []; } catch {}
    loading = false;
  }

  async function saveAll() {
    try { await api.put('/api/config', { type: 'providers', providers }); toasts.add('已保存', 'success'); } catch { toasts.add('保存失败', 'error'); }
  }

  function updateEditing(field, value) {
    if (!editingProvider) return;
    editingProvider[field] = value;
    const idx = providers.findIndex(p => p.id === editingProvider.id);
    if (idx >= 0) { providers[idx] = { ...providers[idx], [field]: value }; providers = [...providers]; }
  }

  async function addProvider() {
    if (!newName.trim() || !newApiKey.trim()) return;
    const p = { id: crypto.randomUUID(), name: newName.trim(), baseUrl: newBaseUrl.trim(), apiFormat: newApiFormat, apiKey: newApiKey.trim(), models: [], enabled: true };
    providers = [...providers, p];
    await saveAll();
    showAddModal = false;
    newName = ''; newApiKey = ''; newBaseUrl = 'https://api.openai.com/v1';
    editingProvider = p;
  }

  async function deleteProvider(id) {
    providers = providers.filter(p => p.id !== id);
    if (editingProvider?.id === id) editingProvider = null;
    await saveAll();
  }

  async function toggleProvider(id) {
    providers = providers.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p);
    if (editingProvider?.id === id) editingProvider = providers.find(p => p.id === id);
    await saveAll();
  }

  async function scanModels() {
    if (!editingProvider?.baseUrl || !editingProvider?.apiKey) { toasts.add('请填写 Base URL 和 API Key', 'error'); return; }
    scanning = true;
    try {
      const data = await api.post('/api/models/discover', { baseUrl: editingProvider.baseUrl, apiKey: editingProvider.apiKey, apiFormat: editingProvider.apiFormat });
      if (data.success && data.models) {
        const idx = providers.findIndex(p => p.id === editingProvider.id);
        if (idx >= 0) { providers[idx] = { ...providers[idx], models: data.models }; providers = [...providers]; editingProvider = providers[idx]; }
        await saveAll();
        toasts.add(`发现 ${data.models.length} 个模型`, 'success');
      } else { toasts.add(data.error || '扫描失败', 'error'); }
    } catch (e) { toasts.add('扫描失败', 'error'); }
    scanning = false;
  }
</script>

<div class="flex gap-8">
  <div class="w-64 flex-shrink-0">
    <div class="flex items-center justify-between mb-4">
      <p class="text-[10px] uppercase tracking-widest text-muted">服务商</p>
      <button onclick={() => showAddModal = true} class="text-xs text-muted hover:text-foreground transition-colors">+ 添加</button>
    </div>
    {#if loading}
      <p class="text-xs text-muted">加载中...</p>
    {:else if providers.length === 0}
      <p class="text-xs text-muted">暂无服务商</p>
    {:else}
      <div class="space-y-0.5">
        {#each providers as p}
          <button onclick={() => editingProvider = p} class="w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between {editingProvider?.id === p.id ? 'bg-foreground/10 text-foreground' : 'text-muted hover:text-foreground hover:bg-foreground/5'}">
            <span class="truncate">{p.name}</span>
            <span class="w-2 h-2 rounded-full {p.enabled ? 'bg-green-500' : 'bg-muted/30'} flex-shrink-0"></span>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <div class="flex-1 min-w-0">
    {#if editingProvider}
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <p class="text-[10px] uppercase tracking-widest text-muted">编辑服务商</p>
          <div class="flex gap-2">
            <button onclick={() => toggleProvider(editingProvider.id)} class="border border-border px-3 py-1.5 text-xs hover:border-foreground transition-colors">{editingProvider.enabled ? '禁用' : '启用'}</button>
            <button onclick={() => deleteProvider(editingProvider.id)} class="border border-red-300 text-red-600 px-3 py-1.5 text-xs hover:bg-red-50 transition-colors">删除</button>
          </div>
        </div>
        <div><label class="text-xs text-muted block mb-1">名称</label><input type="text" value={editingProvider.name} oninput={(e) => updateEditing('name', e.target.value)} class="w-full border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-foreground" /></div>
        <div><label class="text-xs text-muted block mb-1">Base URL</label><input type="url" value={editingProvider.baseUrl} oninput={(e) => updateEditing('baseUrl', e.target.value)} class="w-full border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-foreground" placeholder="https://api.openai.com/v1" /></div>
        <div><label class="text-xs text-muted block mb-1">API Key</label><input type="password" value={editingProvider.apiKey} oninput={(e) => updateEditing('apiKey', e.target.value)} class="w-full border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-foreground" placeholder="sk-..." /></div>
        <div>
          <label class="text-xs text-muted block mb-1">API 格式</label>
          <select value={editingProvider.apiFormat} onchange={(e) => updateEditing('apiFormat', e.target.value)} class="w-full border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-foreground">
            {#each API_FORMATS as f}<option value={f.value}>{f.label}</option>{/each}
          </select>
        </div>
        <div class="flex gap-2">
          <button onclick={saveAll} class="bg-foreground text-background px-4 py-2 text-xs border border-foreground hover:bg-transparent hover:text-foreground transition-colors">保存配置</button>
          <button onclick={scanModels} disabled={scanning} class="border border-border px-4 py-2 text-xs hover:border-foreground transition-colors disabled:opacity-50">{scanning ? '扫描中...' : '扫描模型'}</button>
        </div>
        {#if editingProvider.models.length > 0}
          <div class="mt-4">
            <p class="text-[10px] uppercase tracking-widest text-muted mb-2">已发现模型 ({editingProvider.models.length})</p>
            <div class="border border-border divide-y divide-border max-h-64 overflow-y-auto">
              {#each editingProvider.models as model}
                <div class="px-3 py-2 text-xs font-mono">{model.id}</div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {:else}
      <div class="text-center py-16 text-muted text-sm">选择左侧服务商进行编辑</div>
    {/if}
  </div>
</div>

{#if showAddModal}
  <div class="fixed inset-0 z-[100] flex items-center justify-center" onclick={() => showAddModal = false} onkeydown={(e) => e.key === 'Escape' && (showAddModal = false)} role="dialog" aria-modal="true">
    <div class="fixed inset-0 bg-black/30"></div>
    <div class="relative bg-background border border-border w-[28rem] p-6" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
      <h3 class="font-serif text-lg mb-4">添加服务商</h3>
      <div class="space-y-4">
        <div><label class="text-xs text-muted block mb-1" for="pn">名称 *</label><input id="pn" type="text" bind:value={newName} class="w-full border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-foreground" placeholder="如：OpenAI" /></div>
        <div><label class="text-xs text-muted block mb-1" for="purl">Base URL</label><input id="purl" type="url" bind:value={newBaseUrl} class="w-full border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-foreground" placeholder="https://api.openai.com/v1" /></div>
        <div><label class="text-xs text-muted block mb-1" for="pkey">API Key *</label><input id="pkey" type="password" bind:value={newApiKey} class="w-full border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-foreground" placeholder="sk-..." /></div>
        <div><label class="text-xs text-muted block mb-1" for="pfmt">API 格式</label><select id="pfmt" bind:value={newApiFormat} class="w-full border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-foreground">{#each API_FORMATS as f}<option value={f.value}>{f.label}</option>{/each}</select></div>
      </div>
      <div class="flex justify-end gap-2 mt-6">
        <button onclick={() => showAddModal = false} class="border border-border px-4 py-2 text-xs hover:border-foreground transition-colors">取消</button>
        <button onclick={addProvider} disabled={!newName.trim() || !newApiKey.trim()} class="bg-foreground text-background px-4 py-2 text-xs border border-foreground hover:bg-transparent hover:text-foreground transition-colors disabled:opacity-40">添加</button>
      </div>
    </div>
  </div>
{/if}
