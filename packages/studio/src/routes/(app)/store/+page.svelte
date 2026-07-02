<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { isTauri, tauriInvoke } from '$lib/tauri';
  import { toasts } from '$lib/stores/toast';
  import { api } from '$lib/api';

  let templates = $state([]);
  let loading = $state(true);
  let activeCategory = $state('all');
  let showExport = $state(false);
  let showClone = $state(false);
  let books = $state([]);
  let exportBookId = $state('');
  let exportName = $state('');
  let exportDesc = $state('');
  let cloneUrl = $state('');
  let status = $state('');

  const CATEGORIES = [
    { id: 'all', label: '全部' },
    { id: 'template', label: '项目模板' },
    { id: 'style', label: '风格包' },
    { id: 'constraint', label: '约束规则' },
  ];

  const officialTemplates = [
    { name: '仙侠·废柴逆袭', repo: 'https://github.com/Cola-Pig1121/conovel-templates', description: '仙侠题材模板', category: 'template' },
    { name: '都市·重生复仇', repo: 'https://github.com/Cola-Pig1121/conovel-templates', description: '都市题材模板', category: 'template' },
    { name: '玄幻·系统流', repo: 'https://github.com/Cola-Pig1121/conovel-templates', description: '玄幻题材模板', category: 'template' },
  ];

  let filteredOfficial = $derived(activeCategory === 'all' ? officialTemplates : officialTemplates.filter(t => t.category === activeCategory));

  onMount(async () => {
    if (isTauri()) {
      try { templates = await tauriInvoke('list_templates'); } catch {}
    }
    try { const data = await api.get('/api/books'); books = data.books || []; } catch {}
    loading = false;
  });

  async function handleExport() {
    if (!exportBookId || !exportName.trim()) return;
    try {
      await tauriInvoke('export_template', { book_id: exportBookId, template_name: exportName.trim(), description: exportDesc.trim() });
      toasts.add('导出成功', 'success');
      showExport = false;
      templates = await tauriInvoke('list_templates');
    } catch { toasts.add('导出失败', 'error'); }
  }

  async function handleClone() {
    if (!cloneUrl.trim()) return;
    status = '克隆中...';
    try {
      await tauriInvoke('clone_template', { repo_url: cloneUrl.trim() });
      toasts.add('克隆成功', 'success');
      showClone = false;
      status = '';
      templates = await tauriInvoke('list_templates');
    } catch { toasts.add('克隆失败', 'error'); status = ''; }
  }

  async function handleImport(name) {
    status = '导入中...';
    try {
      const res = await tauriInvoke('import_template', { template_name: name, new_book_id: crypto.randomUUID(), new_book_title: name });
      toasts.add('导入成功', 'success');
      status = '';
    } catch { toasts.add('导入失败', 'error'); status = ''; }
  }

  async function handleDelete(name) {
    if (!confirm(`删除模板 ${name}？`)) return;
    try { await tauriInvoke('delete_template', { template_name: name }); templates = await tauriInvoke('list_templates'); toasts.add('已删除', 'success'); } catch { toasts.add('删除失败', 'error'); }
  }
</script>

<div class="p-8">
  <div class="flex items-center justify-between mb-6">
    <h1 class="font-serif text-xl tracking-tight">模板商店</h1>
    <div class="flex gap-2">
      {#if isTauri()}
        <button onclick={() => showExport = true} class="border border-border px-3 py-1.5 text-xs hover:border-foreground transition-colors">导出模板</button>
        <button onclick={() => showClone = true} class="border border-border px-3 py-1.5 text-xs hover:border-foreground transition-colors">从 GitHub 克隆</button>
      {/if}
    </div>
  </div>

  {#if status}
    <div class="mb-4 p-3 border border-border text-xs text-muted">{status}</div>
  {/if}

  <!-- Category Tabs -->
  <div class="flex gap-1 mb-6 border-b border-border">
    {#each CATEGORIES as cat}
      <button onclick={() => activeCategory = cat.id} class="px-4 py-2 text-xs transition-colors {activeCategory === cat.id ? 'border-b-2 border-foreground' : 'text-muted hover:text-foreground'}">{cat.label}</button>
    {/each}
  </div>

  <!-- Local Templates -->
  {#if isTauri()}
    <section class="mb-8">
      <h3 class="text-[10px] uppercase tracking-widest text-muted mb-3">本地模板</h3>
      {#if loading}
        <p class="text-xs text-muted">加载中...</p>
      {:else if templates.length === 0}
        <p class="text-xs text-muted py-4">暂无本地模板</p>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {#each templates as t}
            <div class="border border-border p-4">
              <p class="text-sm font-medium mb-1">{t.name}</p>
              {#if t.description}<p class="text-xs text-muted mb-3">{t.description}</p>{/if}
              <div class="flex gap-2">
                <button onclick={() => handleImport(t.name)} class="bg-foreground text-background px-3 py-1 text-[10px] border border-foreground hover:bg-transparent hover:text-foreground transition-colors">导入</button>
                <button onclick={() => handleDelete(t.name)} class="text-red-500 hover:text-red-700 text-[10px]">删除</button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  {/if}

  <!-- Official Templates -->
  <section>
    <h3 class="text-[10px] uppercase tracking-widest text-muted mb-3">官方模板</h3>
    {#if filteredOfficial.length === 0}
      <p class="text-xs text-muted py-4 text-center">该分类下暂无模板</p>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {#each filteredOfficial as t}
          <div class="border border-border p-4">
            <p class="text-sm font-medium mb-1">{t.name}</p>
            <p class="text-xs text-muted mb-3">{t.description}</p>
            {#if isTauri()}
              <button onclick={async () => { status = '克隆中...'; try { await tauriInvoke('clone_template', { repo_url: t.repo }); toasts.add('克隆成功', 'success'); templates = await tauriInvoke('list_templates'); } catch { toasts.add('克隆失败', 'error'); } status = ''; }} class="bg-foreground text-background px-3 py-1 text-[10px] border border-foreground hover:bg-transparent hover:text-foreground transition-colors">克隆使用</button>
            {:else}
              <a href={t.repo} target="_blank" class="text-xs text-muted underline hover:text-foreground">查看模板</a>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>

<!-- Export Modal -->
{#if showExport}
  <div class="fixed inset-0 z-[100] flex items-center justify-center" onclick={() => showExport = false}>
    <div class="fixed inset-0 bg-black/30"></div>
    <div class="relative bg-background border border-border w-[28rem] p-6" onclick={(e) => e.stopPropagation()}>
      <h3 class="font-serif text-lg mb-4">导出模板</h3>
      <div class="space-y-4">
        <div><label class="text-xs text-muted block mb-1">选择书籍</label><select bind:value={exportBookId} class="w-full border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-foreground"><option value="">选择...</option>{#each books as b}<option value={b.id}>{b.title}</option>{/each}</select></div>
        <div><label class="text-xs text-muted block mb-1">模板名称 *</label><input type="text" bind:value={exportName} class="w-full border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-foreground" placeholder="My Template" /></div>
        <div><label class="text-xs text-muted block mb-1">描述</label><textarea bind:value={exportDesc} class="w-full border border-border px-3 py-2 text-sm bg-transparent h-16 resize-none focus:outline-none focus:border-foreground"></textarea></div>
      </div>
      <div class="flex justify-end gap-2 mt-6">
        <button onclick={() => showExport = false} class="border border-border px-4 py-2 text-xs hover:border-foreground transition-colors">取消</button>
        <button onclick={handleExport} disabled={!exportBookId || !exportName.trim()} class="bg-foreground text-background px-4 py-2 text-xs border border-foreground hover:bg-transparent hover:text-foreground transition-colors disabled:opacity-40">导出</button>
      </div>
    </div>
  </div>
{/if}

<!-- Clone Modal -->
{#if showClone}
  <div class="fixed inset-0 z-[100] flex items-center justify-center" onclick={() => showClone = false}>
    <div class="fixed inset-0 bg-black/30"></div>
    <div class="relative bg-background border border-border w-[28rem] p-6" onclick={(e) => e.stopPropagation()}>
      <h3 class="font-serif text-lg mb-4">从 GitHub 克隆</h3>
      <div><label class="text-xs text-muted block mb-1">仓库 URL</label><input type="url" bind:value={cloneUrl} class="w-full border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-foreground" placeholder="https://github.com/user/repo" /></div>
      <div class="flex justify-end gap-2 mt-6">
        <button onclick={() => showClone = false} class="border border-border px-4 py-2 text-xs hover:border-foreground transition-colors">取消</button>
        <button onclick={handleClone} disabled={!cloneUrl.trim()} class="bg-foreground text-background px-4 py-2 text-xs border border-foreground hover:bg-transparent hover:text-foreground transition-colors disabled:opacity-40">克隆</button>
      </div>
    </div>
  </div>
{/if}
