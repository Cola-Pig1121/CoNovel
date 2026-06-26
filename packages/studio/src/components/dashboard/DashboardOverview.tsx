'use client';

import { useState, useEffect } from 'react';

interface ProjectStats {
  totalBooks: number;
  activeBooks: number;
  totalChapters: number;
  totalWordCount: number;
  avgQualityScore: number;
}

export function DashboardOverview() {
  const [stats, setStats] = useState<ProjectStats>({
    totalBooks: 0,
    activeBooks: 0,
    totalChapters: 0,
    totalWordCount: 0,
    avgQualityScore: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch real data from books API
    fetch('/api/books')
      .then(r => r.json())
      .then(data => {
        const books = data.books || [];
        let totalChapters = 0;
        let totalWordCount = 0;

        for (const book of books) {
          totalChapters += book.totalChapters || 0;
          totalWordCount += book.currentWordCount || 0;
        }

        const activeBooks = books.filter((b: { status: string }) =>
          b.status === 'writing' || b.status === 'reviewing'
        ).length;

        setStats({
          totalBooks: books.length,
          activeBooks,
          totalChapters,
          totalWordCount,
          avgQualityScore: 0, // Will be calculated from agent data
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="card-editorial animate-pulse">
            <div className="h-3 bg-muted/20 rounded w-20 mb-4" />
            <div className="h-8 bg-muted/20 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <StatCard label="项目总数" labelEn="Total Books" value={stats.totalBooks} unit="个" />
      <StatCard label="进行中" labelEn="Active" value={stats.activeBooks} unit="个" />
      <StatCard label="已完成章节" labelEn="Chapters" value={stats.totalChapters} unit="章" />
      <StatCard label="总字数" labelEn="Word Count" value={stats.totalWordCount} unit="字" />
      <StatCard label="平均质量分" labelEn="Quality Score" value={stats.avgQualityScore} unit="/10" />
    </div>
  );
}

function StatCard({ label, labelEn, value, unit }: {
  label: string; labelEn: string; value: number; unit: string;
}) {
  return (
    <div className="card-editorial">
      <p className="label-editorial text-muted">{label}</p>
      <p className="font-mono text-xs text-muted mt-1">{labelEn}</p>
      <div className="mt-4">
        <span className="font-serif text-3xl tracking-tight">
          {typeof value === 'number' && value > 999 ? value.toLocaleString() : value}
        </span>
        <span className="text-muted text-sm ml-1">{unit}</span>
      </div>
    </div>
  );
}
