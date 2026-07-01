'use client';

import { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';
import { BookOutline } from '@/components/book/BookOutline';
import { BookCharacters } from '@/components/book/BookCharacters';
import { BookForeshadowing } from '@/components/book/BookForeshadowing';
import { BookTimeline } from '@/components/book/BookTimeline';
import { BookStyle } from '@/components/book/BookStyle';
import { BookConstraints } from '@/components/book/BookConstraints';
import { BookMemory } from '@/components/book/BookMemory';

// Left panel tool definitions
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
  const bookId = searchParams.get('bookId') || '';
  const num = parseInt(searchParams.get('num') || '1', 10);

  // State
  const [chapter, setChapter] = useState<any>(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [book, setBook] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [activeTool, setActiveTool] = useState<ToolId>('outline');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      setBook(null);
    }
    setLoading(false);
  }, [bookId]);

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
      router.push(`/editor?bookId=${bookId}&num=1`);
    } catch (e) {
      console.error('Failed to create chapter', e);
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
      router.push(`/editor?bookId=${bookId}&num=${nextNum}`);
    } catch (e) {
      console.error('Failed to create chapter', e);
    }
  };

  // Word count
  const wordCount = (content.match(/[\u4e00-\u9fff]/g) || []).length +
    (content.match(/[a-zA-Z]+/g) || []).length;

  // Save
  const handleSave = async () => {
    if (!chapter) return;
    setSaving(true);
    try {
      await api.put(`/api/books/${bookId}/chapters/${num}`, { content });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Save failed', e);
    }
    setSaving(false);
  };

  // Auto-save
  useEffect(() => {
    if (!content || !bookId || !chapter) return;
    const t = setInterval(() => {
      api.put(`/api/books/${bookId}/chapters/${num}`, { content }).catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, [content, bookId, num, chapter]);

  // Loading state
  if (!bookId) return <div className="p-12 text-muted">缺少项目 ID</div>;
  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-sm text-muted">加载中...</p></div>;

  // 0 chapters — show welcome
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

  // Chapter not found
  if (!chapter && chapters.length > 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-sm text-muted mb-4">第 {num} 章不存在</p>
          <Link href={`/editor?bookId=${bookId}&num=1`} className="btn-editorial text-sm">回到第 1 章</Link>
        </div>
      </div>
    );
  }

  const targetWords = chapter?.wordTarget || 3000;

  // Render right panel content based on active tool
  const renderRightPanel = () => {
    switch (activeTool) {
      case 'outline':
        return book ? <div className="p-4"><BookOutline bookId={bookId} book={book} /></div> : null;
      case 'characters':
        return book ? <div className="p-4"><BookCharacters bookId={bookId} book={book} /></div> : null;
      case 'foreshadowing':
        return book ? <div className="p-4"><BookForeshadowing bookId={bookId} book={book} /></div> : null;
      case 'timeline':
        return book ? <div className="p-4"><BookTimeline bookId={bookId} book={book} /></div> : null;
      case 'style':
        return book ? <div className="p-4"><BookStyle bookId={bookId} /></div> : null;
      case 'constraints':
        return <div className="p-4"><BookConstraints bookId={bookId} /></div>;
      case 'memory':
        return <div className="p-4"><BookMemory bookId={bookId} /></div>;
      case 'ai':
        return (
          <div className="p-4">
            <p className="label-editorial text-muted mb-3">AI 助手</p>
            <p className="text-xs text-muted mb-4">选中文本后点击按钮触发 AI 操作：</p>
            <div className="space-y-2">
              <button className="btn-editorial text-xs w-full">润色选中文本</button>
              <button className="btn-editorial text-xs w-full">去AI味检测</button>
              <button className="btn-editorial text-xs w-full">扩写</button>
              <button className="btn-editorial text-xs w-full">缩写</button>
            </div>
            <div className="mt-4 p-3 border border-border">
              <p className="label-editorial text-muted text-[10px]">去AI味评分</p>
              <p className="font-mono text-lg mt-1">—</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-muted hover:text-foreground text-xs transition-colors">项目中心</Link>
          <span className="text-muted/30">/</span>
          <span className="text-sm font-serif">{book?.title || '未命名'}</span>
          <span className="text-muted/30">·</span>
          <span className="text-xs text-muted">第{num}章 {chapter?.title || ''}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted">{wordCount.toLocaleString()} / {targetWords.toLocaleString()}</span>
          <button onClick={handleSave} disabled={saving || !chapter} className={`btn-editorial-primary text-xs ${saving ? 'opacity-50' : ''}`}>
            {saving ? '...' : saved ? '✓ 已保存' : '保存'}
          </button>
          <Link href={`/book?id=${bookId}`} className="btn-editorial text-xs">项目设置</Link>
        </div>
      </header>

      {/* Main: Left Panel + Editor + Right Panel */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left Panel */}
        <aside className="w-60 border-r border-border flex flex-col flex-shrink-0 overflow-hidden">
          {/* Tool Navigation */}
          <div className="py-2 border-b border-border">
            <p className="px-3 py-1 text-[10px] text-muted/50 uppercase tracking-widest">项目工具</p>
            {TOOLS.map(tool => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                  activeTool === tool.id
                    ? 'bg-foreground/10 text-foreground'
                    : 'text-muted hover:text-foreground hover:bg-foreground/5'
                }`}
              >
                {tool.label}
              </button>
            ))}
          </div>

          {/* Chapter List */}
          <div className="flex-1 overflow-y-auto py-2">
            <div className="flex items-center justify-between px-3 mb-1">
              <p className="text-[10px] text-muted/50 uppercase tracking-widest">章节</p>
              <button
                onClick={handleNewChapter}
                className="text-[10px] text-muted hover:text-foreground transition-colors"
                title="新建章节"
              >
                +
              </button>
            </div>
            {chapters.map((ch: any) => {
              const chNum = ch.chapter_number || ch.num;
              const isActive = chNum === num;
              return (
                <Link
                  key={chNum}
                  href={`/editor?bookId=${bookId}&num=${chNum}`}
                  className={`block px-3 py-1.5 text-xs transition-colors ${
                    isActive
                      ? 'bg-foreground/10 text-foreground font-medium'
                      : 'text-muted hover:text-foreground hover:bg-foreground/5'
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
              placeholder="在此输入章节内容..."
              spellCheck={false}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted text-sm">选择一个章节开始编辑</p>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <aside className="w-72 border-l border-border flex-shrink-0 overflow-y-auto">
          {/* Tool tabs at top */}
          <div className="flex border-b border-border overflow-x-auto">
            {TOOLS.slice(0, 4).map(tool => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`px-3 py-2 text-[11px] whitespace-nowrap transition-colors flex-shrink-0 ${
                  activeTool === tool.id
                    ? 'border-b-2 border-foreground text-foreground'
                    : 'text-muted hover:text-foreground'
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
        <span>第{num}章 · {wordCount.toLocaleString()} 字</span>
        <span>CoNovel v0.1.0</span>
      </footer>
    </div>
  );
}

export default function EditorPage() {
  return <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-sm text-muted">加载中...</p></div>}><EditorInner /></Suspense>;
}
