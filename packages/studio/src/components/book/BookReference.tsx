'use client';

import { api } from '@/lib/api';

import { useState, useEffect } from 'react';

interface RefMeta {
  books: Array<{
    id: string;
    title: string;
    author: string;
    addedAt: string;
    styleExtracted: boolean;
    styleProfile?: any;
  }>;
  techniques: string[];
  customNotes: string;
}

export function BookReference({ bookId, book }: { bookId: string; book: any }) {
  const [meta, setMeta] = useState<RefMeta>({ books: [], techniques: [], customNotes: '' });
  const [loading, setLoading] = useState(true);
  const [showAddBook, setShowAddBook] = useState(false);
  const [newBook, setNewBook] = useState({ title: '', author: '' });
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    api.get(`/api/books/${bookId}/reference`).then(data => {
      setMeta(data.meta || { books: [], techniques: [], customNotes: '' });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [bookId]);

  const handleAddBook = async () => {
    if (!newBook.title) return;
    await api.post(`/api/books/${bookId}/reference`, { action: 'add_book', ...newBook });
    setMeta({ ...meta, books: [...meta.books, { id: crypto.randomUUID(), ...newBook, addedAt: new Date().toISOString(), styleExtracted: false }] });
    setShowAddBook(false);
    setNewBook({ title: '', author: '' });
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    const data = await api.post(`/api/books/${bookId}/reference`, { action: 'analyze_references' });
    setMeta(data.meta || meta);
    setAnalyzing(false);
  };

  const handleDeleteBook = async (bookId: string) => {
    await api.del(`/api/books/${bookId}/reference`, { bookId });
    setMeta({ ...meta, books: meta.books.filter(b => b.id !== bookId) });
  };

  if (loading) return <div className="text-muted text-sm">加载中...</div>;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg">参考小说</h3>
          <p className="text-xs text-muted mt-1">将参考小说的txt文件放入 <code className="font-mono bg-muted/20 px-1">~/.config/conovel/books/{bookId}/reference/</code> 目录，系统会自动分析其文风并调整设定。</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAnalyze} disabled={analyzing || meta.books.length === 0} className="btn-editorial text-xs">
            {analyzing ? '分析中...' : '分析文风'}
          </button>
          <button onClick={() => setShowAddBook(true)} className="btn-editorial-primary text-xs">添加参考</button>
        </div>
      </div>

      {/* Reference Books */}
      {meta.books.length === 0 ? (
        <div className="card-editorial text-center py-12">
          <p className="text-muted mb-3">暂无参考小说</p>
          <p className="text-xs text-muted">添加参考小说后，系统会分析其文风特征并融入写作设定</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meta.books.map((ref) => (
            <div key={ref.id} className="card-editorial">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-sans text-sm font-medium">{ref.title}</p>
                  <p className="text-xs text-muted mt-1">{ref.author} · 添加于 {ref.addedAt.split('T')[0]}</p>
                </div>
                <div className="flex items-center gap-3">
                  {ref.styleExtracted ? (
                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800">已分析</span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs bg-muted/20 text-muted">待分析</span>
                  )}
                  <button onClick={() => handleDeleteBook(ref.id)} className="text-xs text-muted hover:text-red-600">删除</button>
                </div>
              </div>
              {ref.styleProfile && (
                <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-4 text-xs">
                  <div><span className="text-muted">句长:</span> <span className="font-mono">{ref.styleProfile.avgSentenceLength}字</span></div>
                  <div><span className="text-muted">对话比:</span> <span className="font-mono">{(ref.styleProfile.dialogueRatio * 100).toFixed(0)}%</span></div>
                  <div><span className="text-muted">视角:</span> <span className="font-mono">{ref.styleProfile.narrativePerspective}</span></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Custom Notes */}
      <div className="card-editorial">
        <h4 className="font-serif text-sm mb-3">参考笔记</h4>
        <textarea
          value={meta.customNotes}
          onChange={(e) => setMeta({ ...meta, customNotes: e.target.value })}
          className="input-editorial"
          rows={4}
          placeholder="记录从参考小说中学到的写作技巧、要模仿的风格特点等..."
        />
        <button
          onClick={async () => {
            await api.post(`/api/books/${bookId}/reference`, { action: 'update_notes', notes: meta.customNotes });
          }}
          className="btn-editorial text-xs mt-3"
        >
          保存笔记
        </button>
      </div>

      {/* Add Book Modal */}
      {showAddBook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border w-96 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-lg">添加参考小说</h3>
              <button onClick={() => setShowAddBook(false)} className="text-muted hover:text-foreground">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label-editorial block mb-2">书名</label>
                <input type="text" value={newBook.title} onChange={e => setNewBook({ ...newBook, title: e.target.value })} className="input-editorial" placeholder="参考小说书名" />
              </div>
              <div>
                <label className="label-editorial block mb-2">作者</label>
                <input type="text" value={newBook.author} onChange={e => setNewBook({ ...newBook, author: e.target.value })} className="input-editorial" placeholder="作者名" />
              </div>
              <p className="text-xs text-muted">添加后，请将小说txt文件放入参考目录，然后点击"分析文风"。</p>
            </div>
            <div className="flex gap-4 mt-6 pt-4 border-t border-border">
              <button onClick={() => setShowAddBook(false)} className="btn-editorial flex-1">取消</button>
              <button onClick={handleAddBook} className="btn-editorial-primary flex-1" disabled={!newBook.title}>添加</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
