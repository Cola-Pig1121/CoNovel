<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { api } from '$lib/api';
  import { toasts } from '$lib/stores/toast';

  let books = $state([]);
  let loading = $state(true);
  let hasProviders = $state(true);
  let showCreate = $state(false);
  let newTitle = $state('');
  let newGenre = $state('');
  let newPremise = $state('');
  let creating = $state(false);

  const GENRES = ['仙侠', '玄幻', '都市', '科幻', '悬疑', '历史', '军事', '游戏', '体育', '灵异', '同人', '轻小说'];

  onMount(async () => {
    const timeout = setTimeout(() => { loading = false; }, 5000);
    try {
      const [booksData, providersData] = await Promise.all([
        api.get('/api/books'),
        api.get('/api/config?type=providers'),
      ]);
      books = booksData.books || [];
      const providers = providersData.providers || [];
      hasProviders = providers.some(p => p.enabled && p.models?.length > 0);
    } catch (e) { console.error('Dashboard load failed:', e); }
    clearTimeout(timeout);
    loading = false;
  });

  async function handleCreate() {
    if (!newTitle.trim()) return;
    creating = true;
    try {
      const data = await api.post('/api/books', {
        title: newTitle.trim(),
        genre: newGenre || 'fantasy',
        genres: newGenre ? [newGenre] : [],
        premise: newPremise.trim(),
        targetWordCount: 3000,
      });
      showCreate = false;
      goto(`/editor?bookId=${data.id}&num=1`);
    } catch {
      toasts.add('创建失败', 'error');
    }
    creating = false;
  }
</script>

<div class="flex flex-col min-h-screen">
  <header class="border-b border-border px-12 py-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="font-serif text-2xl tracking-tight">CoNovel</h1>
        <p class="text-muted text-sm mt-1">项目中心</p>
      </div>
      <button onclick={() => { showCreate = true; newTitle = ''; newGenre = ''; newPremise = ''; }} class="bg-foreground text-background px-4 py-2 text-sm hover:bg-transparent hover:text-foreground border border-foreground transition-colors active:scale-95">
        新建项目
      </button>
    </div>
  </header>

  {#if !loading && !hasProviders}
    <div class="mx-12 mt-6 p-4 border border-border bg-background">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium mb-1">配置 LLM 服务商</p>
          <p class="text-xs text-muted">在开始写作前，需要配置一个 LLM 服务商来使用 AI 功能。</p>
        </div>
        <a href="/settings" class="bg-foreground text-background px-4 py-2 text-sm hover:bg-transparent hover:text-foreground border border-foreground transition-colors flex-shrink-0">去配置</a>
      </div>
    </div>
  {/if}

  <div class="flex-1 p-12">
    {#if loading}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {#each [1, 2, 3] as _}
          <div class="border border-border p-6">
            <div class="h-4 bg-black/5 dark:bg-white/5 rounded w-32 mb-4"></div>
            <div class="h-3 bg-black/5 dark:bg-white/5 rounded w-20 mb-2"></div>
            <div class="h-3 bg-black/5 dark:bg-white/5 rounded w-24"></div>
          </div>
        {/each}
      </div>
    {:else if books.length === 0}
      <div class="text-center py-24">
        <p class="font-serif text-xl text-muted mb-2">还没有项目</p>
        <p class="text-sm text-muted mb-8">创建你的第一本小说，开始写作之旅</p>
        <button onclick={() => { showCreate = true; newTitle = ''; newGenre = ''; newPremise = ''; }} class="bg-foreground text-background px-6 py-2.5 text-sm border border-foreground hover:bg-transparent hover:text-foreground transition-colors">
          新建项目
        </button>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {#each books as book}
          <a href="/editor?bookId={book.id}&num={book.currentChapter || 1}" class="border border-border p-6 block group hover:border-foreground transition-colors">
            <h2 class="font-serif text-xl tracking-tight mb-1 group-hover:underline">{book.title}</h2>
            <p class="text-xs uppercase tracking-[0.2em] text-muted mb-4">{book.genre || '未分类'}</p>
            <div class="flex items-center gap-4 text-xs text-muted">
              <span>{book.totalChapters || 0} 章</span>
              <span>{(book.currentWordCount || 0).toLocaleString()} 字</span>
            </div>
            <p class="text-xs text-muted/60 mt-2">
              {book.updatedAt ? new Date(book.updatedAt).toLocaleDateString('zh-CN') : new Date(book.createdAt).toLocaleDateString('zh-CN')}
            </p>
          </a>
        {/each}
        <button onclick={() => { showCreate = true; newTitle = ''; newGenre = ''; newPremise = ''; }} class="border border-border border-dashed p-6 flex items-center justify-center min-h-[160px] text-muted hover:text-foreground transition-colors">
          <span class="text-sm tracking-wide">+ 新建项目</span>
        </button>
      </div>
    {/if}
  </div>

  <div class="border-t border-border px-12 py-3 flex items-center gap-3">
    <span class="w-2 h-2 rounded-full {hasProviders ? 'bg-green-600' : 'bg-red-500'}"></span>
    <span class="text-xs text-muted">
      {#if hasProviders}Agent 就绪{:else}<a href="/settings" class="underline hover:text-foreground">未配置 LLM 服务商</a>{/if}
    </span>
    <span class="text-xs text-muted/40 ml-auto">CoNovel v0.2.0</span>
  </div>
</div>

{#if showCreate}
  <div class="fixed inset-0 z-[100] flex items-center justify-center" onclick={() => showCreate = false}>
    <div class="fixed inset-0 bg-black/30"></div>
    <div class="relative bg-background border border-border w-[28rem] p-6" onclick={(e) => e.stopPropagation()}>
      <h3 class="font-serif text-lg mb-4">新建项目</h3>
      <div class="space-y-4">
        <div>
          <label class="text-xs text-muted block mb-1">书名 *</label>
          <input type="text" bind:value={newTitle} class="w-full border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-foreground" placeholder="输入书名..." onkeydown={(e) => e.key === 'Enter' && handleCreate()} />
        </div>
        <div>
          <label class="text-xs text-muted block mb-1">类型</label>
          <div class="flex flex-wrap gap-1.5">
            {#each GENRES as g}
              <button onclick={() => newGenre = newGenre === g ? '' : g} class="px-2.5 py-1 text-[11px] border transition-colors {newGenre === g ? 'border-foreground bg-foreground/10' : 'border-border hover:border-foreground/50'}">
                {g}
              </button>
            {/each}
          </div>
        </div>
        <div>
          <label class="text-xs text-muted block mb-1">核心设定</label>
          <textarea bind:value={newPremise} class="w-full border border-border px-3 py-2 text-sm bg-transparent h-20 resize-none focus:outline-none focus:border-foreground" placeholder="一句话描述故事核心..."></textarea>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-6">
        <button onclick={() => showCreate = false} class="border border-border px-4 py-2 text-xs hover:border-foreground transition-colors">取消</button>
        <button onclick={handleCreate} disabled={!newTitle.trim() || creating} class="bg-foreground text-background px-4 py-2 text-xs border border-foreground hover:bg-transparent hover:text-foreground transition-colors disabled:opacity-40">
          {creating ? '创建中...' : '创建'}
        </button>
      </div>
    </div>
  </div>
{/if}
