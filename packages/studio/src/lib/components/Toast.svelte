<script>
  import { toasts } from '$lib/stores/toast';
</script>

<div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-2 pointer-events-none">
  {#each $toasts as t (t.id)}
    <div
      class="px-4 py-2 text-sm border shadow-sm pointer-events-auto transition-all {t.type === 'error'
        ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200'
        : t.type === 'success'
          ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200'
          : 'bg-background border-border text-foreground'}"
    >
      {t.message}
    </div>
  {/each}
</div>
