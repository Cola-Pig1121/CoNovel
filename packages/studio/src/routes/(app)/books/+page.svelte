<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { api } from '$lib/api';
  import { toasts } from '$lib/stores/toast';

  let books = $state([]);
  let loading = $state(true);

  onMount(async () => {
    const timeout = setTimeout(() => { loading = false; }, 5000);
    try {
      const data = await api.get('/api/books');
      books = data.books || [];
    } catch (e) { console.error('Books load failed:', e); }
    clearTimeout(timeout);
    loading = false;
  });

  async function deleteBook(id, title) {
    if (!confirm(`确定删除「${title}」？此操作不可撤销。`)) return;
    try {
      await api.del(`/api/books/${id}`);
      books = books.filter(b => b.id !== id);
      toasts.add('已删除', 'success');
    } catch (e) { console.error('Delete failed:', e); toasts.add('删除失败', 'error'); }
  }
</script>

<div class="p-8">
  <div class="flex items-center justify-between mb-6">
    <h1 class="font-serif text-xl tracking-tight">小说管理</h1>
    <a href="/" class="bg-foreground text-background px-4 py-2 text-xs border border-foreground hover:bg-transparent hover:text-foreground transition-colors">返回项目中心</a>
  </div>

  {#if loading}
    <p class="text-sm text-muted">加载中...</p>
  {:else if books.length === 0}
    <div class="text-center py-16"><p class="text-sm text-muted">还没有项目</p><a href="/" class="inline-block mt-4 border border-border px-4 py-2 text-xs hover:border-foreground transition-colors">创建第一个项目</a></div>
  {:else}
    <div class="space-y-3">
      {#each books as book}
        <div class="border border-border p-4 flex items-center justify-between">
          <div>
            <a href="/editor?bookId={book.id}&num={Math.max(book.currentChapter || 1, 1)}" class="font-serif hover:underline">{book.title}</a>
            <p class="text-xs text-muted mt-1">{book.genre || '未分类'} · {book.totalChapters || 0} 章 · {(book.currentWordCount || 0).toLocaleString()} 字</p>
          </div>
          <button onclick={() => deleteBook(book.id, book.title)} class="text-xs text-red-500 hover:text-red-700 transition-colors border border-red-200 px-3 py-1 hover:bg-red-50">删除</button>
        </div>
      {/each}
    </div>
  {/if}
</div>
