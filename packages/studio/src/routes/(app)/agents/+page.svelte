<script>
  import { onMount } from 'svelte';
  import { api } from '$lib/api';

  const AGENT_META = {
    architect: { name: 'Architect', nameZh: '故事架构师', category: '核心创作' },
    writer: { name: 'Writer', nameZh: '写作特工', category: '核心创作' },
    'character-intelligence': { name: 'Character Intelligence', nameZh: '角色智能体', category: '核心创作' },
    reviewer: { name: 'Reviewer', nameZh: '审阅官', category: '质量控制' },
    editor: { name: 'Editor', nameZh: '编辑', category: '质量控制' },
    'de-ai-editor': { name: 'De-AI Editor', nameZh: '去AI味编辑', category: '质量控制' },
    'fact-checker': { name: 'Fact Checker', nameZh: '事实核查官', category: '质量控制' },
    continuity: { name: 'Continuity', nameZh: '连续性检查官', category: '质量控制' },
    'pacing-controller': { name: 'Pacing Controller', nameZh: '节奏控制官', category: '质量控制' },
    'style-analyzer': { name: 'Style Analyzer', nameZh: '风格分析师', category: '辅助' },
    observer: { name: 'Observer', nameZh: '观察者', category: '辅助' },
    'character-designer': { name: 'Character Designer', nameZh: '角色设计师', category: '辅助' },
    foreshadowing: { name: 'Foreshadowing', nameZh: '伏笔管理官', category: '辅助' },
    radar: { name: 'Radar', nameZh: '趋势雷达', category: '辅助' },
    reflector: { name: 'Reflector', nameZh: '反思官', category: '辅助' },
  };

  let agents = $state([]);
  let loading = $state(true);

  onMount(async () => {
    try {
      const data = await api.get('/api/config?type=agents');
      const configs = data.agents || [];
      agents = configs.map(c => ({
        ...c,
        ...(AGENT_META[c.role] || { name: c.name, nameZh: c.nameZh, category: '其他' }),
      }));
    } catch {}
    loading = false;
  });

  let categories = $derived([...new Set(agents.map(a => AGENT_META[a.role]?.category || '其他'))]);
</script>

<div class="p-8">
  <h1 class="font-serif text-xl tracking-tight mb-6">Agent 监控</h1>

  {#if loading}
    <p class="text-sm text-muted">加载中...</p>
  {:else}
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="border border-border p-4 text-center">
        <p class="font-mono text-2xl">{agents.length}</p>
        <p class="text-xs text-muted">已配置</p>
      </div>
      <div class="border border-border p-4 text-center">
        <p class="font-mono text-2xl">{agents.filter(a => a.enabled !== false).length}</p>
        <p class="text-xs text-muted">已启用</p>
      </div>
      <div class="border border-border p-4 text-center">
        <p class="font-mono text-2xl">{agents.filter(a => a.enabled === false).length}</p>
        <p class="text-xs text-muted">已禁用</p>
      </div>
    </div>

    {#each [...new Set(agents.map(a => AGENT_META[a.role]?.category || '其他'))] as category}
      <div class="mb-6">
        <p class="text-[10px] uppercase tracking-widest text-muted mb-3">{category}</p>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {#each agents.filter(a => (AGENT_META[a.role]?.category || '其他') === category) as agent}
            <div class="border border-border p-3 {agent.enabled === false ? 'opacity-50' : ''}">
              <div class="flex items-start justify-between mb-2">
                <div>
                  <p class="text-sm font-medium">{agent.nameZh || agent.role}</p>
                  <p class="text-[10px] text-muted font-mono">{agent.name || agent.role}</p>
                </div>
                <span class="w-2 h-2 rounded-full {agent.enabled !== false ? 'bg-green-500' : 'bg-muted/30'}"></span>
              </div>
              <p class="text-[10px] text-muted">模型: {agent.modelId || '未配置'}</p>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>
