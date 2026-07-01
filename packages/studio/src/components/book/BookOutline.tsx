'use client';

import { useState } from 'react';

export function BookOutline({ bookId, book }: { bookId: string; book: any }) {
  const outline = book.outline || { volumes: [], progress: { mainPlot: 0 } };
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  return (
    <div className="space-y-6">
      <div className="card-editorial">
        <div className="flex items-center justify-between mb-4">
          <p className="label-editorial text-muted">主线进度</p>
          <span className="font-mono text-sm">{Math.round((outline.progress?.mainPlot || 0) * 100)}%</span>
        </div>
        <div className="w-full h-2 bg-border">
          <div className="h-2 bg-foreground" style={{ width: `${(outline.progress?.mainPlot || 0) * 100}%` }} />
        </div>
      </div>

      {outline.volumes.length === 0 ? (
        <div className="card-editorial text-center py-12">
          <p className="text-muted mb-3">暂无大纲</p>
          <p className="text-xs text-muted">通过「写作」Tab 或 Agent 对话创建大纲</p>
        </div>
      ) : (
        <div className="space-y-4">
          {outline.volumes.map((vol: any, vi: number) => (
            <div key={vi} className="card-editorial">
              <button
                onClick={() => setExpanded({ ...expanded, [vi]: !expanded[vi] })}
                className="w-full text-left flex items-center justify-between"
              >
                <div>
                  <span className="font-mono text-xs text-muted mr-2">卷{vol.volumeNumber || vi + 1}</span>
                  <span className="font-serif">{vol.title || '未命名'}</span>
                </div>
                <span className="text-muted text-sm">{expanded[vi] ? '−' : '+'}</span>
              </button>
              {expanded[vi] && (
                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  <p className="text-sm text-muted">{vol.summary}</p>
                  {vol.chapters?.map((ch: any, ci: number) => (
                    <div key={ci} className="flex items-center gap-3 py-2 px-3 border border-border text-sm">
                      <span className="font-mono text-xs text-muted w-8">第{ch.chapterNumber}章</span>
                      <span className="flex-1">{ch.title || ch.summary?.substring(0, 30)}</span>
                      <span className={`text-xs px-2 py-0.5 ${ch.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-muted/20 text-muted'}`}>{ch.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
