<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { runPipeline } from '$lib/pipeline';
  import { PIPELINE_STAGES, STAGE_NAMES, STAGE_PROGRESS } from '$lib/pipeline/prompts';
  import { getProviders } from '$lib/providers';
  import { toasts } from '$lib/stores/toast';

  let { bookId, book } = $props();
  let running = $state(false);
  let state = $state(null);
  let error = $state(null);
  let canStart = $state(true);
  let checking = $state(true);

  let nextChapter = $derived((book?.totalChapters || 0) + 1);

  onMount(async () => {
    try { const p = await getProviders(); canStart = p.some(x => x.enabled && x.models.length > 0); } catch {}
    checking = false;
  });

  async function start() {
    running = true; error = null;
    state = await runPipeline(bookId, nextChapter, {
      onStageStart: (stage, progress) => { if (state) state = { ...state, currentStage: stage, progress }; },
      onStageComplete: (stage, output, progress) => { if (state) state = { ...state, progress, stageResults: { ...state.stageResults, [stage]: output.result } }; },
      onError: (stage, msg) => { console.error(`Stage ${stage}:`, msg); },
    });
    running = false;
    if (state.status === 'completed') { toasts.add('创作完成', 'success'); goto(`/editor?bookId=${bookId}&num=${nextChapter}`); }
    else if (state.status === 'error') { error = state.errors.join('\n') || 'Pipeline failed'; }
  }
</script>

{#if !checking && !canStart}
  <div class="border border-yellow-300 bg-yellow-50 p-4 text-sm mb-4">
    <p class="font-medium">尚未配置 LLM 服务商</p>
    <p class="text-xs text-yellow-700 mt-1">请先在「设置」中配置 LLM 服务商。</p>
  </div>
{/if}

<div class="border border-border p-4 mb-4">
  <div class="flex items-center justify-between mb-4">
    <div>
      <p class="text-[10px] uppercase tracking-widest text-muted">创作流水线</p>
      <p class="text-xs text-muted mt-1">下一个章节: 第{nextChapter}章</p>
    </div>
    <div class="flex gap-2">
      {#if running}
        <button onclick={() => { running = false; }} class="border border-border px-3 py-1.5 text-xs hover:border-foreground transition-colors">停止</button>
      {/if}
      <button onclick={start} disabled={running || !canStart} class="bg-foreground text-background px-4 py-1.5 text-xs border border-foreground hover:bg-transparent hover:text-foreground transition-colors disabled:opacity-50">
        {running ? `创作中... ${state?.progress || 0}%` : '开始创作'}
      </button>
    </div>
  </div>

  <div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
    {#each PIPELINE_STAGES as stage}
      {@const progress = STAGE_PROGRESS[stage]}
      {@const current = state?.progress || 0}
      <div class="border p-2 text-center text-[10px] {current > progress ? 'border-foreground bg-foreground text-background' : state?.currentStage === stage && running ? 'border-foreground bg-foreground/5 animate-pulse' : 'border-border text-muted'}">
        {STAGE_NAMES[stage]}
      </div>
    {/each}
  </div>

  {#if state}
    <div class="mt-3"><div class="w-full h-1 bg-border/30 rounded-full overflow-hidden"><div class="h-full bg-foreground/40 transition-all duration-500" style="width: {state.progress}%"></div></div></div>
  {/if}
</div>

{#if error}
  <div class="border border-red-300 bg-red-50 p-4 text-xs text-red-700 mb-4">{error}</div>
{/if}
