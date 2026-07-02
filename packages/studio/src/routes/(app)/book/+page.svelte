<script>
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { api } from '$lib/api';

  let id = $derived($page.url.searchParams.get('id') || '');
  let activeTab = $state($page.url.searchParams.get('tab') || 'overview');
  let book = $state(null);
  let loading = $state(true);

  const TAB_GROUPS = [
    { label: '项目', tabs: [{ id: 'overview', label: '概览' }, { id: 'chapters', label: '章节' }, { id: 'write', label: '写作' }, { id: 'git', label: '版本' }] },
    { label: '创作', tabs: [{ id: 'outline', label: '大纲' }, { id: 'characters', label: '角色' }, { id: 'foreshadowing', label: '伏笔' }, { id: 'timeline', label: '时间线' }] },
    { label: '风格', tabs: [{ id: 'style', label: '风格' }, { id: 'constraints', label: '约束' }, { id: 'reference', label: '参考' }, { id: 'techniques', label: '技法' }, { id: 'naming', label: '取名' }] },
    { label: '分析', tabs: [{ id: 'hooks', label: 'Hook治理' }, { id: 'reading-power', label: '追读力' }] },
  ];

  onMount(async () => {
    if (!id) { loading = false; return; }
    try { book = await api.get(`/api/books/${id}`); } catch {}
    loading = false;
  });

  $effect(() => {
    const tab = $page.url.searchParams.get('tab');
    if (tab) activeTab = tab;
  });
</script>

{#if !id}
  <div class="p-12"><p class="text-muted mb-4">未指定项目</p><a href="/" class="border border-border px-4 py-2 text-xs hover:border-foreground transition-colors">返回项目中心</a></div>
{:else if loading}
  <div class="p-12 text-muted">加载中...</div>
{:else if !book}
  <div class="p-12"><p class="text-muted mb-4">项目不存在</p><a href="/" class="border border-border px-4 py-2 text-xs hover:border-foreground transition-colors">返回项目中心</a></div>
{:else}
  <div>
    <header class="border-b border-border px-8 py-3 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <a href="/" class="text-muted hover:text-foreground text-sm">← 书架</a>
        <h1 class="font-serif text-lg">{book.title}</h1>
        <span class="text-xs text-muted font-mono">{book.genre} · {(book.currentWordCount || 0).toLocaleString()} 字</span>
      </div>
      <a href="/editor?bookId={id}&num={book.currentChapter || 1}" class="bg-foreground text-background px-3 py-1.5 text-xs border border-foreground hover:bg-transparent hover:text-foreground transition-colors">进入编辑器</a>
    </header>

    <div class="flex items-end gap-4 px-8 border-b border-border overflow-x-auto">
      {#each TAB_GROUPS as group}
        <div class="flex items-end gap-0">
          <span class="text-[10px] text-muted/40 uppercase tracking-widest pb-2.5 pr-2 flex-shrink-0">{group.label}</span>
          {#each group.tabs as tab}
            <button onclick={() => activeTab = tab.id} class="px-2.5 py-2.5 text-xs transition-colors whitespace-nowrap {activeTab === tab.id ? 'border-b-2 border-foreground' : 'text-muted hover:text-foreground'}">{tab.label}</button>
          {/each}
        </div>
      {/each}
    </div>

    <div class="px-8 py-6">
      {#if activeTab === 'overview'}
        <div class="space-y-4">
          <h2 class="font-serif text-lg">{book.title}</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="border border-border p-4"><p class="text-[10px] uppercase tracking-widest text-muted mb-1">类型</p><p class="text-sm">{book.genre || '未分类'}</p></div>
            <div class="border border-border p-4"><p class="text-[10px] uppercase tracking-widest text-muted mb-1">章节</p><p class="text-sm">{book.totalChapters || 0}</p></div>
            <div class="border border-border p-4"><p class="text-[10px] uppercase tracking-widest text-muted mb-1">字数</p><p class="text-sm">{(book.currentWordCount || 0).toLocaleString()}</p></div>
            <div class="border border-border p-4"><p class="text-[10px] uppercase tracking-widest text-muted mb-1">状态</p><p class="text-sm">{book.status || 'planning'}</p></div>
          </div>
          {#if book.premise}
            <div class="border border-border p-4"><p class="text-[10px] uppercase tracking-widest text-muted mb-2">核心设定</p><p class="text-sm text-muted leading-relaxed">{book.premise}</p></div>
          {/if}
        </div>
      {:else if activeTab === 'write'}
        <div>
          <p class="text-[10px] uppercase tracking-widest text-muted mb-4">创作流水线</p>
          <p class="text-sm text-muted mb-4">使用 AI Pipeline 自动创作章节。</p>
          <a href="/editor?bookId={id}&num={(book.totalChapters || 0) + 1}" class="bg-foreground text-background px-4 py-2 text-xs border border-foreground hover:bg-transparent hover:text-foreground transition-colors inline-block">前往编辑器创作</a>
        </div>
      {:else if activeTab === 'git'}
        <div class="border border-border p-8 text-center"><p class="text-sm text-muted">Git 版本控制需要在 Tauri 桌面端使用</p></div>
      {:else}
        <div class="border border-border p-8 text-center">
          <p class="text-sm text-muted">「{TAB_GROUPS.flatMap(g => g.tabs).find(t => t.id === activeTab)?.label}」功能正在迁移中...</p>
        </div>
      {/if}
    </div>
  </div>
{/if}
