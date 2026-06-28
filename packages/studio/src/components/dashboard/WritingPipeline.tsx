'use client';

import { api } from '@/lib/api';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ActivePipeline {
  bookId: string;
  bookTitle: string;
  currentChapter: number;
  pipelineStage: string;
  pipelineProgress: number;
}

export function WritingPipeline() {
  const [pipelines, setPipelines] = useState<ActivePipeline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/pipeline')
      .then(data => {
        setPipelines(data.activeBooks || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card-editorial animate-pulse">
        <div className="h-4 bg-muted/20 rounded w-32 mb-4" />
        <div className="h-20 bg-muted/20 rounded" />
      </div>
    );
  }

  if (pipelines.length === 0) {
    return (
      <div className="card-editorial text-center py-12">
        <p className="text-muted mb-2">当前没有正在创作的章节</p>
        <p className="text-xs text-muted">在书籍详情页的「写作」Tab 发起创作后，进度会显示在这里</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pipelines.map(p => (
        <div key={p.bookId} className="card-editorial">
          <div className="flex items-center justify-between mb-3">
            <div>
              <Link href={`/books/${p.bookId}`} className="font-serif hover:underline">{p.bookTitle}</Link>
              <p className="text-muted text-xs mt-1">第 {p.currentChapter} 章 · {p.pipelineStage}</p>
            </div>
            <span className="font-serif text-xl">{p.pipelineProgress}%</span>
          </div>
          <div className="w-full h-1 bg-border">
            <div className="h-1 bg-foreground transition-all" style={{ width: `${p.pipelineProgress}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
