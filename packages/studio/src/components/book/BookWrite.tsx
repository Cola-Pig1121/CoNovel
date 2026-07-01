'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { runPipeline, type PipelineState } from '@/lib/pipeline';
import { PIPELINE_STAGES, STAGE_NAMES, STAGE_PROGRESS, type PipelineStage } from '@/lib/pipeline/prompts';
import { getProviders } from '@/lib/providers';

export function BookWrite({ bookId, book }: { bookId: string; book: any }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [state, setState] = useState<PipelineState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canStart, setCanStart] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const abortRef = useRef(false);

  const nextChapter = (book.totalChapters || 0) + 1;

  // Check if LLM is configured
  useEffect(() => {
    getProviders()
      .then(providers => {
        const hasEnabled = providers.some(p => p.enabled && p.models.length > 0);
        setCanStart(hasEnabled);
        setCheckingStatus(false);
      })
      .catch(() => setCheckingStatus(false));
  }, []);

  const handleStart = async () => {
    setRunning(true);
    setError(null);
    abortRef.current = false;

    const pipelineState = await runPipeline(bookId, nextChapter, {
      onStageStart: (stage, progress) => {
        if (abortRef.current) return;
        setState(prev => prev ? { ...prev, currentStage: stage, progress } : null);
      },
      onStageComplete: (stage, output, progress) => {
        if (abortRef.current) return;
        setState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            progress,
            stageResults: { ...prev.stageResults, [stage]: output.result },
          };
        });
      },
      onError: (stage, errorMsg) => {
        if (abortRef.current) return;
        console.error(`Stage ${stage} failed:`, errorMsg);
      },
    });

    if (abortRef.current) return;
    setState(pipelineState);
    setRunning(false);

    if (pipelineState.status === 'completed') {
      // Refresh to pick up saved chapter content
      router.refresh();
    } else if (pipelineState.status === 'error') {
      setError(pipelineState.errors.join('\n') || 'Pipeline failed');
    }
  };

  return (
    <div className="space-y-8">
      {/* Warning: No provider configured */}
      {!checkingStatus && !canStart && (
        <div className="border border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/50 p-4 text-sm">
          <p className="font-medium text-yellow-800 dark:text-yellow-300">尚未配置 LLM 服务商</p>
          <p className="text-yellow-700 dark:text-yellow-400 text-xs mt-1">
            请先在「设置」中配置至少一个 LLM 服务商（如 OpenAI、Anthropic、DeepSeek），才能开始创作。
          </p>
        </div>
      )}

      {/* Pipeline control */}
      <div className="card-editorial">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="label-editorial text-muted">创作流水线</p>
            <p className="text-sm text-muted mt-1">
              下一个章节: 第{nextChapter}章
              {state?.status === 'running' && state.currentStage && (
                <span className="ml-2">· {STAGE_NAMES[state.currentStage]}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {running && (
              <button
                onClick={() => { abortRef.current = true; setRunning(false); }}
                className="btn-editorial text-xs"
              >
                停止
              </button>
            )}
            <button
              onClick={handleStart}
              disabled={running || !canStart}
              className={`btn-editorial-primary text-xs ${running || !canStart ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {running ? `创作中... ${state?.progress || 0}%` : '开始创作'}
            </button>
          </div>
        </div>

        {/* Stage grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {PIPELINE_STAGES.map((stage) => {
            const stageProgress = STAGE_PROGRESS[stage];
            const currentProgress = state?.progress || 0;
            const isCompleted = state?.status === 'completed' || currentProgress > stageProgress;
            const isCurrent = state?.currentStage === stage && running;
            return (
              <div key={stage} className={`border p-3 text-center transition-colors ${
                isCompleted ? 'border-foreground bg-foreground text-background' :
                isCurrent ? 'border-foreground bg-foreground/5 animate-pulse' :
                'border-border text-muted'
              }`}>
                <span className="font-mono text-xs opacity-50">{String(STAGE_PROGRESS[stage]).padStart(2, '0')}%</span>
                <p className="text-xs mt-1">{STAGE_NAMES[stage]}</p>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        {state && (
          <div className="mt-4">
            <div className="w-full h-1.5 bg-border/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-foreground transition-all duration-500"
                style={{ width: `${state.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="card-editorial border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/50">
          <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">创作失败</p>
          <p className="text-xs text-red-700 dark:text-red-400 whitespace-pre-wrap">{error}</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-2">
            请检查：1) LLM服务商是否已配置 2) API Key是否有效 3) 网络连接是否正常
          </p>
        </div>
      )}

      {/* Completed result */}
      {state?.status === 'completed' && state.stageResults.de_ai?.correctedText && (
        <div className="card-editorial">
          <div className="flex items-center justify-between mb-3">
            <p className="label-editorial text-muted">创作结果</p>
            <span className="text-xs text-muted">
              {state.stageResults.de_ai.correctedText.length} 字
              · Token: {state.tokenUsage.promptTokens + state.tokenUsage.completionTokens}
            </span>
          </div>
          <div className="border border-border p-4 max-h-96 overflow-y-auto">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {state.stageResults.de_ai.correctedText}
            </p>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                const text = state.stageResults.de_ai.correctedText;
                navigator.clipboard.writeText(text);
              }}
              className="btn-editorial text-xs"
            >
              复制全文
            </button>
            <button
              onClick={() => router.push(`/editor?bookId=${bookId}&num=${nextChapter}`)}
              className="btn-editorial-primary text-xs"
            >
              前往编辑
            </button>
          </div>
        </div>
      )}

      {/* Quality gates */}
      {state?.stageResults.review && (
        <div className="card-editorial">
          <p className="label-editorial text-muted mb-3">质量评估</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(state.stageResults.review.grades || {}).map(([key, grade]: [string, any]) => (
              <div key={key} className="border border-border p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs">{key}</span>
                  <span className="font-mono text-sm">{grade.score}/10</span>
                </div>
                <p className="text-[10px] text-muted">{grade.comment}</p>
              </div>
            ))}
          </div>
          {state.stageResults.review.strengths?.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] text-muted mb-1">亮点</p>
              <ul className="text-xs list-disc list-inside">
                {state.stageResults.review.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Token usage */}
      {state && state.tokenUsage.promptTokens > 0 && (
        <div className="card-editorial">
          <p className="label-editorial text-muted mb-3">资源消耗</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="font-mono text-lg">{state.tokenUsage.promptTokens.toLocaleString()}</p>
              <p className="text-xs text-muted">输入 Token</p>
            </div>
            <div>
              <p className="font-mono text-lg">{state.tokenUsage.completionTokens.toLocaleString()}</p>
              <p className="text-xs text-muted">输出 Token</p>
            </div>
            <div>
              <p className="font-mono text-lg">{(state.tokenUsage.promptTokens + state.tokenUsage.completionTokens).toLocaleString()}</p>
              <p className="text-xs text-muted">总计</p>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline errors (non-fatal) */}
      {state?.errors && state.errors.length > 0 && (
        <div className="card-editorial border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/50">
          <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300 mb-2">部分阶段有问题</p>
          <div className="space-y-1">
            {state.errors.map((e, i) => (
              <p key={i} className="text-xs text-yellow-700 dark:text-yellow-400">{e}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
