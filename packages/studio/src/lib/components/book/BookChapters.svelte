<script>
  import { goto } from '$app/navigation';
  import { api } from '$lib/api';
  import { toasts } from '$lib/stores/toast';
  let { bookId, book } = $props();
  let chapters = $state([]);

  async function load() {
    try { const data = await api.get(`/api/books/${bookId}/chapters`); chapters = data.chapters || []; } catch {}
  }
  load();
</script>

<div>
  <div class="flex items-center justify-between mb-4">
    <p class="text-[10px] uppercase tracking-widest text-muted">章节列表</p>
    <a href="/editor?bookId={bookId}&num={(book?.totalChapters || 0) + 1}" class="text-xs text-muted hover:text-foreground transition-colors">+ 新建章节</a>
  </div>
  {#if chapters.length === 0}
    <p class="text-sm text-muted text-center py-8">暂无章节</p>
  {:else}
    <div class="space-y-1">
      {#each chapters as ch}
        {@const chNum = ch.chapter_number || ch.num}
        <a href="/editor?bookId={bookId}&num={chNum}" class="flex items-center justify-between px-3 py-2 border border-border text-xs hover:border-foreground transition-colors">
          <span><span class="text-muted/40 mr-2">{chNum}</span>{ch.title || `第${chNum}章`}</span>
          <span class="text-muted font-mono">{ch.word_count || 0} 字</span>
        </a>
      {/each}
    </div>
  {/if}
</div>
