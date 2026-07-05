import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAgentStore } from '@/stores/agentStore'

// Pipeline stages matching the TypeScript PipelineStage type exactly
const STAGES = [
  { id: 'context_assembly', label: 'Context Assembly' },
  { id: 'character_reasoning', label: 'Character Reasoning' },
  { id: 'writing', label: 'Writing' },
  { id: 'event_recording', label: 'Event Recording' },
  { id: 'fact_check', label: 'Fact Check' },
  { id: 'continuity_check', label: 'Continuity Check' },
  { id: 'pacing_check', label: 'Pacing Check' },
  { id: 'character_intelligence_review', label: 'Character Intelligence' },
  { id: 'review_round_1', label: 'Review R1' },
  { id: 'review_round_2', label: 'Review R2' },
  { id: 'review_round_3', label: 'Review R3' },
  { id: 'editing', label: 'Editing' },
  { id: 'de_ai', label: 'De-AI' },
  { id: 'reflector', label: 'Reflector' },
  { id: 'state_sync', label: 'State Sync' },
] as const

type StageStatus = 'pending' | 'running' | 'completed' | 'failed'

const STATUS_STYLES: Record<StageStatus, string> = {
  pending: 'border-border text-muted',
  running: 'border-foreground text-foreground',
  completed: 'border-foreground text-foreground bg-foreground/5',
  failed: 'border-foreground text-foreground bg-foreground/10',
}

const STATUS_LABELS: Record<StageStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Done',
  failed: 'Failed',
}

export default function Pipeline() {
  const [searchParams] = useSearchParams()
  const bookId = searchParams.get('bookId') ?? ''
  const { pipelineState, pipelineRunning, fetchPipelineStatus } = useAgentStore()
  const [polling, setPolling] = useState(false)

  // Detect if any stage is currently running
  const hasRunningStage =
    pipelineState?.activeStage !== null && pipelineState?.activeStage !== undefined

  // On mount, check if a pipeline is active and auto-start polling
  useEffect(() => {
    if (bookId) {
      fetchPipelineStatus(bookId).then(() => {
        const state = useAgentStore.getState().pipelineState
        if (state?.activeStage) {
          setPolling(true)
        }
      })
    }
  }, [bookId, fetchPipelineStatus])

  // Auto-detect running pipeline and start polling
  useEffect(() => {
    if (bookId && (pipelineRunning || hasRunningStage)) {
      setPolling(true)
    }
  }, [bookId, pipelineRunning, hasRunningStage])

  // Poll pipeline status every 3 seconds while running
  useEffect(() => {
    if (!polling || !bookId) return

    const interval = setInterval(() => {
      fetchPipelineStatus(bookId).then(() => {
        // Check if still running
        const state = useAgentStore.getState().pipelineState
        if (!state?.activeStage) {
          setPolling(false)
        }
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [polling, bookId, fetchPipelineStatus])

  const findStage = (stageId: string) =>
    pipelineState?.stages?.find((s) => s.stage === stageId)

  const stageStatuses: StageStatus[] = STAGES.map((stage) => {
    const state = findStage(stage.id)
    if (!state) return 'pending'
    if (state.status === 'running') return 'running'
    if (state.status === 'completed') return 'completed'
    if (state.status === 'failed') return 'failed'
    return 'pending'
  })

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-8 py-6">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-3xl">Pipeline Monitor</h1>
          {polling && (
            <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted">
              <span className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
              Polling every 3s
            </span>
          )}
        </div>
        <p className="text-muted text-sm mt-1">
          Real-time view of the chapter generation pipeline
        </p>
      </header>

      {/* Pipeline Flow */}
      <main className="px-8 py-8">
        {/* Stage flow - horizontal scrolling on smaller screens */}
        <div className="overflow-x-auto pb-4">
          <div className="flex items-center gap-0 min-w-max">
            {STAGES.map((stage, i) => {
              const status = stageStatuses[i] ?? 'pending'
              return (
                <div key={stage.id} className="flex items-center">
                  {/* Stage Box */}
                  <div
                    className={`border p-4 rounded-none min-w-[140px] text-center transition-colors ${STATUS_STYLES[status]}`}
                  >
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
                      {STATUS_LABELS[status]}
                    </div>
                    <div className="text-xs font-medium whitespace-nowrap">
                      {stage.label}
                    </div>
                  </div>

                  {/* Arrow connector */}
                  {i < STAGES.length - 1 && (
                    <div className="flex items-center px-1">
                      <svg
                        width="24"
                        height="12"
                        viewBox="0 0 24 12"
                        fill="none"
                        className="text-muted shrink-0"
                      >
                        <path
                          d="M0 6H20M20 6L15 1M20 6L15 11"
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

        {/* Stage detail cards */}
        <div className="mt-10">
          <h2 className="font-serif text-xl mb-4">Stage Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {STAGES.map((stage, i) => {
              const status = stageStatuses[i] ?? 'pending'
              const detail = findStage(stage.id)
              return (
                <div
                  key={stage.id}
                  className="border border-border p-6 rounded-none hover:border-foreground transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-serif text-sm">{stage.label}</h3>
                    <span
                      className={`w-2 h-2 rounded-none ${
                        status === 'completed'
                          ? 'bg-foreground'
                          : status === 'running'
                          ? 'bg-foreground animate-pulse'
                          : status === 'failed'
                          ? 'bg-foreground'
                          : 'bg-muted/30'
                      }`}
                    />
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-2">
                    {STATUS_LABELS[status]}
                  </p>
                  {detail?.error && (
                    <p className="text-xs text-muted mt-2">{detail.error}</p>
                  )}
                  {detail?.duration != null && (
                    <p className="text-xs text-muted mt-1">
                      Duration: {(detail.duration / 1000).toFixed(1)}s
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
