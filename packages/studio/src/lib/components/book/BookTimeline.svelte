<script>
  import { api } from '$lib/api';
  import { toasts } from '$lib/stores/toast';
  let { bookId, book } = $props();
  let events = $derived(book?.timeline || []);
  let adding = $state(false);
  let newEvent = $state({ chapter: 1, location: '', description: '', significance: 'moderate', characters: '' });

  async function add() {
    if (!newEvent.description.trim()) return;
    try {
      await api.post(`/api/books/${bookId}/timeline`, { ...newEvent, id: crypto.randomUUID(), characters: newEvent.characters ? newEvent.characters.split(',').map(s => s.trim()) : [] });
      toasts.add('事件已添加', 'success');
      adding = false;
      window.location.reload();
    } catch { toasts.add('添加失败', 'error'); }
  }
</script>

<div>
  <div class="flex items-center justify-between mb-4">
    <p class="text-[10px] uppercase tracking-widest text-muted">时间线 ({events.length})</p>
    <button onclick={() => adding = !adding} class="text-xs text-muted hover:text-foreground transition-colors">{adding ? '取消' : '+ 添加事件'}</button>
  </div>

  {#if adding}
    <div class="border border-border p-4 space-y-3 mb-4">
      <input type="number" bind:value={newEvent.chapter} placeholder="章节" class="w-full border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-foreground" />
      <input type="text" bind:value={newEvent.location} placeholder="地点" class="w-full border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-foreground" />
      <textarea bind:value={newEvent.description} placeholder="事件描述" class="w-full border border-border px-3 py-2 text-sm bg-transparent h-16 resize-none focus:outline-none focus:border-foreground"></textarea>
      <div class="flex gap-2">
        <select bind:value={newEvent.significance} class="border border-border px-2 py-1.5 text-xs bg-transparent focus:outline-none focus:border-foreground">
          <option value="minor">次要</option><option value="moderate">中等</option><option value="major">重要</option><option value="critical">关键</option>
        </select>
        <input type="text" bind:value={newEvent.characters} placeholder="角色（逗号分隔）" class="flex-1 border border-border px-3 py-1.5 text-xs bg-transparent focus:outline-none focus:border-foreground" />
        <button onclick={add} class="bg-foreground text-background px-3 py-1.5 text-xs border border-foreground hover:bg-transparent hover:text-foreground transition-colors">添加</button>
      </div>
    </div>
  {/if}

  {#if events.length === 0}
    <p class="text-xs text-muted text-center py-8">暂无时间线事件</p>
  {:else}
    <div class="relative pl-4 border-l border-border space-y-4">
      {#each events as ev}
        <div class="relative text-xs">
          <div class="absolute -left-[1.25rem] top-1 w-2 h-2 rounded-full bg-foreground/30 border border-foreground"></div>
          <p class="font-mono text-[10px] text-muted">第{ev.chapter}章</p>
          <p>{ev.description}</p>
          {#if ev.location}<p class="text-muted">{ev.location}</p>{/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
