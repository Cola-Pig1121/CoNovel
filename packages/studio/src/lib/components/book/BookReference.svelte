<script>
  import { api } from '$lib/api';
  import { isTauri, tauriInvoke } from '$lib/tauri';
  import { toasts } from '$lib/stores/toast';
  let { bookId, book } = $props();
  let files = $state([]);
  let meta = $state({ title: '', author: '', notes: '' });
  let loading = $state(true);

  async function load() {
    try {
      const data = await api.get(`/api/books/${bookId}/reference`);
      files = data.files || [];
      meta = data.meta || meta;
    } catch {}
    loading = false;
  }
  load();

  async function uploadFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (isTauri()) {
        const buffer = await file.arrayBuffer();
        const bytes = Array.from(new Uint8Array(buffer));
        await tauriInvoke('upload_reference_file', { book_id: bookId, file_name: file.name, file_content: bytes });
      } else {
        const formData = new FormData();
        formData.append('file', file);
        await fetch(`/api/books/${bookId}/reference/upload`, { method: 'POST', body: formData });
      }
      toasts.add('上传成功', 'success');
      await load();
    } catch (e) { toasts.add('上传失败', 'error'); }
  }

  async function deleteFile(name) {
    if (!confirm(`删除 ${name}？`)) return;
    try {
      await api.del(`/api/books/${bookId}/reference`, { fileName: name });
      await load();
      toasts.add('已删除', 'success');
    } catch { toasts.add('删除失败', 'error'); }
  }

  async function saveMeta() {
    try { await api.post(`/api/books/${bookId}/reference`, meta); toasts.add('已保存', 'success'); } catch { toasts.add('保存失败', 'error'); }
  }
</script>

<div class="space-y-4">
  <p class="text-[10px] uppercase tracking-widest text-muted">参考作品</p>

  <!-- Upload -->
  <div class="border border-dashed border-border p-4 text-center">
    <p class="text-xs text-muted mb-2">拖拽文件到这里，或点击选择</p>
    <input type="file" accept=".txt,.md,.epub" onchange={uploadFile} class="text-xs" />
  </div>

  <!-- File list -->
  {#if files.length > 0}
    <div class="border border-border divide-y divide-border">
      {#each files as f}
        <div class="px-3 py-2 flex items-center justify-between text-xs">
          <span class="truncate">{f.name || f}</span>
          <button onclick={() => deleteFile(f.name || f)} class="text-red-500 hover:text-red-700 ml-2 flex-shrink-0">删除</button>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Metadata -->
  <div class="space-y-3">
    <p class="text-[10px] uppercase tracking-widest text-muted">参考书信息</p>
    <input type="text" bind:value={meta.title} placeholder="书名" class="w-full border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-foreground" />
    <input type="text" bind:value={meta.author} placeholder="作者" class="w-full border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-foreground" />
    <textarea bind:value={meta.notes} placeholder="笔记" class="w-full border border-border px-3 py-2 text-sm bg-transparent h-20 resize-none focus:outline-none focus:border-foreground"></textarea>
    <button onclick={saveMeta} class="bg-foreground text-background px-3 py-1.5 text-xs border border-foreground hover:bg-transparent hover:text-foreground transition-colors">保存信息</button>
  </div>
</div>
