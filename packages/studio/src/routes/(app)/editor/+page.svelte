<script>
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { api } from '$lib/api';
  import { toasts } from '$lib/stores/toast';

  let bookId = $derived(page.url.searchParams.get('bookId') || '');
  let num = $derived(parseInt(page.url.searchParams.get('num') || '1', 10));

  let chapter = $state(null);
  let content = $state('');
  let saving = $state(false);
  let saved = $state(false);
  let loading = $state(true);
  let book = $state(null);
  let chapters = $state([]);
  let activeTool = $state('outline');
  let lastSaved = $state(null);
  let textareaEl = $state(null);
  let dirty = false;
  let saveTimer = null;

  const TOOLS = [
    { id: 'outline', label: '大纲' },
    { id: 'characters', label: '角色' },
    { id: 'foreshadowing', label: '伏笔' },
    { id: 'timeline', label: '时间线' },
    { id: 'style', label: '风格' },
    { id: 'constraints', label: '约束' },
    { id: 'memory', label: '记忆' },
    { id: 'ai', label: 'AI 助手' },
  ];

  async function loadData(chapterNum) {
    if (!bookId) { loading = false; return; }
    loading = true;
    try {
      const [ch, b, chs] = await Promise.all([
        api.get(`/api/books/${bookId}/chapters/${chapterNum}`).catch(() => null),
        api.get(`/api/books/${bookId}`),
        api.get(`/api/books/${bookId}/chapters`),
      ]);
      book = b;
      chapters = chs.chapters || [];
      chapter = ch;
      content = ch?.content || '';
    } catch { book = null; }
    loading = false;
  }

  $effect(() => { loadData(num); });

  $effect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); doSave(); }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  $effect(() => {
    if (!content || !bookId || !chapter) return;
    dirty = true;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (dirty) {
        api.put(`/api/books/${bookId}/chapters/${num}`, { content })
          .then(() => { lastSaved = new Date(); dirty = false; })
          .catch(() => toasts.add('自动保存失败', 'error'));
      }
    }, 2000);
    return () => { if (saveTimer) clearTimeout(saveTimer); };
  });

  async function doSave() {
    if (!chapter || !content) return;
    saving = true;
    try {
      await api.put(`/api/books/${bookId}/chapters/${num}`, { content });
      saved = true;
      lastSaved = new Date();
      dirty = false;
      setTimeout(() => saved = false, 2000);
    } catch { toasts.add('保存失败', 'error'); }
    saving = false;
  }

  async function createFirstChapter() {
    try {
      await api.post(`/api/books/${bookId}/chapters`, { chapterNumber: 1, title: '第1章', content: '', outline: '' });
      toasts.add('第一章已创建', 'success');
      goto(`/editor?bookId=${bookId}&num=1`);
    } catch { toasts.add('创建失败', 'error'); }
  }

  async function addChapter() {
    const nextNum = (chapters.length > 0 ? Math.max(...chapters.map(c => c.chapter_number || c.num || 0)) : 0) + 1;
    try {
      await api.post(`/api/books/${bookId}/chapters`, { chapterNumber: nextNum, title: `第${nextNum}章`, content: '', outline: '' });
      toasts.add(`第${nextNum}章已创建`, 'success');
      goto(`/editor?bookId=${bookId}&num=${nextNum}`);
    } catch { toasts.add('创建失败', 'error'); }
  }

  let wordCount = $derived((content.match(/[\u4e00-\u9fff]/g) || []).length + (content.match(/[a-zA-Z]+/g) || []).length);
  let targetWords = $derived(chapter?.wordTarget || 3000);
  let wordProgress = $derived(targetWords > 0 ? Math.min(100, Math.round((wordCount / targetWords) * 100)) : 0);
</script>

{#if !bookId}
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <p class="text-sm text-muted mb-4">缺少项目 ID</p>
      <a href="/" class="border border-border px-4 py-2 text-xs hover:border-foreground transition-colors">返回项目中心</a>
    </div>
  </div>
{:else if loading}
  <div class="flex items-center justify-center min-h-screen"><p class="text-sm text-muted">加载中...</p></div>
{:else if chapters.length === 0}
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-center max-w-md">
      <h2 class="font-serif text-xl mb-2">{book?.title || '未命名项目'}</h2>
      <p class="text-sm text-muted mb-6">这是一个新项目，还没有任何章节。</p>
      <button onclick={createFirstChapter} class="bg-foreground text-background px-6 py-2.5 text-sm border border-foreground hover:bg-transparent hover:text-foreground transition-colors">开始创作第一章</button>
      <p class="text-xs text-muted mt-4">或者先去 <a href="/book?id={bookId}" class="underline hover:text-foreground">项目设置</a> 配置角色、大纲和风格</p>
    </div>
  </div>
{:else if !chapter}
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <p class="text-sm text-muted mb-4">第 {num} 章不存在</p>
      <a href="/editor?bookId={bookId}&num=1" class="border border-border px-4 py-2 text-xs hover:border-foreground transition-colors">回到第 1 章</a>
    </div>
  </div>
{:else}
  <div class="flex flex-col h-screen overflow-hidden">
    <header class="flex items-center justify-between px-4 py-2 border-b border-border flex-shrink-0">
      <div class="flex items-center gap-3 min-w-0">
        <a href="/" class="text-muted hover:text-foreground text-xs transition-colors flex-shrink-0">项目中心</a>
        <span class="text-muted/30">/</span>
        <span class="text-sm font-serif truncate">{book?.title || '未命名'}</span>
        <span class="text-muted/30">·</span>
        <span class="text-xs text-muted flex-shrink-0">第{num}章 {chapter?.title || ''}</span>
      </div>
      <div class="flex items-center gap-3 flex-shrink-0">
        <div class="flex items-center gap-2">
          <div class="w-16 h-1.5 bg-border/30 rounded-full overflow-hidden">
            <div class="h-full bg-foreground/40 transition-all" style="width: {wordProgress}%"></div>
          </div>
          <span class="font-mono text-[11px] text-muted">{wordCount.toLocaleString()}/{targetWords.toLocaleString()}</span>
        </div>
        {#if lastSaved}
          <span class="text-[10px] text-muted/50">{lastSaved.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 已保存</span>
        {/if}
        <button onclick={doSave} disabled={saving} class="bg-foreground text-background px-3 py-1.5 text-xs border border-foreground hover:bg-transparent hover:text-foreground transition-colors disabled:opacity-50">
          {saving ? '...' : saved ? '✓' : '保存'}
        </button>
        <a href="/book?id={bookId}" class="border border-border px-3 py-1.5 text-xs hover:border-foreground transition-colors">设置</a>
      </div>
    </header>

    <div class="flex-1 flex overflow-hidden">
      <aside class="w-60 border-r border-border flex flex-col flex-shrink-0 overflow-hidden">
        <div class="py-2 border-b border-border">
          <p class="px-3 py-1 text-[10px] text-muted/50 uppercase tracking-widest">工具</p>
          {#each TOOLS as tool}
            <button onclick={() => activeTool = tool.id} class="w-full text-left px-3 py-1.5 text-xs transition-colors {activeTool === tool.id ? 'bg-foreground/10 text-foreground' : 'text-muted hover:text-foreground hover:bg-foreground/5'}">{tool.label}</button>
          {/each}
        </div>
        <div class="flex-1 overflow-y-auto py-2">
          <div class="flex items-center justify-between px-3 mb-1">
            <p class="text-[10px] text-muted/50 uppercase tracking-widest">章节</p>
            <button onclick={addChapter} class="text-[10px] text-muted hover:text-foreground transition-colors px-1" title="新建章节">+</button>
          </div>
          {#each chapters as ch}
            {@const chNum = ch.chapter_number || ch.num}
            <a href="/editor?bookId={bookId}&num={chNum}" class="block px-3 py-1.5 text-xs transition-colors {chNum === num ? 'bg-foreground/10 text-foreground font-medium' : 'text-muted hover:text-foreground hover:bg-foreground/5'}">
              <span class="text-muted/40 mr-1.5">{chNum}</span>{ch.title || `第${chNum}章`}
            </a>
          {/each}
        </div>
      </aside>

      <div class="flex-1 flex flex-col min-w-0">
        <textarea bind:this={textareaEl} bind:value={content} class="flex-1 w-full p-8 font-sans text-base leading-loose resize-none focus:outline-none bg-background text-foreground" placeholder="在此输入章节内容... (Ctrl+S 保存)" spellcheck="true"></textarea>
      </div>

      <aside class="w-72 border-l border-border flex-shrink-0 overflow-y-auto">
        <div class="flex border-b border-border overflow-x-auto">
          {#each TOOLS as tool}
            <button onclick={() => activeTool = tool.id} class="px-3 py-2 text-[11px] whitespace-nowrap transition-colors flex-shrink-0 {activeTool === tool.id ? 'border-b-2 border-foreground text-foreground' : 'text-muted hover:text-foreground'}">{tool.label}</button>
          {/each}
        </div>
        <div class="p-4">
          {#if activeTool === 'ai'}
            <p class="text-[10px] uppercase tracking-widest text-muted mb-3">AI 助手</p>
            <p class="text-xs text-muted mb-4">在编辑器中选中文本，然后点击按钮：</p>
            <div class="space-y-2">
              {#each ['润色', '去AI味', '扩写', '缩写'] as action}
                <button class="w-full text-left border border-border px-3 py-2 text-xs hover:border-foreground transition-colors">{action}</button>
              {/each}
            </div>
          {:else}
            <p class="text-[10px] uppercase tracking-widest text-muted mb-3">{TOOLS.find(t => t.id === activeTool)?.label}</p>
            <p class="text-xs text-muted">内容面板</p>
          {/if}
        </div>
      </aside>
    </div>

    <footer class="border-t border-border px-4 py-1.5 flex items-center justify-between text-[11px] text-muted flex-shrink-0">
      <span>第{num}章 · {wordCount.toLocaleString()} 字 · Ctrl+S 保存</span>
      <span>CoNovel v0.2.0</span>
    </footer>
  </div>
{/if}
