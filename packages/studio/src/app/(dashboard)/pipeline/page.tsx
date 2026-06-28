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
  qualityGate: Record<string, boolean>;
  startedAt: string;
}

const STAGE_ORDER = [
  { id: 'context_assembled', nameZh: '上下文组装', agent: '' },
  { id: 'character_intelligence', nameZh: '角色推理', agent: '角色智能体' },
  { id: 'writing', nameZh: '正文创作', agent: '写作特工' },
  { id: 'observation', nameZh: '事件记录', agent: '观察者' },
  { id: 'fact_check', nameZh: '事实核查', agent: '事实核查官' },
  { id: 'continuity_check', nameZh: '连续性检查', agent: '连续性检查官' },
  { id: 'pacing_check', nameZh: '节奏检查', agent: '节奏控制官' },
  { id: 'reviewing', nameZh: '综合审阅', agent: '审阅官' },
  { id: 'editing', nameZh: '文字润色', agent: '编辑' },
  { id: 'de_ai', nameZh: '去AI味', agent: '去AI味编辑' },
  { id: 'completed', nameZh: '状态同步', agent: '' },
];

function getStageIndex(status: string): number {
  const idx = STAGE_ORDER.findIndex(s => s.id === status);
  return idx >= 0 ? idx : -1;
}

export default function PipelinePage() {
  const [pipelines, setPipelines] = useState<ActivePipeline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/pipeline').then(data => {
      setPipelines(data.activeBooks || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-12 text-muted">加载中...</div>;

  return (
    <div>
      <header className="mb-8 px-12 pt-6">
        <h2 className="font-serif text-2xl tracking-tight">写作流水线</h2>
        <p className="text-muted text-sm mt-1">监控当前章节的创作进度</p>
      </header>

      <div className="px-12 pb-12">
        {pipelines.length === 0 ? (
          <div className="card-editorial text-center py-16">
            <p className="text-muted mb-3">当前没有正在创作的章节</p>
            <p className="text-xs text-muted">在书籍详情页的「写作」Tab 发起创作后，流水线进度会显示在这里</p>
          </div>
        ) : (
          <div className="space-y-8">
            {pipelines.map(p => {
              const currentIdx = getStageIndex(p.pipelineStage);
              return (
                <div key={p.bookId} className="card-editorial">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Link href={`/books/${p.bookId}`} className="font-serif text-lg hover:underline">{p.bookTitle}</Link>
                      <p className="text-muted text-sm mt-1">第 {p.currentChapter} 章 · {p.pipelineStage}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm text-muted">进度</p>
                      <p className="font-serif text-3xl">{p.pipelineProgress}%</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1 bg-border mb-6">
                    <div className="h-1 bg-foreground transition-all duration-500" style={{ width: `${p.pipelineProgress}%` }} />
                  </div>

                  {/* Stages */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {STAGE_ORDER.map((stage, i) => {
                      const isCompleted = i < currentIdx;
                      const isCurrent = i === currentIdx;
                      const statusClass = isCompleted
                        ? 'border-foreground bg-foreground text-background'
                        : isCurrent
                          ? 'border-foreground bg-foreground/5'
                          : 'border-border text-muted';
                      return (
                        <div key={stage.id} className={`border p-3 transition-colors ${statusClass}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs opacity-50">{String(i + 1).padStart(2, '0')}</span>
                            <span className="font-sans text-xs">{stage.nameZh}</span>
                          </div>
                          {stage.agent && <p className="font-mono text-[10px] opacity-70">{stage.agent}</p>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Quality Gate */}
                  <div className="mt-6 pt-4 border-t border-border">
                    <p className="label-editorial text-muted mb-3">质量门禁</p>
                    <div className="flex gap-3 flex-wrap">
                      {[
                        { key: 'l1_memorySync', label: 'L1 记忆同步' },
                        { key: 'l2_factCheck', label: 'L2 事实核查' },
                        { key: 'l3_continuity', label: 'L3 连续性' },
                        { key: 'l4_styleCalibration', label: 'L4 风格校准' },
                        { key: 'l5_deAi', label: 'L5 去AI味' },
                      ].map(gate => (
                        <div key={gate.key} className="flex items-center gap-2 text-xs">
                          <span className={`w-2 h-2 rounded-full ${p.qualityGate[gate.key] ? 'bg-green-500' : 'bg-muted'}`} />
                          <span className="text-muted">{gate.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
