import { useAgentStore } from '@/stores/agentStore'

const STAGES = [
  'Context Assembly',
  'Character Reasoning',
  'Writing',
  'Event Recording',
  'Quality Gate',
  'Character Intelligence',
  'Review',
  'Editing',
  'De-AI',
  'Reflector',
  'State Sync',
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
  const { pipelineState } = useAgentStore()

  const findStage = (stageName: string) =>
    pipelineState?.stages?.find((s) => s.stage === stageName)

  const stageStatuses: StageStatus[] = STAGES.map((stage) => {
    const state = findStage(stage)
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
        <h1 className="font-serif text-3xl">Pipeline Monitor</h1>
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
                <div key={stage} className="flex items-center">
                  {/* Stage Box */}
                  <div
                    className={`border p-4 rounded-none min-w-[140px] text-center transition-colors ${STATUS_STYLES[status]}`}
                  >
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
                      {STATUS_LABELS[status]}
                    </div>
                    <div className="text-xs font-medium whitespace-nowrap">
                      {stage}
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
              const detail = findStage(stage)
              return (
                <div
                  key={stage}
                  className="border border-border p-6 rounded-none hover:border-foreground transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-serif text-sm">{stage}</h3>
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
