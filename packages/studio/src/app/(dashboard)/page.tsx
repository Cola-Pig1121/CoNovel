'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Book {
  id: string;
  title: string;
  genre: string;
  genres: string[];
  currentWordCount: number;
  totalChapters: number;
  currentChapter: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

export default function Home() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentStatus, setAgentStatus] = useState<'ok' | 'error' | 'loading'>('loading');

  useEffect(() => {
    Promise.all([
      api.get<{ books: Book[] }>('/api/books'),
      api.get<any>('/api/config?type=agents'),
    ]).then(([booksData, agentsData]) => {
      setBooks(booksData.books || []);
      setAgentStatus(agentsData.agents?.length > 0 ? 'ok' : 'error');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleNewProject = async () => {
    try {
      const data = await api.post<any>('/api/books', { title: '未命名项目', genre: 'fantasy' });
      router.push(`/book?id=${data.id}`);
    } catch {
      // fallback
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-border px-12 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl tracking-tight">CoNovel</h1>
            <p className="text-muted text-sm mt-1">项目中心</p>
          </div>
          <button onClick={handleNewProject} className="btn-editorial-primary">
            新建项目
          </button>
        </div>
      </header>

      {/* Bookshelf */}
      <div className="flex-1 p-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="card-editorial animate-pulse p-6">
                <div className="h-4 bg-muted/20 rounded w-32 mb-4" />
                <div className="h-3 bg-muted/20 rounded w-20 mb-6" />
                <div className="h-3 bg-muted/20 rounded w-40" />
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-24">
            <p className="font-serif text-xl text-muted mb-2">还没有项目</p>
            <p className="text-sm text-muted mb-8">创建你的第一本小说，开始写作之旅</p>
            <button onClick={handleNewProject} className="btn-editorial-primary">
              新建项目
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {books.map(book => (
              <Link
                key={book.id}
                href={`/editor?bookId=${book.id}&num=${book.currentChapter || 1}`}
                className="card-editorial p-6 block group"
              >
                <h2 className="font-serif text-xl tracking-tight mb-1 group-hover:underline">
                  {book.title}
                </h2>
                <p className="label-editorial text-muted mb-4">
                  {book.genre || '未分类'}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span>第 {book.currentChapter || 0} 章</span>
                  <span>{(book.currentWordCount || 0).toLocaleString()} 字</span>
                </div>
                <p className="text-xs text-muted/60 mt-2">
                  {book.updatedAt
                    ? new Date(book.updatedAt).toLocaleDateString('zh-CN')
                    : new Date(book.createdAt).toLocaleDateString('zh-CN')}
                </p>
              </Link>
            ))}

            {/* New Project Card */}
            <button
              onClick={handleNewProject}
              className="card-editorial border-dashed p-6 flex items-center justify-center min-h-[160px] text-muted hover:text-foreground transition-colors"
            >
              <span className="text-sm tracking-wide">+ 新建项目</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Agent Status Bar */}
      <div className="border-t border-border px-12 py-3 flex items-center gap-3">
        <span className={`w-2 h-2 rounded-full ${agentStatus === 'ok' ? 'bg-green-600' : agentStatus === 'error' ? 'bg-red-500' : 'bg-muted animate-pulse'}`} />
        <span className="text-xs text-muted">
          {agentStatus === 'ok' ? '所有 Agent 运行正常' : agentStatus === 'error' ? 'Agent 服务异常' : '检测中...'}
        </span>
        <span className="text-xs text-muted/40 ml-auto">CoNovel v0.1.0</span>
      </div>
    </div>
  );
}
