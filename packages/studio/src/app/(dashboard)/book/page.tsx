'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { BookOverview } from '@/components/book/BookOverview';
import { BookOutline } from '@/components/book/BookOutline';
import { BookCharacters } from '@/components/book/BookCharacters';
import { BookForeshadowing } from '@/components/book/BookForeshadowing';
import { BookTimeline } from '@/components/book/BookTimeline';
import { BookChapters } from '@/components/book/BookChapters';
import { BookStyle } from '@/components/book/BookStyle';
import { BookWrite } from '@/components/book/BookWrite';
import { BookReference } from '@/components/book/BookReference';
import { BookNaming } from '@/components/book/BookNaming';
import { BookTechniques } from '@/components/book/BookTechniques';
import { BookConstraints } from '@/components/book/BookConstraints';
import { BookGitHistory } from '@/components/book/BookGitHistory';
import { BookReadingPower } from '@/components/book/BookReadingPower';
import { BookHooks } from '@/components/book/BookHooks';
import { TokenStatusBar } from '@/components/TokenStatusBar';
import Link from 'next/link';

const TAB_GROUPS = [
  { label: '项目', tabs: [
    { id: 'overview', label: '概览' },
    { id: 'chapters', label: '章节' },
    { id: 'write', label: '写作' },
    { id: 'git', label: '版本' },
  ]},
  { label: '创作', tabs: [
    { id: 'outline', label: '大纲' },
    { id: 'characters', label: '角色' },
    { id: 'foreshadowing', label: '伏笔' },
    { id: 'timeline', label: '时间线' },
  ]},
  { label: '风格', tabs: [
    { id: 'style', label: '风格' },
    { id: 'constraints', label: '约束' },
    { id: 'reference', label: '参考' },
    { id: 'techniques', label: '技法' },
    { id: 'naming', label: '取名' },
  ]},
  { label: '分析', tabs: [
    { id: 'hooks', label: 'Hook治理' },
    { id: 'reading-power', label: '追读力' },
  ]},
];
const TABS = TAB_GROUPS.flatMap(g => g.tabs);

function BookPageInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    api.get<any>(`/api/books/${id}`).then(d => { setBook(d); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && TABS.some(t => t.id === tab)) setActiveTab(tab);
  }, [searchParams]);

  if (!id) return <div className="p-12"><p className="text-muted mb-4">未指定项目</p><Link href="/" className="btn-editorial text-xs">返回项目中心</Link></div>;
  if (loading) return <div className="p-12 text-muted">加载中...</div>;
  if (!book) return <div className="p-12"><p className="text-muted mb-4">项目不存在</p><Link href="/" className="btn-editorial text-xs">返回项目中心</Link></div>;

  return (
    <div>
      <header className="border-b border-border px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-muted hover:text-foreground text-sm">← 书架</Link>
          <h1 className="font-serif text-lg">{book.title}</h1>
          <span className="text-xs text-muted font-mono">{book.genre} · {(book.currentWordCount || 0).toLocaleString()} 字</span>
        </div>
        <TokenStatusBar bookId={id} />
      </header>
      <div className="flex items-end gap-4 px-8 border-b border-border overflow-x-auto">
        {TAB_GROUPS.map(group => (
          <div key={group.label} className="flex items-end gap-0">
            <span className="text-[10px] text-muted/40 uppercase tracking-widest pb-2.5 pr-2 flex-shrink-0">{group.label}</span>
            {group.tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-2.5 py-2.5 text-xs transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-b-2 border-foreground' : 'text-muted hover:text-foreground'}`}>{tab.label}</button>
            ))}
          </div>
        ))}
      </div>
      <div className="px-8 py-6">
        {activeTab === 'overview' && <BookOverview book={book} />}
        {activeTab === 'outline' && <BookOutline bookId={id} book={book} />}
        {activeTab === 'characters' && <BookCharacters bookId={id} book={book} />}
        {activeTab === 'foreshadowing' && <BookForeshadowing bookId={id} book={book} />}
        {activeTab === 'hooks' && <BookHooks bookId={id} />}
        {activeTab === 'reading-power' && <BookReadingPower bookId={id} />}
        {activeTab === 'timeline' && <BookTimeline bookId={id} book={book} />}
        {activeTab === 'chapters' && <BookChapters bookId={id} book={book} />}
        {activeTab === 'reference' && <BookReference bookId={id} book={book} />}
        {activeTab === 'techniques' && <BookTechniques bookId={id} book={book} />}
        {activeTab === 'naming' && <BookNaming bookId={id} book={book} />}
        {activeTab === 'constraints' && <BookConstraints bookId={id} />}
        {activeTab === 'style' && <BookStyle bookId={id} />}
        {activeTab === 'write' && <BookWrite bookId={id} book={book} />}
        {activeTab === 'git' && <BookGitHistory bookId={id} />}
      </div>
    </div>
  );
}

export default function BookPage() {
  return <Suspense fallback={<div className="p-12 text-muted">加载中...</div>}><BookPageInner /></Suspense>;
}
