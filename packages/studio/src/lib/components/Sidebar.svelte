<script>
  import { page } from '$app/state';

  let { expanded = $bindable(false) } = $props();

  const navItems = [
    { href: '/', label: '项目中心', icon: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z' },
    { href: '/books', label: '小说管理', icon: 'M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z m15 0-4 4' },
    { href: '/agents', label: 'Agent', icon: 'M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0 M4 8m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0 M20 8m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0 M4 16m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0 M20 16m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0' },
    { href: '/store', label: '商店', icon: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z' },
    { href: '/settings', label: '设置', icon: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 8m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0' },
  ];
</script>

<aside class="fixed left-0 top-0 bottom-0 {expanded ? 'w-44' : 'w-14'} border-r border-border bg-background flex flex-col z-50 transition-all duration-200">
  <div class="flex items-center justify-between px-3 py-4 border-b border-border min-h-[56px]">
    {#if expanded}
      <span class="font-serif text-base tracking-tight truncate">CoNovel</span>
    {:else}
      <span class="font-serif text-base mx-auto">C</span>
    {/if}
    <button onclick={() => expanded = !expanded} class="text-muted hover:text-foreground transition-colors p-1 -mr-1" title={expanded ? '收起' : '展开'}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        {#if expanded}
          <path d="m15 18-6-6 6-6" />
        {:else}
          <path d="m9 18 6-6-6-6" />
        {/if}
      </svg>
    </button>
  </div>

  <nav class="flex-1 px-2 py-3 space-y-1">
    {#each navItems as item}
      {@const isActive = page.url.pathname === item.href}
      <a
        href={item.href}
        class="flex items-center gap-3 px-3 py-2.5 text-sm transition-colors rounded-sm {isActive ? 'bg-foreground/10 text-foreground' : 'text-muted hover:text-foreground hover:bg-foreground/5'}"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="flex-shrink-0">
          <path d={item.icon} />
        </svg>
        {#if expanded}
          <span class="text-xs whitespace-nowrap">{item.label}</span>
        {/if}
      </a>
    {/each}
  </nav>

  <div class="px-3 py-3 border-t border-border">
    {#if expanded}
      <p class="text-[10px] text-muted/40 text-center">v0.2.0</p>
    {/if}
  </div>
</aside>
