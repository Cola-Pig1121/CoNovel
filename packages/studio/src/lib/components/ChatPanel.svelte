<script>
  import { callLLM } from '$lib/llm';
  import { getProviders } from '$lib/providers';
  import { toasts } from '$lib/stores/toast';

  let { bookId = '', book = null, selectedText = '' } = $props();

  let messages = $state([]);
  let input = $state('');
  let loading = $state(false);
  let messagesEl = $state(null);

  const QUICK_ACTIONS = [
    { label: '润色', prompt: '请润色以下文本，保持原意但提升文学表达质量：' },
    { label: '去AI味', prompt: '请检测并修复以下文本中的AI写作痕迹，直接输出修改后的文本：' },
    { label: '扩写', prompt: '请将以下段落扩展为更详细的描写，增加感官细节和情感层次：' },
    { label: '缩写', prompt: '请将以下文本精简压缩，保留核心情节和对话：' },
    { label: '检查连续性', prompt: '请检查以下文本与前后文的连贯性，指出任何矛盾或不一致之处：' },
    { label: '角色对话优化', prompt: '请优化以下文本中的对话，使其更符合角色性格，更有张力：' },
  ];

  async function send(text) {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;

    const context = selectedText ? `\n\n选中文本：\n${selectedText}` : '';
    const bookContext = book ? `\n\n书籍信息：${book.title}（${book.genre || ''}）` : '';

    messages = [...messages, { role: 'user', content: userMsg + context + bookContext }];
    input = '';
    loading = true;

    try {
      const providers = await getProviders();
      const provider = providers.find(p => p.enabled && p.models.length > 0);
      if (!provider) {
        messages = [...messages, { role: 'assistant', content: '请先在设置中配置 LLM 服务商。' }];
        loading = false;
        return;
      }

      const systemPrompt = `你是一位资深的中文网络小说编辑助手。你可以帮助用户：
- 润色和优化文本
- 检测和修复AI写作痕迹
- 扩写或缩写段落
- 检查角色对话的一致性
- 分析叙事节奏和张力
- 提供创作建议

当前书籍：${book?.title || '未知'}（${book?.genre || ''}）
请用简洁专业的中文回答。`;

      const result = await callLLM({
        provider,
        modelId: provider.models[0].id,
        system: systemPrompt,
        user: userMsg + context,
        temperature: 0.7,
        maxTokens: 4096,
      });

      messages = [...messages, { role: 'assistant', content: result.content }];
    } catch (e) {
      messages = [...messages, { role: 'assistant', content: `错误：${e instanceof Error ? e.message : '未知错误'}` }];
    }
    loading = false;

    // Scroll to bottom
    setTimeout(() => { if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight; }, 50);
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }
</script>

<div class="flex flex-col h-full">
  <!-- Quick Actions -->
  <div class="flex flex-wrap gap-1 px-3 py-2 border-b border-border">
    {#each QUICK_ACTIONS as action}
      <button onclick={() => send(action.prompt)} disabled={loading} class="px-2 py-1 text-[10px] border border-border hover:border-foreground transition-colors disabled:opacity-40">{action.label}</button>
    {/each}
  </div>

  <!-- Messages -->
  <div bind:this={messagesEl} class="flex-1 overflow-y-auto p-3 space-y-3">
    {#if messages.length === 0}
      <div class="text-center py-8">
        <p class="text-xs text-muted">选择文本后点击上方按钮，或直接输入问题</p>
      </div>
    {/if}
    {#each messages as msg}
      <div class="text-xs leading-relaxed {msg.role === 'user' ? 'text-foreground' : 'text-muted'}">
        <p class="text-[10px] uppercase tracking-widest text-muted/50 mb-1">{msg.role === 'user' ? '你' : 'AI'}</p>
        <p class="whitespace-pre-wrap">{msg.content}</p>
      </div>
    {/each}
    {#if loading}
      <div class="text-xs text-muted animate-pulse">思考中...</div>
    {/if}
  </div>

  <!-- Input -->
  <div class="border-t border-border p-3">
    <div class="flex gap-2">
      <input
        type="text"
        bind:value={input}
        onkeydown={handleKeydown}
        placeholder="输入消息... (Enter 发送)"
        class="flex-1 border border-border px-3 py-2 text-xs bg-transparent focus:outline-none focus:border-foreground"
        disabled={loading}
      />
      <button onclick={() => send()} disabled={loading || !input.trim()} class="bg-foreground text-background px-3 py-2 text-xs border border-foreground hover:bg-transparent hover:text-foreground transition-colors disabled:opacity-40">
        发送
      </button>
    </div>
  </div>
</div>
