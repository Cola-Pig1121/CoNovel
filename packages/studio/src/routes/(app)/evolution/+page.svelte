<script>
  let activeTab = $state('performance');
</script>

<div class="p-8">
  <h1 class="font-serif text-xl tracking-tight mb-6">进化追踪</h1>

  <div class="flex gap-1 border-b border-border mb-6">
    <button onclick={() => activeTab = 'performance'} class="px-4 py-2 text-xs transition-colors {activeTab === 'performance' ? 'border-b-2 border-foreground' : 'text-muted hover:text-foreground'}">性能</button>
    <button onclick={() => activeTab = 'style'} class="px-4 py-2 text-xs transition-colors {activeTab === 'style' ? 'border-b-2 border-foreground' : 'text-muted hover:text-foreground'}">风格</button>
    <button onclick={() => activeTab = 'learning'} class="px-4 py-2 text-xs transition-colors {activeTab === 'learning' ? 'border-b-2 border-foreground' : 'text-muted hover:text-foreground'}">学习</button>
  </div>

  {#if activeTab === 'performance'}
    <div class="border border-border p-8 text-center">
      <p class="text-sm text-muted mb-2">性能数据将在创作过程中自动生成</p>
      <p class="text-xs text-muted">每章完成后会分析 Agent 响应时间和质量趋势</p>
    </div>
  {:else if activeTab === 'style'}
    <div class="border border-border p-8 text-center">
      <p class="text-sm text-muted mb-2">风格进化数据将在创作过程中自动生成</p>
      <p class="text-xs text-muted">每章完成后会提取风格指纹，逐步建立风格基准</p>
    </div>
  {:else}
    <div class="border border-border p-8 text-center">
      <p class="text-sm text-muted mb-2">学习数据将在创作过程中自动生成</p>
      <p class="text-xs text-muted">记录 AI 的写作改进和用户反馈</p>
    </div>
  {/if}
</div>
