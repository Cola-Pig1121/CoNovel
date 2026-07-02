<script>
  import { api } from '$lib/api';
  import { toasts } from '$lib/stores/toast';
  let { bookId } = $props();
  let files = $state([]);
  let selected = $state(null);
  let content = $state('');
  let loading = $state(true);
  let showNewFile = $state(false);
  let newFileName = $state('');

  async function loadFiles() {
    try { const data = await api.get(`/api/books/${bookId}/constraints`); files = data.files || []; } catch {}
    loading = false;
  }
  loadFiles();

  async function selectFile(name) {
    selected = name;
    try { const data = await api.get(`/api/books/${bookId}/constraints?file=${name}`); content = data.content || ''; } catch {}
  }

  async function saveContent() {
    if (!selected) return;
    try { await api.put(`/api/books/${bookId}/constraints`, { name: selected, content }); toasts.add('已保存', 'success'); } catch { toasts.add('保存失败', 'error'); }
  }

  async function createFile() {
    if (!newFileName.trim()) return;
    const name = newFileName.trim();
    try { await api.post(`/api/books/${bookId}/constraints`, { name, content: '' }); await loadFiles(); selectFile(name); } catch {}
    showNewFile = false;
    newFileName = '';
  }
</script>

<div class="flex gap-4">
  <div class="w-40 flex-shrink-0 space-y-1">
    <div class="flex items-center justify-between mb-2"><p class="text-[10px] uppercase tracking-widest text-muted">约束文件</p><button onclick={() => { showNewFile = true; newFileName = ''; }} class="text-xs text-muted hover:text-foreground">+</button></div>
    {#if showNewFile}
      <div class="flex gap-1 mb-2">
        <input type="text" bind:value={newFileName} placeholder="文件名.md" class="flex-1 border border-border px-2 py-1 text-[10px] bg-transparent focus:outline-none focus:border-foreground" onkeydown={(e) => e.key === 'Enter' && createFile()} />
        <button onclick={createFile} class="bg-foreground text-background px-2 py-1 text-[10px]">✓</button>
        <button onclick={() => showNewFile = false} class="border border-border px-2 py-1 text-[10px]">✕</button>
      </div>
    {/if}
    {#each files as f}
      <button onclick={() => selectFile(f.name)} class="w-full text-left px-2 py-1.5 text-xs transition-colors {selected === f.name ? 'bg-foreground/10 text-foreground' : 'text-muted hover:text-foreground hover:bg-foreground/5'}">{f.name}</button>
    {/each}
  </div>
  <div class="flex-1 min-w-0">
    {#if selected}
      <textarea bind:value={content} class="w-full border border-border p-4 font-mono text-xs bg-transparent h-80 resize-none focus:outline-none focus:border-foreground"></textarea>
      <button onclick={saveContent} class="mt-2 bg-foreground text-background px-3 py-1.5 text-xs border border-foreground hover:bg-transparent hover:text-foreground transition-colors">保存</button>
    {:else}
      <p class="text-xs text-muted text-center py-16">选择左侧文件进行编辑</p>
    {/if}
  </div>
</div>
