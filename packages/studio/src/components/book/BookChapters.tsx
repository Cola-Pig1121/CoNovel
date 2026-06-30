'use client';

import { api } from '@/lib/api';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ChapterMeta {
  chapterNumber: number;
  title: string;
  wordCount: number;
  status: string;
}

export function BookChapters({ bookId, book }: { bookId: string; book: any }) {
  const [chapters, setChapters] = useState<ChapterMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/books/${bookId}/chapters`).then(data => {
      setChapters(data.chapters || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [bookId]);

  const handleAddChapter = async () => {
    const num = chapters.length + 1;
    try {
      const ch = await api.post(`/api/books/${bookId}/chapters`, { chapterNumber: num, title: `第${num}章`, content: '' });
      setChapters([...chapters, { chapterNumber: ch.chapterNumber, title: ch.title, wordCount: 0, status: 'draft' }]);
    } catch {}
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-muted/20 text-muted',
    writing: 'bg-blue-100 text-blue-800',
    reviewed: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
  };
  const statusLabels: Record<string, string> = { draft: '草稿', writing: '写作中', reviewed: '已审阅', completed: '已完成' };

  if (loading) return <div className="text-muted text-sm">加载中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="label-editorial text-muted">章节列表 ({chapters.length})</p>
        <button onClick={handleAddChapter} className="btn-editorial-primary text-xs">新建章节</button>
      </div>

      {chapters.length === 0 ? (
        <div className="card-editorial text-center py-12">
          <p className="text-muted mb-3">暂无章节</p>
          <button onClick={handleAddChapter} className="btn-editorial-primary text-xs">创建第一章</button>
        </div>
      ) : (
        <div className="space-y-2">
          {chapters.map(ch => (
            <Link
              key={ch.chapterNumber}
              href={`/editor?bookId=${bookId}&num=${ch.chapterNumber}`}
              className="card-editorial flex items-center gap-4 hover:border-foreground block"
            >
              <span className="font-mono text-xs text-muted w-12">第{ch.chapterNumber}章</span>
              <span className="flex-1 font-sans text-sm">{ch.title || '未命名'}</span>
              <span className="font-mono text-xs text-muted">{(ch.wordCount || 0).toLocaleString()} 字</span>
              <span className={`px-2 py-0.5 text-xs ${statusColors[ch.status] || 'bg-muted/20'}`}>{statusLabels[ch.status] || ch.status}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
