'use client';

import Link from 'next/link';

export function BookOverview({ book }: { book: any }) {
  const progress = book.targetWordCount > 0 ? Math.round((book.currentWordCount / book.targetWordCount) * 100) : 0;
  const statusLabels: Record<string, string> = { planning: '策划中', writing: '写作中', reviewing: '审阅中', completed: '已完成', paused: '已暂停' };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="card-editorial">
          <p className="label-editorial text-muted">状态</p>
          <p className="font-serif text-xl mt-2">{statusLabels[book.status] || book.status}</p>
        </div>
        <div className="card-editorial">
          <p className="label-editorial text-muted">总字数</p>
          <p className="font-serif text-xl mt-2">{(book.currentWordCount || 0).toLocaleString()}</p>
          <p className="text-xs text-muted">目标 {(book.targetWordCount || 0).toLocaleString()}</p>
        </div>
        <div className="card-editorial">
          <p className="label-editorial text-muted">章节</p>
          <p className="font-serif text-xl mt-2">{book.totalChapters || 0} 章</p>
        </div>
        <div className="card-editorial">
          <p className="label-editorial text-muted">进度</p>
          <p className="font-serif text-xl mt-2">{progress}%</p>
        </div>
      </div>

      <div className="card-editorial">
        <p className="label-editorial text-muted mb-3">完成进度</p>
        <div className="w-full h-2 bg-border">
          <div className="h-2 bg-foreground transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted">
          <span>{(book.currentWordCount || 0).toLocaleString()} 字</span>
          <span>{(book.targetWordCount || 0).toLocaleString()} 字</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-editorial">
          <p className="label-editorial text-muted mb-3">书籍信息</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted">题材</span><span>{book.genre}</span></div>
            <div className="flex justify-between"><span className="text-muted">创建时间</span><span className="font-mono text-xs">{book.createdAt?.split('T')[0]}</span></div>
            <div className="flex justify-between"><span className="text-muted">更新时间</span><span className="font-mono text-xs">{book.updatedAt?.split('T')[0]}</span></div>
          </div>
        </div>
        <div className="card-editorial">
          <p className="label-editorial text-muted mb-3">快速操作</p>
          <div className="space-y-2">
            <Link href={`/books/${book.id}?tab=chapters`} className="btn-editorial text-xs w-full block text-center">管理章节</Link>
            <Link href={`/books/${book.id}?tab=characters`} className="btn-editorial text-xs w-full block text-center">管理角色</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
