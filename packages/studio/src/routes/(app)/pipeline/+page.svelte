<script>
  import { onMount } from 'svelte';
  import { api } from '$lib/api';

  let pipelines = $state([]);
  let loading = $state(true);

  const STAGES = ['context_assembled', 'character_intelligence', 'writing', 'observation', 'fact_check', 'continuity_check', 'pacing_check', 'reviewing', 'editing', 'de_ai', 'completed'];
  const STAGE_NAMES = { context_assembled: '上下文', character_intelligence: '角色推理', writing: '写作', observation: '事件记录', fact_check: '事实核查', continuity_check: '连续性', pacing_check: '节奏', reviewing: '审阅', editing: '润色', de_ai: '去AI', completed: '完成' };

  onMount(async () => {
    try { const data = await api.get('/api/pipeline'); pipelines = data.activeBooks || []; } catch {}
    loading = false;
  });
</script>

<div class="p-8">
  <h1 class="font-serif text-xl tracking-tight mb-6">写作流水线</h1>

  {#if loading}
    <p class="text-sm text-muted">加载中...</p>
  {:else if pipelines.length === 0}
    <div class="border border-border p-12 text-center"><p class="text-sm text-muted">当前没有正在创作的章节</p></div>
  {:else}
    <div class="space-y-4">
      {#each pipelines as p}
        <div class="border border-border p-4">
          <div class="flex items-center justify-between mb-3">
            <div>
              <a href="/book?id={p.bookId}" class="font-serif hover:underline">{p.bookTitle}</a>
              <p class="text-xs text-muted mt-1">第 {p.currentChapter} 章 · {p.pipelineStage}</p>
            </div>
            <span class="font-mono text-lg">{p.pipelineProgress}%</span>
          </div>
          <div class="w-full h-1.5 bg-border/30 rounded-full overflow-hidden">
            <div class="h-full bg-foreground/40 transition-all" style="width: {p.pipelineProgress}%"></div>
          </div>
          <div class="flex gap-1 mt-3">
            {#each STAGES as stage}
              <div class="flex-1 h-1.5 rounded-sm {p.pipelineProgress >= (STAGES.indexOf(stage) / STAGES.length) * 100 ? 'bg-foreground/40' : 'bg-border/30'}" title={STAGE_NAMES[stage]}></div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
