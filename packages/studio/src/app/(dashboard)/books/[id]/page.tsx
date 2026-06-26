'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { BookOverview } from '@/components/book/BookOverview';
import { BookOutline } from '@/components/book/BookOutline';
import { BookCharacters } from '@/components/book/BookCharacters';
import { BookForeshadowing } from '@/components/book/BookForeshadowing';
import { BookTimeline } from '@/components/book/BookTimeline';
import { BookChapters } from '@/components/book/BookChapters';
import { BookStyle } from '@/components/book/BookStyle';
import { BookWrite } from '@/components/book/BookWrite';

const TABS = [
  { id: 'overview', label: '概览', labelEn: 'Overview' },
  { id: 'outline', label: '大纲', labelEn: 'Outline' },
  { id: 'characters', label: '角色', labelEn: 'Characters' },
  { id: 'foreshadowing', label: '伏笔', labelEn: 'Foreshadowing' },
  { id: 'timeline', label: '时间线', labelEn: 'Timeline' },
  { id: 'chapters', label: '章节', labelEn: 'Chapters' },
  { id: 'style', label: '风格', labelEn: 'Style' },
  { id: 'write', label: '写作', labelEn: 'Write' },
];

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState('overview');
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/books/${id}`).then(r => r.json()).then(data => {
      setBook(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-12 text-muted">加载中...</div>;
  if (!book) return <div className="p-12 text-muted">书籍不存在</div>;

  return (
    <div>
      {/* Header */}
      <header className="border-b border-border px-12 py-4">
        <div className="flex items-center gap-4 mb-3">
          <Link href="/books" className="text-muted hover:text-foreground text-sm">← 返回列表</Link>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl tracking-tight">{book.title}</h1>
            <p className="text-muted text-sm mt-1">{book.genre} · {(book.currentWordCount || 0).toLocaleString()} 字 · {book.totalChapters || 0} 章</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 px-12 border-b border-border">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm transition-colors ${activeTab === tab.id ? 'border-b-2 border-foreground' : 'text-muted hover:text-foreground'}`}
          >
            <span className="font-sans">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="px-12 py-8">
        {activeTab === 'overview' && <BookOverview book={book} />}
        {activeTab === 'outline' && <BookOutline bookId={id} book={book} />}
        {activeTab === 'characters' && <BookCharacters bookId={id} book={book} />}
        {activeTab === 'foreshadowing' && <BookForeshadowing bookId={id} book={book} />}
        {activeTab === 'timeline' && <BookTimeline bookId={id} book={book} />}
        {activeTab === 'chapters' && <BookChapters bookId={id} book={book} />}
        {activeTab === 'style' && <BookStyle bookId={id} />}
        {activeTab === 'write' && <BookWrite bookId={id} book={book} />}
      </div>
    </div>
  );
}
