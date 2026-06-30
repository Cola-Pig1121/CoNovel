'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';

function EditorInner() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get('bookId') || '';
  const num = parseInt(searchParams.get('num') || '1', 10);

  const [chapter, setChapter] = useState<any>(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiPanel, setAiPanel] = useState<'outline' | 'characters' | 'ai' | 'settings'>('outline');
  const [book, setBook] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!bookId) return;
    Promise.all([
      api.get<any>(`/api/books/${bookId}/chapters/${num}`),
      api.get<any>(`/api/books/${bookId}`),
      api.get<any>(`/api/books/${bookId}/chapters`),
    ]).then(([ch, b, chs]) => {
      setChapter(ch);
      setContent(ch.content || '');
      setBook(b);
      setChapters(chs.chapters || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [bookId, num]);

  const wordCount = (content.match(/[\u4e00-\u9fff]/g) || []).length + (content.match(/[a-zA-Z]+/g) || []).length;

  const handleSave = async () => {
    setSaving(true);
    await api.put(`/api/books/${bookId}/chapters/${num}`, { content });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  useEffect(() => {
    if (!content || !bookId) return;
    const t = setInterval(() => {
      api.put(`/api/books/${bookId}/chapters/${num}`, { content }).catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, [content, bookId, num]);

  if (loading) return <div className="p-12 text-muted">加载中...</div>;
  if (!chapter) return <div className="p-12 text-muted">章节不存在</div>;

  const targetWords = chapter.wordTarget || 3000;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b border-border px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href={`/book?id=${bookId}`} className="text-muted hover:text-foreground text-xs">← {book?.title || '返回'}</Link>
          <span className="text-muted">·</span>
          <span className="text-sm">第{num}章 {chapter.title || ''}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-muted">{wordCount.toLocaleString()} / {targetWords.toLocaleString()} 字</span>
          <button onClick={handleSave} disabled={saving} className={`btn-editorial-primary text-xs ${saving ? 'opacity-50' : ''}`}>
            {saving ? '...' : saved ? '✓' : '保存'}
          </button>
        </div>
      </header>

      {/* Main: Editor + AI Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className="flex-1 flex flex-col">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            className="flex-1 w-full p-8 font-sans text-base leading-loose resize-none focus:outline-none bg-background text-foreground"
            placeholder="在此输入章节内容..."
            spellCheck={false}
          />
        </div>

        {/* Right AI Panel */}
        <div className="w-72 border-l border-border flex flex-col flex-shrink-0">
          {/* Panel Tabs */}
          <div className="flex border-b border-border">
            {(['outline', 'characters', 'ai', 'settings'] as const).map(tab => (
              <button key={tab} onClick={() => setAiPanel(tab)} className={`flex-1 px-3 py-2 text-xs transition-colors ${aiPanel === tab ? 'border-b-2 border-foreground' : 'text-muted hover:text-foreground'}`}>
                {{ outline: '大纲', characters: '角色', ai: 'AI 助手', settings: '设置' }[tab]}
              </button>
            ))}
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {aiPanel === 'outline' && (
              <div>
                <p className="label-editorial text-muted mb-3">章节大纲</p>
                <p className="text-sm text-muted leading-relaxed">{chapter.outline || '暂无大纲'}</p>
              </div>
            )}
            {aiPanel === 'characters' && (
              <div>
                <p className="label-editorial text-muted mb-3">出场角色</p>
                {book?.characters?.length > 0 ? book.characters.map((c: any) => (
                  <div key={c.id} className="py-2 border-b border-border last:border-0">
                    <p className="text-sm">{c.name}</p>
                    <p className="text-xs text-muted">{c.personality?.join('、')}</p>
                  </div>
                )) : <p className="text-xs text-muted">暂无角色</p>}
              </div>
            )}
            {aiPanel === 'ai' && (
              <div>
                <p className="label-editorial text-muted mb-3">AI 助手</p>
                <p className="text-xs text-muted leading-relaxed">选中编辑器中的文本，然后点击下方按钮触发 AI 操作：</p>
                <div className="space-y-2 mt-4">
                  <button className="btn-editorial text-xs w-full">润色选中文本</button>
                  <button className="btn-editorial text-xs w-full">去AI味检测</button>
                  <button className="btn-editorial text-xs w-full">扩写</button>
                  <button className="btn-editorial text-xs w-full">缩写</button>
                </div>
                <div className="mt-4 p-3 border border-border">
                  <p className="label-editorial text-muted text-[10px]">去AI味评分</p>
                  <p className="font-mono text-lg mt-1">—</p>
                  <p className="text-[10px] text-muted">保存后自动检测</p>
                </div>
              </div>
            )}
            {aiPanel === 'settings' && (
              <div>
                <p className="label-editorial text-muted mb-3">章节信息</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-muted">字数</span><span className="font-mono">{wordCount.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted">目标</span><span className="font-mono">{targetWords.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted">状态</span><span>{chapter.status || 'draft'}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <footer className="border-t border-border px-4 py-1.5 flex items-center justify-between text-xs text-muted flex-shrink-0">
        <span>第{num}章 · {wordCount.toLocaleString()} 字</span>
        <span>CoNovel v0.1.0</span>
      </footer>
    </div>
  );
}

export default function EditorPage() {
  return <Suspense fallback={<div className="p-12 text-muted">加载中...</div>}><EditorInner /></Suspense>;
}
