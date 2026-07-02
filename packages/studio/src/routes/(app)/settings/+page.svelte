<script>
  import ProviderManager from '$lib/components/settings/ProviderManager.svelte';
  import AgentModelConfig from '$lib/components/settings/AgentModelConfig.svelte';

  let activeTab = $state('providers');
</script>

<div class="p-8">
  <h1 class="font-serif text-xl tracking-tight mb-6">系统设置</h1>
  <div class="flex gap-1 border-b border-border mb-6">
    <button onclick={() => activeTab = 'providers'} class="px-4 py-2 text-xs transition-colors {activeTab === 'providers' ? 'border-b-2 border-foreground' : 'text-muted hover:text-foreground'}">服务商</button>
    <button onclick={() => activeTab = 'agents'} class="px-4 py-2 text-xs transition-colors {activeTab === 'agents' ? 'border-b-2 border-foreground' : 'text-muted hover:text-foreground'}">Agent 模型</button>
  </div>
  {#if activeTab === 'providers'}
    <ProviderManager />
  {:else}
    <AgentModelConfig />
  {/if}
</div>
