'use client';

import { useState, useEffect } from 'react';
import { getSnapshots, getSummaries, type FactSnapshot, type ChapterSummary } from '@/lib/memory';

/**
 * BookMemory — displays the memory system data for a book.
 * Shows fact snapshots, chapter summaries, and current state.
 */
export function BookMemory({ bookId }: { bookId: string }) {
  const [snapshots, setSnapshots] = useState<FactSnapshot[]>([]);
  const [summaries, setSummaries] = useState<ChapterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'snapshots' | 'summaries'>('snapshots');
  const [selectedSnapshot, setSelectedSnapshot] = useState<FactSnapshot | null>(null);

  useEffect(() => {
    Promise.all([getSnapshots(bookId), getSummaries(bookId)])
      .then(([s, m]) => {
        setSnapshots(s);
        setSummaries(m);
        if (s.length > 0) setSelectedSnapshot(s[s.length - 1]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [bookId]);

  if (loading) {
    return <div className="text-muted text-sm">加载记忆数据...</div>;
  }

  return (
    <div>
      {/* Tab Switcher */}
      <div className="flex gap-1 mb-4 border-b border-border">
        <button
          onClick={() => setActiveTab('snapshots')}
          className={`px-3 py-2 text-xs transition-colors ${
            activeTab === 'snapshots'
              ? 'border-b-2 border-foreground'
              : 'text-muted hover:text-foreground'
          }`}
        >
          事实快照 ({snapshots.length})
        </button>
        <button
          onClick={() => setActiveTab('summaries')}
          className={`px-3 py-2 text-xs transition-colors ${
            activeTab === 'summaries'
              ? 'border-b-2 border-foreground'
              : 'text-muted hover:text-foreground'
          }`}
        >
          章节摘要 ({summaries.length})
        </button>
      </div>

      {activeTab === 'snapshots' && (
        <div className="flex gap-4">
          {/* Snapshot List */}
          <div className="w-32 flex-shrink-0 space-y-1">
            {snapshots.length === 0 ? (
              <p className="text-xs text-muted">暂无快照</p>
            ) : (
              snapshots.map((s) => (
                <button
                  key={s.chapterNumber}
                  onClick={() => setSelectedSnapshot(s)}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                    selectedSnapshot?.chapterNumber === s.chapterNumber
                      ? 'border-l-2 border-foreground bg-foreground/5'
                      : 'border-l-2 border-transparent text-muted hover:text-foreground'
                  }`}
                >
                  第{s.chapterNumber}章
                </button>
              ))
            )}
          </div>

          {/* Snapshot Detail */}
          <div className="flex-1 min-w-0">
            {selectedSnapshot ? (
              <div className="space-y-4">
                <div>
                  <p className="label-editorial text-muted mb-2">角色 ({selectedSnapshot.characters.length})</p>
                  <div className="space-y-2">
                    {selectedSnapshot.characters.map((c) => (
                      <div key={c.id} className="p-3 border border-border">
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted mt-1">{c.location} · {c.emotionalState}</p>
                        {c.keyActions.length > 0 && (
                          <p className="text-xs text-muted mt-1">行为：{c.keyActions.join('；')}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="label-editorial text-muted mb-2">剧情进展</p>
                  <p className="text-sm">{selectedSnapshot.plotProgress.mainPlot}</p>
                  {selectedSnapshot.plotProgress.subplots.length > 0 && (
                    <ul className="mt-1 text-xs text-muted list-disc list-inside">
                      {selectedSnapshot.plotProgress.subplots.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {selectedSnapshot.unresolvedQuestions.length > 0 && (
                  <div>
                    <p className="label-editorial text-muted mb-2">未解决问题</p>
                    <ul className="text-xs text-muted list-disc list-inside">
                      {selectedSnapshot.unresolvedQuestions.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedSnapshot.nextChapterHints.length > 0 && (
                  <div>
                    <p className="label-editorial text-muted mb-2">下章提示</p>
                    <ul className="text-xs text-muted list-disc list-inside">
                      {selectedSnapshot.nextChapterHints.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted text-sm">选择左侧快照查看详情</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'summaries' && (
        <div className="space-y-3">
          {summaries.length === 0 ? (
            <p className="text-muted text-sm">暂无章节摘要</p>
          ) : (
            summaries.map((s) => (
              <div key={s.chapterNumber} className="p-4 border border-border">
                <p className="font-serif text-sm mb-1">第{s.chapterNumber}章「{s.title}」</p>
                <p className="text-xs text-muted leading-relaxed">{s.summary}</p>
                {s.keyEvents.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.keyEvents.map((e, i) => (
                      <span key={i} className="px-2 py-0.5 text-[10px] border border-border text-muted">{e}</span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
