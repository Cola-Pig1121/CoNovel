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
  premise?: string;
  currentWordCount: number;
  totalChapters: number;
  currentChapter: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

const GENRES = ['仙侠', '玄幻', '都市', '科幻', '悬疑', '历史', '军事', '游戏', '体育', '灵异', '同人', '轻小说'];

export default function Home() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentStatus, setAgentStatus] = useState<'ok' | 'error' | 'loading'>('loading');
  const [hasProviders, setHasProviders] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newGenre, setNewGenre] = useState('');
  const [newPremise, setNewPremise] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<{ books: Book[] }>('/api/books'),
      api.get<any>('/api/config?type=agents'),
      api.get<any>('/api/config?type=providers'),
    ]).then(([booksData, agentsData, providersData]) => {
      setBooks(booksData.books || []);
      setAgentStatus(agentsData.agents?.length > 0 ? 'ok' : 'error');
      const providers = providersData.providers || [];
      setHasProviders(providers.some((p: any) => p.enabled && p.models?.length > 0));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const data = await api.post<any>('/api/books', {
        title: newTitle.trim(),
        genre: newGenre || 'fantasy',
        genres: newGenre ? [newGenre] : [],
        premise: newPremise.trim(),
        targetWordCount: 3000,
      });
      setShowCreate(false);
      router.push(`/editor?bookId=${data.id}&num=1`);
    } catch (e) {
      console.error('Failed to create book', e);
    }
    setCreating(false);
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
          <button onClick={() => { setShowCreate(true); setNewTitle(''); setNewGenre(''); setNewPremise(''); }} className="btn-editorial-primary">
            新建项目
          </button>
        </div>
      </header>

      {/* Onboarding: No LLM configured */}
      {!loading && !hasProviders && (
        <div className="mx-12 mt-6 p-4 border border-border bg-background">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium mb-1">配置 LLM 服务商</p>
              <p className="text-xs text-muted">在开始写作前，需要配置一个 LLM 服务商（如 OpenAI、Anthropic、DeepSeek）来使用 AI 功能。</p>
            </div>
            <Link href="/settings" className="btn-editorial-primary text-xs flex-shrink-0">去配置</Link>
          </div>
        </div>
      )}

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
            <button onClick={() => { setShowCreate(true); setNewTitle(''); setNewGenre(''); setNewPremise(''); }} className="btn-editorial-primary">
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
                  <span>{book.totalChapters || 0} 章</span>
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
              onClick={() => { setShowCreate(true); setNewTitle(''); setNewGenre(''); setNewPremise(''); }}
              className="card-editorial border-dashed p-6 flex items-center justify-center min-h-[160px] text-muted hover:text-foreground transition-colors"
            >
              <span className="text-sm tracking-wide">+ 新建项目</span>
            </button>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setShowCreate(false)}>
          <div className="fixed inset-0 bg-black/30" />
          <div className="relative bg-background border border-border w-[28rem] p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-serif text-lg mb-4">新建项目</h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted block mb-1">书名 *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="input-editorial w-full"
                  placeholder="输入书名..."
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">类型</label>
                <div className="flex flex-wrap gap-1.5">
                  {GENRES.map(g => (
                    <button
                      key={g}
                      onClick={() => setNewGenre(newGenre === g ? '' : g)}
                      className={`px-2.5 py-1 text-[11px] border transition-colors ${
                        newGenre === g ? 'border-foreground bg-foreground/10' : 'border-border hover:border-foreground/50'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">核心设定</label>
                <textarea
                  value={newPremise}
                  onChange={e => setNewPremise(e.target.value)}
                  className="input-editorial w-full h-20 resize-none"
                  placeholder="一句话描述故事核心..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCreate(false)} className="btn-editorial text-xs px-4 py-2">取消</button>
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim() || creating}
                className="btn-editorial-primary text-xs px-4 py-2 disabled:opacity-40"
              >
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Status Bar */}
      <div className="border-t border-border px-12 py-3 flex items-center gap-3">
        <span className={`w-2 h-2 rounded-full ${agentStatus === 'ok' ? 'bg-green-600' : agentStatus === 'error' ? 'bg-red-500' : 'bg-muted animate-pulse'}`} />
        <span className="text-xs text-muted">
          {agentStatus === 'ok' ? 'Agent 就绪' : agentStatus === 'error' ? <Link href="/settings" className="underline hover:text-foreground">未配置 LLM 服务商</Link> : '检测中...'}
        </span>
        <span className="text-xs text-muted/40 ml-auto">CoNovel v0.1.0</span>
      </div>
    </div>
  );
}
