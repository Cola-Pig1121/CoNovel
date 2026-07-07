import type { StageSpec, StageRun } from '@/lib/types'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface StageDetailProps {
  stage: StageSpec
  stageRun?: StageRun
  onClose?: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncate(str: string, maxLen = 200): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen) + '...'
}

function formatDuration(startedAt?: string, completedAt?: string): string {
  if (!startedAt) return '—'
  const start = new Date(startedAt).getTime()
  const end = completedAt ? new Date(completedAt).getTime() : Date.now()
  const ms = end - start
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const mins = Math.floor(ms / 60000)
  const secs = Math.floor((ms % 60000) / 1000)
  return `${mins}m ${secs}s`
}

function formatJson(obj: unknown): string {
  if (obj == null) return ''
  if (typeof obj === 'string') return obj
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}

// ---------------------------------------------------------------------------
// Status styling
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-muted',
  running: 'text-foreground',
  completed: 'text-foreground',
  failed: 'text-foreground',
  skipped: 'text-muted',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StageDetail({ stage, stageRun, onClose }: StageDetailProps) {
  const status = stageRun?.status ?? 'pending'

  return (
    <div className="border border-border p-6 rounded-none">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-serif text-lg">{stage.id}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className={`text-[10px] uppercase tracking-[0.2em] ${STATUS_COLORS[status]}`}>
              {status}
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
              {stage.type}
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
              agent: {stage.agent}
            </span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors text-lg leading-none"
            title="关闭详情"
          >
            ×
          </button>
        )}
      </div>

      {/* Duration */}
      {stageRun?.startedAt && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
            耗时
          </div>
          <div className="text-sm font-mono">
            {formatDuration(stageRun.startedAt, stageRun.completedAt)}
          </div>
        </div>
      )}

      {/* Prompt */}
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
          提示词
        </div>
        <div className="text-xs text-muted border border-border p-3 rounded-none bg-foreground/[0.02] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
          {truncate(stage.prompt, 300)}
        </div>
      </div>

      {/* Tools */}
      {stage.tools && stage.tools.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
            工具
          </div>
          <div className="flex flex-wrap gap-1">
            {stage.tools.map((tool) => (
              <span
                key={tool}
                className="border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-muted"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* From / dependencies */}
      {stage.from && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
            依赖
          </div>
          <div className="text-xs font-mono text-muted">
            {Array.isArray(stage.from) ? stage.from.join(', ') : stage.from}
          </div>
        </div>
      )}

      {/* Error */}
      {stageRun?.error && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
            错误
          </div>
          <div className="text-xs border border-border p-3 rounded-none bg-foreground/10 text-foreground whitespace-pre-wrap max-h-24 overflow-y-auto">
            {stageRun.error}
          </div>
        </div>
      )}

      {/* Output */}
      {stageRun?.output && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
            输出
          </div>
          <div className="text-xs text-muted border border-border p-3 rounded-none bg-foreground/[0.02] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
            {truncate(formatJson(stageRun.output), 500)}
          </div>
        </div>
      )}

      {/* Tasks */}
      {stageRun?.tasks && stageRun.tasks.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-2">
            任务 ({stageRun.tasks.length})
          </div>
          <div className="space-y-2">
            {stageRun.tasks.map((task) => (
              <div
                key={task.id}
                className="border border-border p-3 rounded-none"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{task.id}</span>
                  <span className={`text-[10px] uppercase tracking-[0.2em] ${STATUS_COLORS[task.status]}`}>
                    {task.status}
                  </span>
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
                  {task.agent}
                </div>
                {task.error && (
                  <div className="mt-1 text-[10px] text-muted">
                    错误: {truncate(task.error, 120)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loop-specific info */}
      {stage.type === 'loop' && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
            循环条件
          </div>
          <div className="text-xs font-mono text-muted">
            {stage.until ? `until: ${stage.until}` : '无条件'}
            {stage.maxRounds != null && ` (max: ${stage.maxRounds} rounds)`}
          </div>
        </div>
      )}

      {/* Foreach-specific info */}
      {stage.type === 'foreach' && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
            遍历对象
          </div>
          <div className="text-xs font-mono text-muted">
            {stage.fromPath ?? stage.from ?? '无'}
          </div>
          {stage.each && (
            <div className="mt-1 text-xs text-muted border border-border p-2 rounded-none font-mono whitespace-pre-wrap max-h-20 overflow-y-auto">
              {truncate(stage.each.prompt, 200)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
