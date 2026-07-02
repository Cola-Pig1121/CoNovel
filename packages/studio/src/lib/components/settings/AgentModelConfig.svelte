<script>
  import { onMount } from 'svelte';
  import { api } from '$lib/api';
  import { toasts } from '$lib/stores/toast';

  const AGENTS = [
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

  let providers = $state([]);
  let agentConfigs = $state({});
  let loading = $state(true);
  let selectedAgent = $state(null);

  // Tier config
  let tierProvider = $state('');
  let tierStrong = $state('');
  let tierMedium = $state('');
  let tierLight = $state('');

  $effect(() => {
    tierStrong = ''; tierMedium = ''; tierLight = '';
  });

  onMount(async () => {
    try {
      const [pData, aData] = await Promise.all([
        api.get('/api/config?type=providers'),
        api.get('/api/config?type=agents'),
      ]);
      providers = (pData.providers || []).filter(p => p.enabled);
      const configs = aData.agents || [];
      configs.forEach(c => { agentConfigs[c.role] = c; });
    } catch {}
    loading = false;
  });

  function getProviderModels(providerName) {
    const p = providers.find(p => p.name === providerName);
    return p?.models || [];
  }

  async function saveConfig(role) {
    const config = agentConfigs[role];
    if (!config) return;
    try {
      await api.put('/api/config', { type: 'single-agent', role, ...config });
      toasts.add(`${AGENTS.find(a => a.role === role)?.nameZh || role} 已保存`, 'success');
    } catch { toasts.add('保存失败', 'error'); }
  }

  async function applyTierConfig() {
    if (!tierProvider || !tierStrong || !tierMedium || !tierLight) return;
    const models = getProviderModels(tierProvider);
    const strong = models.find(m => m.id === tierStrong);
    const medium = models.find(m => m.id === tierMedium);
    const light = models.find(m => m.id === tierLight);

    const tierMap = {
      'architect': strong, 'character-intelligence': strong,
      'writer': medium, 'editor': medium, 'reviewer': medium, 'de-ai-editor': medium,
      'fact-checker': light, 'continuity': light, 'foreshadowing': light, 'observer': light, 'radar': light,
      'pacing-controller': medium, 'style-analyzer': medium, 'character-designer': medium,
      'reflector': medium,
    };

    for (const agent of AGENTS) {
      const model = tierMap[agent.role] || medium;
      if (model) {
        agentConfigs[agent.role] = {
          ...agentConfigs[agent.role],
          role: agent.role, provider: tierProvider, modelId: model.id,
          enabled: true, temperature: 0.7, maxTokens: 4096,
        };
      }
    }

    try {
      await api.put('/api/config', { type: 'agents', agents: Object.values(agentConfigs) });
      toasts.add('批量分配完成', 'success');
    } catch { toasts.add('分配失败', 'error'); }
  }
</script>

{#if loading}
  <p class="text-sm text-muted">加载中...</p>
{:else}
  <div class="flex gap-8">
    <!-- Left: Agent list -->
    <div class="w-64 flex-shrink-0 space-y-4">
      {#each ['核心创作', '质量控制', '辅助'] as category}
        <div>
          <p class="text-[10px] uppercase tracking-widest text-muted mb-2">{category}</p>
          <div class="space-y-0.5">
            {#each AGENTS.filter(a => a.category === category) as agent}
              <button onclick={() => selectedAgent = agent.role} class="w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between {selectedAgent === agent.role ? 'bg-foreground/10 text-foreground' : 'text-muted hover:text-foreground hover:bg-foreground/5'}">
                <span>{agent.nameZh}</span>
                {#if agentConfigs[agent.role]?.modelId}
                  <span class="w-2 h-2 rounded-full bg-green-500"></span>
                {:else}
                  <span class="w-2 h-2 rounded-full bg-muted/30"></span>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>

    <!-- Right: Config -->
    <div class="flex-1 min-w-0">
      <!-- Tier config -->
      <div class="border border-border p-4 mb-6">
        <p class="text-[10px] uppercase tracking-widest text-muted mb-3">快速配置 — 按模型能力分层分配</p>
        <div class="grid grid-cols-4 gap-3">
          <div>
            <label class="text-xs text-muted block mb-1">服务商</label>
            <select bind:value={tierProvider} class="w-full border border-border px-2 py-1.5 text-xs bg-transparent focus:outline-none focus:border-foreground">
              <option value="">选择...</option>
              {#each providers as p}<option value={p.name}>{p.name}</option>{/each}
            </select>
          </div>
          <div>
            <label class="text-xs text-muted block mb-1">强模型</label>
            <select bind:value={tierStrong} class="w-full border border-border px-2 py-1.5 text-xs bg-transparent focus:outline-none focus:border-foreground">
              <option value="">选择...</option>
              {#each getProviderModels(tierProvider) as m}<option value={m.id}>{m.id}</option>{/each}
            </select>
          </div>
          <div>
            <label class="text-xs text-muted block mb-1">中模型</label>
            <select bind:value={tierMedium} class="w-full border border-border px-2 py-1.5 text-xs bg-transparent focus:outline-none focus:border-foreground">
              <option value="">选择...</option>
              {#each getProviderModels(tierProvider) as m}<option value={m.id}>{m.id}</option>{/each}
            </select>
          </div>
          <div>
            <label class="text-xs text-muted block mb-1">轻模型</label>
            <select bind:value={tierLight} class="w-full border border-border px-2 py-1.5 text-xs bg-transparent focus:outline-none focus:border-foreground">
              <option value="">选择...</option>
              {#each getProviderModels(tierProvider) as m}<option value={m.id}>{m.id}</option>{/each}
            </select>
          </div>
        </div>
        <button onclick={applyTierConfig} disabled={!tierProvider || !tierStrong || !tierMedium || !tierLight} class="mt-3 bg-foreground text-background px-4 py-1.5 text-xs border border-foreground hover:bg-transparent hover:text-foreground transition-colors disabled:opacity-40">应用分配</button>
      </div>

      <!-- Per-agent config -->
      {#if selectedAgent}
        {@const agent = AGENTS.find(a => a.role === selectedAgent)}
        {@const config = agentConfigs[selectedAgent] || {}}
        <div class="space-y-4">
          <p class="text-[10px] uppercase tracking-widest text-muted">{agent?.nameZh} ({agent?.name})</p>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs text-muted block mb-1">服务商</label>
              <select bind:value={config.provider} onchange={(e) => { config.provider = e.target.value; config.modelId = ''; agentConfigs[selectedAgent] = { ...config }; }} class="w-full border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-foreground">
                <option value="">选择...</option>
                {#each providers as p}<option value={p.name}>{p.name}</option>{/each}
              </select>
            </div>
            <div>
              <label class="text-xs text-muted block mb-1">模型</label>
              <select bind:value={config.modelId} onchange={(e) => { config.modelId = e.target.value; agentConfigs[selectedAgent] = { ...config }; }} class="w-full border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-foreground">
                <option value="">选择...</option>
                {#each getProviderModels(config.provider) as m}<option value={m.id}>{m.id}</option>{/each}
              </select>
            </div>
            <div>
              <label class="text-xs text-muted block mb-1">Temperature</label>
              <input type="number" step="0.1" min="0" max="2" bind:value={config.temperature} class="w-full border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-foreground" />
            </div>
            <div>
              <label class="text-xs text-muted block mb-1">Max Tokens</label>
              <input type="number" step="256" bind:value={config.maxTokens} class="w-full border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-foreground" />
            </div>
          </div>
          <button onclick={() => saveConfig(selectedAgent)} class="bg-foreground text-background px-4 py-2 text-xs border border-foreground hover:bg-transparent hover:text-foreground transition-colors">保存配置</button>
        </div>
      {:else}
        <div class="text-center py-16 text-muted text-sm">选择左侧 Agent 进行配置</div>
      {/if}
    </div>
  </div>
{/if}
