'use client';

import { api } from '@/lib/api';
import { useState, useEffect, useRef } from 'react';

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
  const [error, setError] = useState<string | null>(null);
  const [agentResults, setAgentResults] = useState<any[]>([]);
  const [gateStatus, setGateStatus] = useState<any>(null);
  const [canStart, setCanStart] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const nextChapter = (book.totalChapters || 0) + 1;

  // Check if pipeline can start
  useEffect(() => {
    api.get(`/api/books/${bookId}/write`).then((data: any) => {
      setCanStart(data.canStart);
      setCheckingStatus(false);
    }).catch(() => setCheckingStatus(false));
  }, [bookId]);

  const handleStart = async () => {
    setRunning(true);
    setCurrentStage(0);
    setResult(null);
    setError(null);
    setAgentResults([]);

    // Simulate stage progression while waiting for real pipeline
    // The real pipeline runs server-side, we poll for completion
    const stageInterval = setInterval(() => {
      setCurrentStage(prev => {
        if (prev >= PIPELINE_STAGES.length - 1) return prev;
        return prev + 1;
      });
    }, 3000); // Advance stage every 3 seconds while running

    try {
      const data = await api.post(`/api/books/${bookId}/write`, {
        chapterNumber: nextChapter,
        action: 'start',
      });

      clearInterval(stageInterval);
      setCurrentStage(PIPELINE_STAGES.length - 1);

      if (data.success) {
        setResult(data.output || '创作完成');
        setAgentResults(data.agentResults || []);
        setGateStatus(data.gateStatus || null);
      } else {
        setError(data.error || '创作失败');
      }
    } catch (e: any) {
      clearInterval(stageInterval);
      setError(e.message || '网络错误');
    }

    setRunning(false);
  };

  return (
    <div className="space-y-8">
      {/* Status Bar */}
      {!checkingStatus && !canStart && (
        <div className="border border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/50 p-4 text-sm">
          <p className="font-medium text-yellow-800 dark:text-yellow-300">尚未配置Agent模型</p>
          <p className="text-yellow-700 dark:text-yellow-400 text-xs mt-1">请先在「设置 → Agent模型配置」中配置至少一个Agent的模型，才能开始创作。</p>
        </div>
      )}

      <div className="card-editorial">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="label-editorial text-muted">创作流水线</p>
            <p className="text-sm text-muted mt-1">下一个章节: 第{nextChapter}章</p>
          </div>
          <button onClick={handleStart} disabled={running || !canStart} className={`btn-editorial-primary text-xs ${running || !canStart ? 'opacity-50 cursor-not-allowed' : ''}`}>
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

      {/* Error */}
      {error && (
        <div className="card-editorial border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/50">
          <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">创作失败</p>
          <p className="text-xs text-red-700 dark:text-red-400 whitespace-pre-wrap">{error}</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-2">请检查：1) LiteLLM是否运行 2) Agent模型是否已配置 3) Python依赖是否安装（bash scripts/setup.sh）</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="card-editorial">
          <div className="flex items-center justify-between mb-3">
            <p className="label-editorial text-muted">创作结果</p>
            <span className="text-xs text-muted">{result.length} 字</span>
          </div>
          <div className="border border-border p-4 max-h-96 overflow-y-auto">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{result}</p>
          </div>
        </div>
      )}

      {/* Agent Results */}
      {agentResults.length > 0 && (
        <div className="card-editorial">
          <p className="label-editorial text-muted mb-3">Agent 执行结果</p>
          <div className="space-y-2">
            {agentResults.map((r: any, i: number) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0 text-xs">
                <span className={`w-2 h-2 rounded-full ${r.success ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="font-mono w-32">{r.agent}</span>
                {r.score && <span className="font-mono">得分: {r.score}</span>}
                {r.duration && <span className="text-muted">{(r.duration / 1000).toFixed(1)}s</span>}
                {r.issues?.length > 0 && <span className="text-yellow-600">{r.issues.length} 个问题</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gate Status */}
      {gateStatus && (
        <div className="card-editorial">
          <p className="label-editorial text-muted mb-3">质量门禁</p>
          <div className="flex gap-4 flex-wrap">
            {[
              { key: 'l1_memorySync', label: 'L1 记忆同步' },
              { key: 'l2_factCheck', label: 'L2 事实核查' },
              { key: 'l3_continuity', label: 'L3 连续性' },
              { key: 'l4_styleCalibration', label: 'L4 风格校准' },
              { key: 'l5_deAi', label: 'L5 去AI味' },
            ].map(g => (
              <div key={g.key} className="flex items-center gap-2 text-xs">
                <span className={`w-2 h-2 rounded-full ${gateStatus[g.key] ? 'bg-green-500' : 'bg-muted'}`} />
                <span className={gateStatus[g.key] ? 'text-foreground' : 'text-muted'}>{g.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
