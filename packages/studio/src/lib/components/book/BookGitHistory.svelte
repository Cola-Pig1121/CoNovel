<script>
  import { isTauri, tauriInvoke } from '$lib/tauri';
  import { toasts } from '$lib/stores/toast';
  let { bookId } = $props();
  let commits = $state([]);
  let tags = $state([]);
  let loading = $state(true);

  async function load() {
    if (!isTauri()) { loading = false; return; }
    try {
      const [c, t] = await Promise.all([
        tauriInvoke('git_log', { book_id: bookId, count: 50 }),
        tauriInvoke('git_tags', { book_id: bookId }),
      ]);
      commits = c || [];
      tags = t || [];
    } catch {}
    loading = false;
  }
  load();
</script>

<div class="space-y-4">
  <p class="text-[10px] uppercase tracking-widest text-muted">Git 版本历史</p>

  {#if !isTauri()}
    <div class="border border-border p-8 text-center">
      <p class="text-sm text-muted">Git 版本控制需要在 Tauri 桌面端使用</p>
    </div>
  {:else if loading}
    <p class="text-xs text-muted">加载中...</p>
  {:else if commits.length === 0}
    <p class="text-xs text-muted text-center py-8">暂无提交记录</p>
  {:else}
    <div class="space-y-2">
      {#each commits as c}
        <div class="border border-border p-3 text-xs">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-mono text-[10px] text-muted">{c.hash?.slice(0, 7)}</span>
            <span>{c.message}</span>
          </div>
          <p class="text-[10px] text-muted">{c.date}</p>
        </div>
      {/each}
    </div>
  {/if}

  {#if tags.length > 0}
    <div>
      <p class="text-[10px] uppercase tracking-widest text-muted mb-2">标签</p>
      <div class="flex flex-wrap gap-2">
        {#each tags as t}
          <span class="border border-border px-2 py-1 text-[10px]">{t.name}</span>
        {/each}
      </div>
    </div>
  {/if}
</div>
