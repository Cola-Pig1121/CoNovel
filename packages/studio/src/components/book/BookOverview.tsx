'use client';

import Link from 'next/link';

export function BookOverview({ book }: { book: any }) {
  const progress = book.targetWordCount > 0 ? Math.round((book.currentWordCount / book.targetWordCount) * 100) : 0;
  const statusLabels: Record<string, string> = { planning: '策划中', writing: '写作中', reviewing: '审阅中', completed: '已完成', paused: '已暂停' };
  const isNew = (book.totalChapters || 0) === 0 && (book.currentWordCount || 0) === 0;

  return (
    <div className="space-y-8">
      {/* Getting Started Guide for new books */}
      {isNew && (
        <div className="card-editorial border-accent">
          <h3 className="font-serif text-lg mb-3">开始创作</h3>
          <p className="text-sm text-muted mb-4">这是一个新项目，按照以下步骤开始您的创作之旅：</p>
          <div className="space-y-3">
            {[
              { step: 1, tab: 'constraints', label: '编写写作约束', desc: '在「约束」Tab中定义您的写作规则、禁词列表、风格要求' },
              { step: 2, tab: 'reference', label: '添加参考小说', desc: '在「参考」Tab中添加您喜欢的作品，系统会分析其文风' },
              { step: 3, tab: 'style', label: '配置风格', desc: '在「风格」Tab中设置叙事视角、句式风格、词汇水平' },
              { step: 4, tab: 'characters', label: '设计角色', desc: '在「角色」Tab中创建主要角色和配角' },
              { step: 5, tab: 'outline', label: '构建大纲', desc: '在「大纲」Tab中规划卷章结构和每章蓝图' },
              { step: 6, tab: 'write', label: '开始创作', desc: '在「写作」Tab中发起创作流水线' },
            ].map(item => (
              <Link
                key={item.step}
                href={`/book?id=${book.id}&tab=${item.tab}`}
                className="flex items-start gap-3 p-3 border border-border hover:border-foreground transition-colors"
              >
                <span className="font-mono text-xs text-muted w-6">{String(item.step).padStart(2, '0')}</span>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted mt-0.5">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
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

      {/* Progress Bar */}
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

      {/* Book Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-editorial">
          <p className="label-editorial text-muted mb-3">书籍信息</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted">题材</span><span>{book.genre}</span></div>
            {book.premise && <div className="flex justify-between"><span className="text-muted">核心设定</span><span className="text-right max-w-xs text-xs">{book.premise.substring(0, 50)}...</span></div>}
            <div className="flex justify-between"><span className="text-muted">创建时间</span><span className="font-mono text-xs">{book.createdAt?.split('T')[0]}</span></div>
          </div>
        </div>
        <div className="card-editorial">
          <p className="label-editorial text-muted mb-3">快速操作</p>
          <div className="space-y-2">
            <Link href={`/books/${book.id}`} className="btn-editorial text-xs w-full block text-center">管理章节</Link>
            <Link href={`/books/${book.id}`} className="btn-editorial text-xs w-full block text-center">管理角色</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
