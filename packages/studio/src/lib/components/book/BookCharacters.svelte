<script>
  import { api } from '$lib/api';
  import { toasts } from '$lib/stores/toast';
  let { bookId, book } = $props();
  let characters = $derived(book?.characters || []);
  let editing = $state(null);

  function addChar() {
    editing = { id: crypto.randomUUID(), name: '', personality: '', background: '', goals: '', relationships: '' };
  }
  async function save() {
    if (!editing?.name?.trim()) return;
    try {
      await api.post(`/api/books/${bookId}/characters`, editing);
      toasts.add('角色已保存', 'success');
      editing = null;
      window.location.reload();
    } catch { toasts.add('保存失败', 'error'); }
  }
  async function del(id) {
    try {
      await api.del(`/api/books/${bookId}/characters/${id}`);
      toasts.add('已删除', 'success');
      window.location.reload();
    } catch { toasts.add('删除失败', 'error'); }
  }
</script>

<div class="space-y-3">
  <div class="flex items-center justify-between mb-4">
    <p class="text-[10px] uppercase tracking-widest text-muted">角色列表 ({characters.length})</p>
    <button onclick={addChar} class="text-xs text-muted hover:text-foreground transition-colors">+ 添加角色</button>
  </div>

  {#if characters.length === 0 && !editing}
    <p class="text-xs text-muted text-center py-8">暂无角色</p>
  {/if}

  {#each characters as c}
    <div class="border border-border p-3">
      <div class="flex items-center justify-between mb-1">
        <p class="text-sm font-medium">{c.name}</p>
        <button onclick={() => del(c.id)} class="text-[10px] text-red-500 hover:text-red-700">删除</button>
      </div>
      {#if c.personality}<p class="text-xs text-muted">{Array.isArray(c.personality) ? c.personality.join('、') : c.personality}</p>{/if}
      {#if c.background}<p class="text-xs text-muted mt-1">{c.background}</p>{/if}
    </div>
  {/each}

  {#if editing}
    <div class="border border-border p-4 space-y-3">
      <p class="text-[10px] uppercase tracking-widest text-muted">新角色</p>
      <input type="text" bind:value={editing.name} placeholder="角色名" class="w-full border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-foreground" />
      <input type="text" bind:value={editing.personality} placeholder="性格（逗号分隔）" class="w-full border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-foreground" />
      <textarea bind:value={editing.background} placeholder="背景故事" class="w-full border border-border px-3 py-2 text-sm bg-transparent h-20 resize-none focus:outline-none focus:border-foreground"></textarea>
      <div class="flex gap-2">
        <button onclick={save} class="bg-foreground text-background px-3 py-1.5 text-xs border border-foreground hover:bg-transparent hover:text-foreground transition-colors">保存</button>
        <button onclick={() => editing = null} class="border border-border px-3 py-1.5 text-xs hover:border-foreground transition-colors">取消</button>
      </div>
    </div>
  {/if}
</div>
