import type { StageSpec, StageRun } from '@/lib/types'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface WorkflowGraphProps {
  stages: StageSpec[]
  stageRuns: StageRun[]
  onStageClick?: (stageId: string) => void
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

function getStageStatus(stageId: string, runs: StageRun[]): StageStatus {
  const run = runs.find((r) => r.stageId === stageId)
  if (!run) return 'pending'
  return run.status
}

const STATUS_BORDER: Record<StageStatus, string> = {
  pending: 'border-border',
  running: 'border-foreground',
  completed: 'border-foreground',
  failed: 'border-foreground',
  skipped: 'border-muted/40',
}

const STATUS_BG: Record<StageStatus, string> = {
  pending: '',
  running: '',
  completed: 'bg-foreground/5',
  failed: 'bg-foreground/10',
  skipped: 'bg-muted/5',
}

const STATUS_INDICATOR: Record<StageStatus, string> = {
  pending: 'bg-muted/30',
  running: 'bg-foreground animate-pulse',
  completed: 'bg-foreground',
  failed: 'bg-foreground',
  skipped: 'bg-muted/40',
}

const STATUS_LABEL: Record<StageStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Done',
  failed: 'Failed',
  skipped: 'Skipped',
}

// ---------------------------------------------------------------------------
// Stage Type Icons
// ---------------------------------------------------------------------------

function stageTypeIcon(type: StageSpec['type']): string {
  switch (type) {
    case 'single':
      return '■'
    case 'foreach':
      return '↻'
    case 'reduce':
      return '⊕'
    case 'loop':
      return '⟳'
    case 'dag':
      return '⬡'
    case 'dynamic':
      return '◇'
    default:
      return '■'
  }
}

// ---------------------------------------------------------------------------
// Graph Renderer
// ---------------------------------------------------------------------------

export default function WorkflowGraph({
  stages,
  stageRuns,
  onStageClick,
}: WorkflowGraphProps) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex items-center gap-0 min-w-max py-4 px-2">
        {stages.map((stage, i) => {
          const status = getStageStatus(stage.id, stageRuns)

          return (
            <div key={stage.id} className="flex items-center">
              {/* Stage Box */}
              <button
                onClick={() => onStageClick?.(stage.id)}
                className={`border p-4 rounded-none min-w-[160px] text-left transition-colors group cursor-pointer ${STATUS_BORDER[status]} ${STATUS_BG[status]} hover:border-foreground`}
              >
                {/* Top row: type icon + status */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted">{stageTypeIcon(stage.type)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
                      {STATUS_LABEL[status]}
                    </span>
                    <span className={`w-2 h-2 rounded-none shrink-0 ${STATUS_INDICATOR[status]}`} />
                  </div>
                </div>

                {/* Stage name */}
                <div className="text-sm font-medium text-foreground mb-1 group-hover:underline underline-offset-2">
                  {stage.id}
                </div>

                {/* Agent */}
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
                  {stage.agent}
                </div>

                {/* Stage type badge */}
                <div className="mt-2 inline-block border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-muted">
                  {stage.type}
                </div>

                {/* Sub-stages indicator for dag/loop/foreach */}
                {(stage.type === 'dag' || stage.type === 'loop' || stage.type === 'foreach') &&
                  stage.stages && (
                    <div className="mt-2 text-[10px] text-muted">
                      {stage.stages.length} sub-stages
                    </div>
                  )}

                {/* Error preview */}
                {status === 'failed' && (
                  <div className="mt-2 text-[10px] text-muted truncate">
                    Error occurred
                  </div>
                )}
              </button>

              {/* Arrow connector */}
              {i < stages.length - 1 && (
                <div className="flex items-center px-1">
                  <svg
                    width="28"
                    height="12"
                    viewBox="0 0 28 12"
                    fill="none"
                    className="text-muted shrink-0"
                  >
                    <path
                      d="M0 6H24M24 6L19 1M24 6L19 11"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                  </svg>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Vertical Graph Variant (for nested stages)
// ---------------------------------------------------------------------------

export function WorkflowGraphVertical({
  stages,
  stageRuns,
  onStageClick,
}: WorkflowGraphProps) {
  return (
    <div className="flex flex-col items-start gap-0 py-4 pl-4">
      {stages.map((stage, i) => {
        const status = getStageStatus(stage.id, stageRuns)

        return (
          <div key={stage.id} className="flex flex-col items-start">
            {/* Stage Box */}
            <button
              onClick={() => onStageClick?.(stage.id)}
              className={`border p-3 rounded-none min-w-[140px] text-left transition-colors group cursor-pointer ${STATUS_BORDER[status]} ${STATUS_BG[status]} hover:border-foreground`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
                  {STATUS_LABEL[status]}
                </span>
                <span className={`w-1.5 h-1.5 rounded-none shrink-0 ${STATUS_INDICATOR[status]}`} />
              </div>
              <div className="text-xs font-medium text-foreground mb-0.5 group-hover:underline underline-offset-2">
                {stage.id}
              </div>
              <div className="text-[10px] text-muted">
                {stage.agent}
              </div>
            </button>

            {/* Down arrow */}
            {i < stages.length - 1 && (
              <div className="flex justify-start pl-6 py-1">
                <svg
                  width="12"
                  height="20"
                  viewBox="0 0 12 20"
                  fill="none"
                  className="text-muted"
                >
                  <path
                    d="M6 0V16M6 16L1 11M6 16L11 11"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                </svg>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
