<script>
  import { api } from '$lib/api';
  let { bookId } = $props();
  let data = $state(null);
  let loading = $state(true);

  async function load() {
    try { data = await api.get(`/api/books/${bookId}/reading-power`); } catch {}
    loading = false;
  }
  load();
</script>

<div class="space-y-4">
  <p class="text-[10px] uppercase tracking-widest text-muted">追读力分析</p>

  {#if loading}
    <p class="text-xs text-muted">加载中...</p>
  {:else if !data?.readingPower}
    <div class="border border-border p-8 text-center"><p class="text-sm text-muted">暂无追读力数据</p></div>
  {:else}
    {@const rp = data.readingPower}
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      {#each Object.entries(rp.overall || {}) as [key, val]}
        <div class="border border-border p-3 text-center">
          <p class="font-mono text-lg">{typeof val === 'number' ? val.toFixed(1) : val}</p>
          <p class="text-[10px] text-muted">{key}</p>
        </div>
      {/each}
    </div>
  {/if}
</div>
