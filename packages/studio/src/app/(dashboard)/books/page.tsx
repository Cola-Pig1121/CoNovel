'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Book {
  id: string;
  title: string;
  genre: string;
  targetWordCount: number;
  currentWordCount: number;
  currentChapter: number;
  totalChapters: number;
  status: string;
  createdAt: string;
}

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBook, setNewBook] = useState({ title: '', genre: 'xianxia', targetWordCount: 1000000 });

  const genreLabels: Record<string, string> = { xianxia: '仙侠', xuanhuan: '玄幻', urban: '都市', scifi: '科幻', mystery: '悬疑', historical: '历史', infinite: '无限流', custom: '自定义' };
  const statusLabels: Record<string, string> = { planning: '策划中', writing: '写作中', reviewing: '审阅中', completed: '已完成', paused: '已暂停' };

  useEffect(() => {
    fetch('/api/books').then(r => r.json()).then(data => {
      setBooks(data.books || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleCreateBook = async () => {
    if (!newBook.title) return;
    const res = await fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBook),
    });
    if (res.ok) {
      const book = await res.json();
      setBooks([...books, book]);
      setShowCreateModal(false);
      setNewBook({ title: '', genre: 'xianxia', targetWordCount: 1000000 });
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!confirm('确定删除此项目？')) return;
    await fetch(`/api/books/${id}`, { method: 'DELETE' });
    setBooks(books.filter(b => b.id !== id));
  };

  if (loading) return <div className="p-12 text-muted">加载中...</div>;

  return (
    <div>
      <header className="flex items-center justify-between mb-8 px-12 pt-6">
        <div>
          <h2 className="font-serif text-2xl tracking-tight">小说管理</h2>
          <p className="text-muted text-sm mt-1">管理您的小说项目</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-editorial-primary">新建项目</button>
      </header>

      <div className="px-12 pb-12">
        {books.length === 0 ? (
          <div className="card-editorial text-center py-16">
            <p className="text-muted mb-4">还没有小说项目</p>
            <button onClick={() => setShowCreateModal(true)} className="btn-editorial-primary">创建第一个项目</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book) => (
              <div key={book.id} className="card-editorial">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Link href={`/books/${book.id}`} className="font-serif text-lg hover:underline">{book.title}</Link>
                    <p className="text-muted text-sm mt-1">{genreLabels[book.genre] || book.genre}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs ${book.status === 'writing' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {statusLabels[book.status] || book.status}
                  </span>
                </div>
                <div className="space-y-3 mb-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted">进度</span>
                      <span className="font-mono">{book.targetWordCount > 0 ? Math.round((book.currentWordCount / book.targetWordCount) * 100) : 0}%</span>
                    </div>
                    <div className="w-full h-1 bg-border"><div className="h-1 bg-foreground" style={{ width: `${book.targetWordCount > 0 ? (book.currentWordCount / book.targetWordCount) * 100 : 0}%` }} /></div>
                  </div>
                  <div className="flex items-center justify-between text-sm"><span className="text-muted">章节</span><span className="font-mono">{book.totalChapters || 0} 章</span></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-muted">字数</span><span className="font-mono">{(book.currentWordCount || 0).toLocaleString()} 字</span></div>
                </div>
                <div className="flex gap-2 pt-4 border-t border-border">
                  <Link href={`/books/${book.id}`} className="btn-editorial text-xs flex-1 text-center">进入项目</Link>
                  <button onClick={() => handleDeleteBook(book.id)} className="btn-editorial text-xs text-red-600 hover:text-red-700">删除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border w-96 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-lg">新建项目</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-muted hover:text-foreground">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label-editorial block mb-2">书名</label>
                <input type="text" value={newBook.title} onChange={(e) => setNewBook({ ...newBook, title: e.target.value })} className="input-editorial" placeholder="输入书名" autoFocus />
              </div>
              <div>
                <label className="label-editorial block mb-2">题材</label>
                <select value={newBook.genre} onChange={(e) => setNewBook({ ...newBook, genre: e.target.value })} className="input-editorial">
                  {Object.entries(genreLabels).filter(([k]) => k !== 'custom').map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                </select>
              </div>
              <div>
                <label className="label-editorial block mb-2">目标字数</label>
                <input type="number" value={newBook.targetWordCount} onChange={(e) => setNewBook({ ...newBook, targetWordCount: Number(e.target.value) })} className="input-editorial" min="100000" step="100000" />
              </div>
            </div>
            <div className="flex gap-4 mt-6 pt-4 border-t border-border">
              <button onClick={() => setShowCreateModal(false)} className="btn-editorial flex-1">取消</button>
              <button onClick={handleCreateBook} className="btn-editorial-primary flex-1" disabled={!newBook.title}>创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
