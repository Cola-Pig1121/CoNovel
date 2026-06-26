'use client';

import { useState } from 'react';

const PIPELINE_STAGES = [
  { id: 'context', nameZh: '上下文组装' },
  { id: 'character-intel', nameZh: '角色推理' },
  { id: 'writing', nameZh: '正文创作' },
  { id: 'observation', nameZh: '事件记录' },
  { id: 'fact-check', nameZh: '事实核查' },
  { id: 'continuity', nameZh: '连续性检查' },
  { id: 'pacing', nameZh: '节奏检查' },
  { id: 'review', nameZh: '综合审阅' },
  { id: 'editing', nameZh: '文字润色' },
  { id: 'de-ai', nameZh: '去AI味' },
  { id: 'reflector', nameZh: '质量反思' },
  { id: 'sync', nameZh: '状态同步' },
];

export function BookWrite({ bookId, book }: { bookId: string; book: any }) {
  const [running, setRunning] = useState(false);
  const [currentStage, setCurrentStage] = useState(-1);
  const [result, setResult] = useState<string | null>(null);

  const handleStart = async () => {
    setRunning(true);
    setCurrentStage(0);
    setResult(null);

    // Simulate pipeline stages (in production, this would be SSE from the server)
    for (let i = 0; i < PIPELINE_STAGES.length; i++) {
      setCurrentStage(i);
      await new Promise(r => setTimeout(r, 800));
    }

    setResult(`第${(book.totalChapters || 0) + 1}章创作完成（模拟结果）。实际运行时会调用 LiteLLM 网关，通过15个Agent协作完成章节创作。`);
    setRunning(false);
  };

  return (
    <div className="space-y-8">
      <div className="card-editorial">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="label-editorial text-muted">创作流水线</p>
            <p className="text-sm text-muted mt-1">下一个章节: 第{(book.totalChapters || 0) + 1}章</p>
          </div>
          <button onClick={handleStart} disabled={running} className={`btn-editorial-primary text-xs ${running ? 'opacity-50' : ''}`}>
            {running ? '创作中...' : '开始创作'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {PIPELINE_STAGES.map((stage, i) => {
            const isCompleted = i < currentStage || (!running && currentStage >= PIPELINE_STAGES.length);
            const isCurrent = i === currentStage && running;
            return (
              <div key={stage.id} className={`border p-3 text-center transition-colors ${
                isCompleted ? 'border-foreground bg-foreground text-background' :
                isCurrent ? 'border-foreground bg-foreground/5' :
                'border-border text-muted'
              }`}>
                <span className="font-mono text-xs opacity-50">{String(i + 1).padStart(2, '0')}</span>
                <p className="text-xs mt-1">{stage.nameZh}</p>
              </div>
            );
          })}
        </div>
      </div>

      {result && (
        <div className="card-editorial">
          <p className="label-editorial text-muted mb-3">创作结果</p>
          <p className="text-sm whitespace-pre-wrap">{result}</p>
        </div>
      )}
    </div>
  );
}
