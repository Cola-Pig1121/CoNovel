<script>
  import { api } from '$lib/api';
  import { toasts } from '$lib/stores/toast';
  let { bookId, book } = $props();
  let type = $state('character');
  let gender = $state('');
  let count = $state(5);
  let names = $state([]);
  let loading = $state(false);

  async function generate() {
    loading = true;
    try {
      const data = await api.post('/api/naming', { type_name: type, genre: book?.genre || 'fantasy', gender: gender || undefined, count });
      names = data.names || [];
    } catch { toasts.add('生成失败', 'error'); }
    loading = false;
  }
</script>

<div class="space-y-4">
  <p class="text-[10px] uppercase tracking-widest text-muted">AI 取名</p>

  <div class="grid grid-cols-3 gap-3">
    <div>
      <label class="text-xs text-muted block mb-1">类型</label>
      <select bind:value={type} class="w-full border border-border px-2 py-1.5 text-xs bg-transparent focus:outline-none focus:border-foreground">
        <option value="character">角色</option><option value="place">地点</option><option value="item">物品</option><option value="faction">势力</option>
      </select>
    </div>
    <div>
      <label class="text-xs text-muted block mb-1">性别</label>
      <select bind:value={gender} class="w-full border border-border px-2 py-1.5 text-xs bg-transparent focus:outline-none focus:border-foreground">
        <option value="">不限</option><option value="male">男</option><option value="female">女</option>
      </select>
    </div>
    <div>
      <label class="text-xs text-muted block mb-1">数量</label>
      <input type="number" bind:value={count} min="1" max="20" class="w-full border border-border px-2 py-1.5 text-xs bg-transparent focus:outline-none focus:border-foreground" />
    </div>
  </div>

  <button onclick={generate} disabled={loading} class="bg-foreground text-background px-4 py-2 text-xs border border-foreground hover:bg-transparent hover:text-foreground transition-colors disabled:opacity-50">
    {loading ? '生成中...' : '生成名字'}
  </button>

  {#if names.length > 0}
    <div class="border border-border divide-y divide-border">
      {#each names as n}
        <div class="px-3 py-2">
          <span class="font-serif text-sm">{n.name}</span>
          {#if n.explanation}<p class="text-[10px] text-muted mt-0.5">{n.explanation}</p>{/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
