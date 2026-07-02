<script>
  import { api } from '$lib/api';
  import { toasts } from '$lib/stores/toast';
  let { bookId, book } = $props();
  let items = $derived(book?.foreshadowing || []);
  let adding = $state(false);
  let newItem = $state({ description: '', type: 'plot', urgency: 'medium', status: 'planted' });

  async function add() {
    if (!newItem.description.trim()) return;
    try {
      await api.post(`/api/books/${bookId}/foreshadowing`, { ...newItem, id: crypto.randomUUID() });
      toasts.add('伏笔已添加', 'success');
      adding = false;
      newItem = { description: '', type: 'plot', urgency: 'medium', status: 'planted' };
      window.location.reload();
    } catch { toasts.add('添加失败', 'error'); }
  }
</script>

<div>
  <div class="flex items-center justify-between mb-4">
    <p class="text-[10px] uppercase tracking-widest text-muted">伏笔列表 ({items.length})</p>
    <button onclick={() => adding = !adding} class="text-xs text-muted hover:text-foreground transition-colors">{adding ? '取消' : '+ 添加伏笔'}</button>
  </div>

  {#if adding}
    <div class="border border-border p-4 space-y-3 mb-4">
      <textarea bind:value={newItem.description} placeholder="伏笔描述" class="w-full border border-border px-3 py-2 text-sm bg-transparent h-16 resize-none focus:outline-none focus:border-foreground"></textarea>
      <div class="flex gap-2">
        <select bind:value={newItem.type} class="border border-border px-2 py-1.5 text-xs bg-transparent focus:outline-none focus:border-foreground">
          <option value="plot">剧情</option><option value="character">角色</option><option value="world">世界观</option><option value="emotion">情感</option>
        </select>
        <select bind:value={newItem.urgency} class="border border-border px-2 py-1.5 text-xs bg-transparent focus:outline-none focus:border-foreground">
          <option value="low">低</option><option value="medium">中</option><option value="high">高</option><option value="critical">关键</option>
        </select>
        <button onclick={add} class="bg-foreground text-background px-3 py-1.5 text-xs border border-foreground hover:bg-transparent hover:text-foreground transition-colors">添加</button>
      </div>
    </div>
  {/if}

  {#if items.length === 0}
    <p class="text-xs text-muted text-center py-8">暂无伏笔</p>
  {:else}
    <div class="space-y-2">
      {#each items as item}
        <div class="border border-border p-3 text-xs">
          <p>{item.description}</p>
          <div class="flex gap-2 mt-1 text-muted">
            <span class="border border-border px-1.5 py-0.5 text-[10px]">{item.type}</span>
            <span class="border border-border px-1.5 py-0.5 text-[10px]">{item.urgency}</span>
            <span class="border border-border px-1.5 py-0.5 text-[10px]">{item.status}</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
