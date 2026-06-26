'use client';

import { useState, useEffect } from 'react';

interface ReadingPowerData {
  overall: number;
  chapters: Array<{
    chapterNumber: number;
    title: string;
    wordCount: number;
    hookStrength: number;
    coolPointDelivery: number;
    tensionScore: number;
    cliffhangerQuality: number;
  }>;
  metrics: {
    avgHookStrength: number;
    avgCoolPoint: number;
    avgTension: number;
    avgCliffhanger: number;
    totalChapters: number;
    recentChapters: number;
  };
}

export function BookReadingPower({ bookId }: { bookId: string }) {
  const [data, setData] = useState<ReadingPowerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/books/${bookId}/reading-power`).then(r => r.json()).then(d => {
      setData(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [bookId]);

  if (loading) return <div className="text-muted text-sm">加载中...</div>;
  if (!data) return <div className="text-muted text-sm">加载失败</div>;

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-foreground';
    if (score >= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h3 className="font-serif text-lg">追读力分析</h3>
        <p className="text-xs text-muted mt-1">量化每章的钩子强度、爽点交付、张力和悬念质量</p>
      </div>

      {/* Overall Score */}
      <div className="card-editorial">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="label-editorial text-muted">综合追读力</p>
            <p className="text-xs text-muted mt-1">基于最近 {data.metrics.recentChapters} 章的平均分</p>
          </div>
          <div className="text-right">
            <p className={`font-serif text-5xl ${getScoreColor(data.overall)}`}>{data.overall}</p>
            <p className="text-xs text-muted">/10</p>
          </div>
        </div>
        <div className="w-full h-2 bg-border">
          <div className="h-2 bg-foreground transition-all" style={{ width: `${data.overall * 10}%` }} />
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '平均钩子强度', labelEn: 'Hook Strength', value: data.metrics.avgHookStrength },
          { label: '平均爽点交付', labelEn: 'Cool Points', value: data.metrics.avgCoolPoint },
          { label: '平均张力', labelEn: 'Tension', value: data.metrics.avgTension },
          { label: '平均悬念', labelEn: 'Cliffhanger', value: data.metrics.avgCliffhanger },
        ].map(m => (
          <div key={m.labelEn} className="card-editorial">
            <p className="label-editorial text-muted">{m.label}</p>
            <p className={`font-serif text-2xl mt-2 ${getScoreColor(m.value)}`}>{m.value}</p>
            <p className="text-xs text-muted font-mono">{m.labelEn}</p>
          </div>
        ))}
      </div>

      {/* Per-chapter breakdown */}
      {data.chapters.length > 0 && (
        <div className="card-editorial">
          <p className="label-editorial text-muted mb-4">各章追读力</p>
          <div className="space-y-2">
            {data.chapters.map(ch => {
              const avg = (ch.hookStrength + ch.coolPointDelivery + ch.tensionScore + ch.cliffhangerQuality) / 4;
              return (
                <div key={ch.chapterNumber} className="flex items-center gap-4 py-2 border-b border-border last:border-0">
                  <span className="font-mono text-xs text-muted w-16">第{ch.chapterNumber}章</span>
                  <span className="flex-1 text-sm truncate">{ch.title || '未命名'}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span title="钩子">🪝{ch.hookStrength}</span>
                    <span title="爽点">⚡{ch.coolPointDelivery}</span>
                    <span title="张力">🔥{ch.tensionScore}</span>
                    <span title="悬念">❓{ch.cliffhangerQuality}</span>
                    <span className={`font-mono font-medium ${getScoreColor(avg)}`}>{avg.toFixed(1)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
