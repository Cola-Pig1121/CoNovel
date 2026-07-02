<script>
  import { getSnapshots, getSummaries } from '$lib/memory';
  let { bookId } = $props();
  let snapshots = $state([]);
  let summaries = $state([]);
  let loading = $state(true);
  let selectedSnapshot = $state(null);
  let activeTab = $state('snapshots');

  async function load() {
    try { [snapshots, summaries] = await Promise.all([getSnapshots(bookId), getSummaries(bookId)]); } catch {}
    if (snapshots.length > 0) selectedSnapshot = snapshots[snapshots.length - 1];
    loading = false;
  }
  load();
</script>

{#if loading}
  <p class="text-xs text-muted">加载记忆数据...</p>
{:else}
  <div class="flex gap-1 mb-4 border-b border-border">
    <button onclick={() => activeTab = 'snapshots'} class="px-3 py-2 text-xs transition-colors {activeTab === 'snapshots' ? 'border-b-2 border-foreground' : 'text-muted hover:text-foreground'}">事实快照 ({snapshots.length})</button>
    <button onclick={() => activeTab = 'summaries'} class="px-3 py-2 text-xs transition-colors {activeTab === 'summaries' ? 'border-b-2 border-foreground' : 'text-muted hover:text-foreground'}">章节摘要 ({summaries.length})</button>
  </div>

  {#if activeTab === 'snapshots'}
    <div class="flex gap-3">
      <div class="w-24 flex-shrink-0 space-y-1">
        {#each snapshots as s}
          <button onclick={() => selectedSnapshot = s} class="w-full text-left px-2 py-1.5 text-xs transition-colors {selectedSnapshot?.chapterNumber === s.chapterNumber ? 'border-l-2 border-foreground bg-foreground/5' : 'border-l-2 border-transparent text-muted hover:text-foreground'}">第{s.chapterNumber}章</button>
        {/each}
      </div>
      <div class="flex-1 min-w-0">
        {#if selectedSnapshot}
          <div class="space-y-3">
            <div>
              <p class="text-[10px] uppercase tracking-widest text-muted mb-2">角色 ({selectedSnapshot.characters.length})</p>
              {#each selectedSnapshot.characters as c}
                <div class="border border-border p-2 mb-2">
                  <p class="text-xs font-medium">{c.name}</p>
                  <p class="text-[10px] text-muted">{c.location} · {c.emotionalState}</p>
                </div>
              {/each}
            </div>
            <div>
              <p class="text-[10px] uppercase tracking-widest text-muted mb-1">剧情进展</p>
              <p class="text-xs">{selectedSnapshot.plotProgress?.mainPlot}</p>
            </div>
          </div>
        {:else}
          <p class="text-xs text-muted text-center py-8">选择快照查看详情</p>
        {/if}
      </div>
    </div>
  {:else}
    <div class="space-y-2">
      {#each summaries as s}
        <div class="border border-border p-3">
          <p class="text-xs font-medium mb-1">第{s.chapterNumber}章「{s.title}」</p>
          <p class="text-[10px] text-muted leading-relaxed">{s.summary}</p>
        </div>
      {/each}
    </div>
  {/if}
{/if}
