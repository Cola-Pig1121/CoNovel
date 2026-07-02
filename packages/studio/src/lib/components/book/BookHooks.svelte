<script>
  import { api } from '$lib/api';
  let { bookId } = $props();
  let hooks = $state([]);
  let loading = $state(true);

  async function load() {
    try {
      const data = await api.get(`/api/books/${bookId}`);
      hooks = data.foreshadowing || [];
    } catch {}
    loading = false;
  }
  load();

  const STATUS_COLORS = { planted: 'bg-blue-100 text-blue-700', hinted: 'bg-yellow-100 text-yellow-700', resolved: 'bg-green-100 text-green-700', overdue: 'bg-red-100 text-red-700' };
</script>

<div class="space-y-4">
  <p class="text-[10px] uppercase tracking-widest text-muted">Hook 治理</p>

  {#if loading}
    <p class="text-xs text-muted">加载中...</p>
  {:else if hooks.length === 0}
    <div class="border border-border p-8 text-center"><p class="text-sm text-muted">暂无伏笔数据</p></div>
  {:else}
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <div class="border border-border p-3 text-center"><p class="font-mono text-lg">{hooks.filter(h => h.status === 'planted').length}</p><p class="text-[10px] text-muted">已埋设</p></div>
      <div class="border border-border p-3 text-center"><p class="font-mono text-lg">{hooks.filter(h => h.status === 'hinted').length}</p><p class="text-[10px] text-muted">已暗示</p></div>
      <div class="border border-border p-3 text-center"><p class="font-mono text-lg">{hooks.filter(h => h.status === 'resolved').length}</p><p class="text-[10px] text-muted">已回收</p></div>
      <div class="border border-border p-3 text-center"><p class="font-mono text-lg">{hooks.filter(h => h.status === 'overdue').length}</p><p class="text-[10px] text-muted">逾期</p></div>
    </div>
    <div class="space-y-2">
      {#each hooks as h}
        <div class="border border-border p-3 text-xs">
          <div class="flex items-center justify-between mb-1">
            <span>{h.description}</span>
            <span class="px-1.5 py-0.5 text-[10px] rounded {STATUS_COLORS[h.status] || ''}">{h.status}</span>
          </div>
          <p class="text-muted">类型: {h.type || 'plot'} · 紧急度: {h.urgency || 'medium'}</p>
        </div>
      {/each}
    </div>
  {/if}
</div>
