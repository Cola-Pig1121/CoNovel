<script>
  import { WRITING_TECHNIQUES } from '$lib/writing-techniques';
  let { bookId, book } = $props();
  let activeCategory = $state('all');
  let expanded = $state({});

  const categories = [...new Set(WRITING_TECHNIQUES.map(t => t.category))];
  const CATEGORY_LABELS = { plot: '剧情', character: '角色', world: '世界', hook: '钩子', technique: '技法' };

  $derived: filtered = activeCategory === 'all' ? WRITING_TECHNIQUES : WRITING_TECHNIQUES.filter(t => t.category === activeCategory);

  function toggle(id) { expanded[id] = !expanded[id]; expanded = { ...expanded }; }
</script>

<div>
  <p class="text-[10px] uppercase tracking-widest text-muted mb-3">写作技法库</p>

  <div class="flex gap-1 mb-4 flex-wrap">
    <button onclick={() => activeCategory = 'all'} class="px-2 py-1 text-[10px] border transition-colors {activeCategory === 'all' ? 'border-foreground bg-foreground/10' : 'border-border'}">全部</button>
    {#each categories as cat}
      <button onclick={() => activeCategory = cat} class="px-2 py-1 text-[10px] border transition-colors {activeCategory === cat ? 'border-foreground bg-foreground/10' : 'border-border'}">{CATEGORY_LABELS[cat] || cat}</button>
    {/each}
  </div>

  <div class="space-y-2">
    {#each filtered as tech}
      <div class="border border-border">
        <button onclick={() => toggle(tech.id)} class="w-full text-left px-3 py-2.5 flex items-center justify-between text-xs hover:bg-foreground/5 transition-colors">
          <div>
            <span class="font-medium">{tech.name}</span>
            <span class="text-muted ml-2 text-[10px]">{tech.nameEn}</span>
          </div>
          <span class="text-muted">{expanded[tech.id] ? '−' : '+'}</span>
        </button>
        {#if expanded[tech.id]}
          <div class="px-3 pb-3 border-t border-border">
            <p class="text-xs text-muted leading-relaxed mt-2">{tech.description}</p>
            {#if tech.formula}
              <p class="text-[10px] text-foreground/60 mt-2 font-mono">公式: {tech.formula}</p>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>
