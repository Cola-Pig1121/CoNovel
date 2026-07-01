'use client';

import { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { BookOutline } from '@/components/book/BookOutline';
import { BookCharacters } from '@/components/book/BookCharacters';
import { BookForeshadowing } from '@/components/book/BookForeshadowing';
import { BookTimeline } from '@/components/book/BookTimeline';
import { BookStyle } from '@/components/book/BookStyle';
import { BookConstraints } from '@/components/book/BookConstraints';
import { BookMemory } from '@/components/book/BookMemory';

const TOOLS = [
  { id: 'outline', label: '大纲' },
  { id: 'characters', label: '角色' },
  { id: 'foreshadowing', label: '伏笔' },
  { id: 'timeline', label: '时间线' },
  { id: 'style', label: '风格' },
  { id: 'constraints', label: '约束' },
  { id: 'memory', label: '记忆' },
  { id: 'ai', label: 'AI 助手' },
] as const;

type ToolId = (typeof TOOLS)[number]['id'];

function EditorInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const bookId = searchParams.get('bookId') || '';
  const num = parseInt(searchParams.get('num') || '1', 10);

  const [chapter, setChapter] = useState<any>(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [book, setBook] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [activeTool, setActiveTool] = useState<ToolId>('outline');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dirtyRef = useRef(false);

  // Load data
  const loadChapter = useCallback(async (chapterNum: number) => {
    setLoading(true);
    try {
      const [ch, b, chs] = await Promise.all([
        api.get<any>(`/api/books/${bookId}/chapters/${chapterNum}`).catch(() => null),
        api.get<any>(`/api/books/${bookId}`),
        api.get<any>(`/api/books/${bookId}/chapters`),
      ]);
      setBook(b);
      setChapters(chs.chapters || []);
      if (ch) {
        setChapter(ch);
        setContent(ch.content || '');
      } else {
        setChapter(null);
        setContent('');
      }
    } catch {
      toast('加载失败', 'error');
      setBook(null);
    }
    setLoading(false);
  }, [bookId, toast]);

  useEffect(() => {
    if (!bookId) return;
    loadChapter(num);
  }, [bookId, num, loadChapter]);

  // Auto-create first chapter for 0-chapter books
  const handleCreateFirstChapter = async () => {
    try {
      await api.post(`/api/books/${bookId}/chapters`, {
        chapterNumber: 1,
        title: '第1章',
        content: '',
        outline: '',
      });
      toast('第一章已创建', 'success');
      router.push(`/editor?bookId=${bookId}&num=1`);
    } catch (e) {
      toast('创建失败', 'error');
    }
  };

  // Create new chapter
  const handleNewChapter = async () => {
    const nextNum = (chapters.length > 0 ? Math.max(...chapters.map((c: any) => c.chapter_number || c.num || 0)) : 0) + 1;
    try {
      await api.post(`/api/books/${bookId}/chapters`, {
        chapterNumber: nextNum,
        title: `第${nextNum}章`,
        content: '',
        outline: '',
      });
      toast(`第${nextNum}章已创建`, 'success');
      router.push(`/editor?bookId=${bookId}&num=${nextNum}`);
    } catch (e) {
      toast('创建失败', 'error');
    }
  };

  // Word count
  const wordCount = (content.match(/[\u4e00-\u9fff]/g) || []).length +
    (content.match(/[a-zA-Z]+/g) || []).length;

  // Save with error handling
  const handleSave = useCallback(async () => {
    if (!chapter || !content) return;
    setSaving(true);
    try {
      await api.put(`/api/books/${bookId}/chapters/${num}`, { content });
      setSaved(true);
      setLastSaved(new Date());
      dirtyRef.current = false;
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      toast('保存失败', 'error');
    }
    setSaving(false);
  }, [chapter, content, bookId, num, toast]);

  // Ctrl+S keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Debounced auto-save (2 seconds after last keystroke)
  useEffect(() => {
    if (!content || !bookId || !chapter) return;
    dirtyRef.current = true;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (dirtyRef.current) {
        api.put(`/api/books/${bookId}/chapters/${num}`, { content })
          .then(() => { setLastSaved(new Date()); dirtyRef.current = false; })
          .catch(() => toast('自动保存失败', 'error'));
      }
    }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [content, bookId, num, chapter, toast]);

  // AI assistant handlers
  const handleAIAction = async (action: string) => {
    const textarea = textareaRef.current;
    const selected = textarea ? textarea.value.substring(textarea.selectionStart, textarea.selectionEnd) : '';
    if (!selected.trim()) {
      toast('请先选中文本', 'info');
      return;
    }
    toast(`${action}处理中...`, 'info');
    try {
      const { callLLM } = await import('@/lib/llm');
      const { getProviders } = await import('@/lib/providers');
      const providers = await getProviders();
      const provider = providers.find(p => p.enabled && p.models.length > 0);
      if (!provider) { toast('请先在设置中配置 LLM 服务商', 'error'); return; }

      const prompts: Record<string, string> = {
        '润色': '请润色以下文本，保持原意但提升文学表达质量：',
        '去AI味': '请检测并修复以下文本中的AI写作痕迹（如"值得一提的是"、"不得不说"等），直接输出修改后的文本：',
        '扩写': '请将以下段落扩展为更详细的描写，增加感官细节和情感层次：',
        '缩写': '请将以下文本精简压缩，保留核心情节和对话，删除冗余描写：',
      };

      const result = await callLLM({
        provider,
        modelId: provider.models[0].id,
        system: '你是一位资深的中文网络小说编辑。',
        user: `${prompts[action] || ''}\n\n${selected}`,
        temperature: 0.5,
        maxTokens: 4096,
      });

      // Replace selected text with result
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newContent = content.substring(0, start) + result.content + content.substring(end);
        setContent(newContent);
        toast(`${action}完成`, 'success');
      }
    } catch (e) {
      toast(`${action}失败: ${e instanceof Error ? e.message : '未知错误'}`, 'error');
    }
  };

  // Loading state
  if (!bookId) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-sm text-muted mb-4">缺少项目 ID</p>
        <Link href="/" className="btn-editorial text-xs">返回项目中心</Link>
      </div>
    </div>
  );

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-sm text-muted">加载中...</p></div>;

  // 0 chapters
  if (chapters.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h2 className="font-serif text-xl mb-2">{book?.title || '未命名项目'}</h2>
          <p className="text-sm text-muted mb-6">这是一个新项目，还没有任何章节。</p>
          <button onClick={handleCreateFirstChapter} className="btn-editorial-primary text-sm px-6 py-2.5">
            开始创作第一章
          </button>
          <p className="text-xs text-muted mt-4">
            或者先去 <Link href={`/book?id=${bookId}`} className="underline hover:text-foreground">项目设置</Link> 配置角色、大纲和风格
          </p>
        </div>
      </div>
    );
  }

  if (!chapter && chapters.length > 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-sm text-muted mb-4">第 {num} 章不存在</p>
          <Link href={`/editor?bookId=${bookId}&num=1`} className="btn-editorial text-xs">回到第 1 章</Link>
        </div>
      </div>
    );
  }

  const targetWords = chapter?.wordTarget || 3000;
  const wordProgress = targetWords > 0 ? Math.min(100, Math.round((wordCount / targetWords) * 100)) : 0;

  const renderRightPanel = () => {
    switch (activeTool) {
      case 'outline': return book ? <div className="p-4"><BookOutline bookId={bookId} book={book} /></div> : null;
      case 'characters': return book ? <div className="p-4"><BookCharacters bookId={bookId} book={book} /></div> : null;
      case 'foreshadowing': return book ? <div className="p-4"><BookForeshadowing bookId={bookId} book={book} /></div> : null;
      case 'timeline': return book ? <div className="p-4"><BookTimeline bookId={bookId} book={book} /></div> : null;
      case 'style': return book ? <div className="p-4"><BookStyle bookId={bookId} /></div> : null;
      case 'constraints': return <div className="p-4"><BookConstraints bookId={bookId} /></div>;
      case 'memory': return <div className="p-4"><BookMemory bookId={bookId} /></div>;
      case 'ai': return (
        <div className="p-4">
          <p className="label-editorial text-muted mb-3">AI 助手</p>
          <p className="text-xs text-muted mb-4">在编辑器中选中文本，然后点击按钮：</p>
          <div className="space-y-2">
            <button onClick={() => handleAIAction('润色')} className="btn-editorial text-xs w-full">润色选中文本</button>
            <button onClick={() => handleAIAction('去AI味')} className="btn-editorial text-xs w-full">去AI味检测</button>
            <button onClick={() => handleAIAction('扩写')} className="btn-editorial text-xs w-full">扩写</button>
            <button onClick={() => handleAIAction('缩写')} className="btn-editorial text-xs w-full">缩写</button>
          </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="text-muted hover:text-foreground text-xs transition-colors flex-shrink-0">项目中心</Link>
          <span className="text-muted/30">/</span>
          <span className="text-sm font-serif truncate">{book?.title || '未命名'}</span>
          <span className="text-muted/30">·</span>
          <span className="text-xs text-muted flex-shrink-0">第{num}章 {chapter?.title || ''}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-border/30 rounded-full overflow-hidden">
              <div className="h-full bg-foreground/40 transition-all" style={{ width: `${wordProgress}%` }} />
            </div>
            <span className="font-mono text-[11px] text-muted">{wordCount.toLocaleString()}/{targetWords.toLocaleString()}</span>
          </div>
          {lastSaved && (
            <span className="text-[10px] text-muted/50">
              {lastSaved.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 已保存
            </span>
          )}
          <button onClick={handleSave} disabled={saving || !chapter} className={`btn-editorial-primary text-xs ${saving ? 'opacity-50' : ''}`}>
            {saving ? '...' : saved ? '✓' : '保存'}
          </button>
          <Link href={`/book?id=${bookId}`} className="btn-editorial text-xs">设置</Link>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <aside className="w-60 border-r border-border flex flex-col flex-shrink-0 overflow-hidden">
          <div className="py-2 border-b border-border">
            <p className="px-3 py-1 text-[10px] text-muted/50 uppercase tracking-widest">工具</p>
            {TOOLS.map(tool => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                  activeTool === tool.id ? 'bg-foreground/10 text-foreground' : 'text-muted hover:text-foreground hover:bg-foreground/5'
                }`}
              >
                {tool.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            <div className="flex items-center justify-between px-3 mb-1">
              <p className="text-[10px] text-muted/50 uppercase tracking-widest">章节</p>
              <button onClick={handleNewChapter} className="text-[10px] text-muted hover:text-foreground transition-colors px-1" title="新建章节">+</button>
            </div>
            {chapters.map((ch: any) => {
              const chNum = ch.chapter_number || ch.num;
              const isActive = chNum === num;
              return (
                <Link
                  key={chNum}
                  href={`/editor?bookId=${bookId}&num=${chNum}`}
                  className={`block px-3 py-1.5 text-xs transition-colors ${
                    isActive ? 'bg-foreground/10 text-foreground font-medium' : 'text-muted hover:text-foreground hover:bg-foreground/5'
                  }`}
                >
                  <span className="text-muted/40 mr-1.5">{chNum}</span>
                  {ch.title || `第${chNum}章`}
                </Link>
              );
            })}
          </div>
        </aside>

        {/* Center: Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {chapter ? (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              className="flex-1 w-full p-8 font-sans text-base leading-loose resize-none focus:outline-none bg-background text-foreground"
              placeholder="在此输入章节内容... (Ctrl+S 保存)"
              spellCheck={true}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted text-sm">选择一个章节开始编辑</p>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <aside className="w-72 border-l border-border flex-shrink-0 overflow-y-auto">
          <div className="flex border-b border-border overflow-x-auto">
            {TOOLS.map(tool => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`px-3 py-2 text-[11px] whitespace-nowrap transition-colors flex-shrink-0 ${
                  activeTool === tool.id ? 'border-b-2 border-foreground text-foreground' : 'text-muted hover:text-foreground'
                }`}
              >
                {tool.label}
              </button>
            ))}
          </div>
          {renderRightPanel()}
        </aside>
      </div>

      {/* Status Bar */}
      <footer className="border-t border-border px-4 py-1.5 flex items-center justify-between text-[11px] text-muted flex-shrink-0">
        <span>第{num}章 · {wordCount.toLocaleString()} 字 · Ctrl+S 保存</span>
        <span>CoNovel v0.1.0</span>
      </footer>
    </div>
  );
}

export default function EditorPage() {
  return <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-sm text-muted">加载中...</p></div>}><EditorInner /></Suspense>;
}
