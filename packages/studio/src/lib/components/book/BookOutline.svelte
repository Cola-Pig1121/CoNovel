<script>
  let { bookId, book } = $props();
  let outline = $derived(book?.outline || { volumes: [], progress: { mainPlot: 0 } });
  let expanded = $state({});

  function toggle(i) { expanded[i] = !expanded[i]; expanded = { ...expanded }; }
</script>

<div class="space-y-4">
  <div class="border border-border p-4">
    <div class="flex items-center justify-between mb-2">
      <p class="text-[10px] uppercase tracking-widest text-muted">主线进度</p>
      <span class="font-mono text-sm">{Math.round((outline.progress?.mainPlot || 0) * 100)}%</span>
    </div>
    <div class="w-full h-1.5 bg-border/30 rounded-full overflow-hidden">
      <div class="h-full bg-foreground/40 transition-all" style="width: {(outline.progress?.mainPlot || 0) * 100}%"></div>
    </div>
  </div>

  {#if outline.volumes?.length === 0}
    <div class="border border-border text-center py-8">
      <p class="text-sm text-muted">暂无大纲</p>
      <p class="text-xs text-muted mt-1">通过「写作」Tab 或 AI 对话创建大纲</p>
    </div>
  {:else}
    {#each outline.volumes || [] as vol, vi}
      <div class="border border-border">
        <button onclick={() => toggle(vi)} class="w-full text-left px-4 py-3 flex items-center justify-between text-sm hover:bg-foreground/5 transition-colors">
          <span class="font-serif">{vol.title || `卷 ${vi + 1}`}</span>
          <span class="text-muted text-xs">{expanded[vi] ? '−' : '+'}</span>
        </button>
        {#if expanded[vi]}
          <div class="px-4 pb-3 border-t border-border">
            {#each vol.chapters || [] as ch, ci}
              <div class="py-2 border-b border-border/50 last:border-0 text-xs text-muted">
                <span class="text-foreground/50 mr-2">{ci + 1}</span>{ch.title || `章节 ${ci + 1}`}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  {/if}
</div>
