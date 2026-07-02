<script>
  import { api } from '$lib/api';
  import { toasts } from '$lib/stores/toast';
  let { bookId } = $props();
  let style = $state({ narrativeVoice: 'third', tone: '', bannedWords: '', bannedPatterns: '', customRules: '' });
  let loading = $state(true);

  async function load() {
    try { const data = await api.get(`/api/books/${bookId}/style`); style = data.style || style; } catch {}
    loading = false;
  }
  load();

  async function save() {
    try { await api.put(`/api/books/${bookId}/style`, { style }); toasts.add('风格已保存', 'success'); } catch { toasts.add('保存失败', 'error'); }
  }
</script>

{#if loading}
  <p class="text-xs text-muted">加载中...</p>
{:else}
  <div class="space-y-4">
    <div><label class="text-xs text-muted block mb-1">叙事视角</label>
      <select bind:value={style.narrativeVoice} class="w-full border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-foreground">
        <option value="first">第一人称</option><option value="third">第三人称</option><option value="omniscient">全知视角</option>
      </select>
    </div>
    <div><label class="text-xs text-muted block mb-1">整体基调</label><textarea bind:value={style.tone} class="w-full border border-border px-3 py-2 text-sm bg-transparent h-20 resize-none focus:outline-none focus:border-foreground" placeholder="如：冷峻幽默，偶尔煽情..."></textarea></div>
    <div><label class="text-xs text-muted block mb-1">禁用词汇（逗号分隔）</label><input type="text" bind:value={style.bannedWords} class="w-full border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-foreground" placeholder="值得一提的是, 不得不说..." /></div>
    <div><label class="text-xs text-muted block mb-1">禁用模式</label><textarea bind:value={style.bannedPatterns} class="w-full border border-border px-3 py-2 text-sm bg-transparent h-20 resize-none focus:outline-none focus:border-foreground" placeholder="如：排比句超过3组..."></textarea></div>
    <div><label class="text-xs text-muted block mb-1">自定义规则</label><textarea bind:value={style.customRules} class="w-full border border-border px-3 py-2 text-sm bg-transparent h-20 resize-none focus:outline-none focus:border-foreground" placeholder="其他写作规则..."></textarea></div>
    <button onclick={save} class="bg-foreground text-background px-4 py-2 text-xs border border-foreground hover:bg-transparent hover:text-foreground transition-colors">保存风格</button>
  </div>
{/if}
