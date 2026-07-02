<script>
  import Sidebar from '$lib/components/Sidebar.svelte';
  import Toast from '$lib/components/Toast.svelte';

  let { children } = $props();
  let sidebarExpanded = $state(false);
</script>

<Toast />
<div class="flex min-h-screen">
  <Sidebar bind:expanded={sidebarExpanded} />
  <main class="flex-1 {sidebarExpanded ? 'ml-44' : 'ml-14'} transition-all duration-200">
    {@render children()}
  </main>
</div>
