import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import type {
  WorkflowSpec,
  WorkflowRun,
  StageSpec,
  StageRun,
} from '@/lib/types'
import { workflowApi, booksApi } from '@/lib/api'
import WorkflowList from '@/components/workflow/WorkflowList'
import WorkflowGraph from '@/components/workflow/WorkflowGraph'
import StageDetail from '@/components/workflow/StageDetail'

// ---------------------------------------------------------------------------
// Fallback demo workflows (used when backend is unreachable)
// ---------------------------------------------------------------------------

const DEMO_WORKFLOWS: WorkflowSpec[] = [
  {
    schemaVersion: 1,
    name: 'chapter-production',
    description:
      'Full chapter production pipeline — from context assembly through de-AI editing.',
    defaults: { agent: 'narrative_writer', readOnly: false, tools: [] },
    artifactGraph: {
      stages: [
        { id: 'context_assembly', type: 'single', agent: 'story_architect', prompt: 'Assemble context from world, characters, and outline.' },
        { id: 'character_reasoning', type: 'single', agent: 'character_intelligence', prompt: 'Reason about character states and motivations.' },
        { id: 'writing', type: 'single', agent: 'narrative_writer', prompt: 'Write the chapter draft.' },
        { id: 'event_recording', type: 'single', agent: 'observer', prompt: 'Record plot events and timeline entries.' },
        { id: 'quality_gate', type: 'single', agent: 'fact_checker', prompt: 'Run fact-check and continuity validation.' },
        { id: 'character_intelligence', type: 'single', agent: 'character_intelligence', prompt: 'Verify character consistency.' },
        { id: 'review', type: 'single', agent: 'reviewer', prompt: 'Editorial review of draft quality.' },
        { id: 'editing', type: 'single', agent: 'editor', prompt: 'Apply editorial revisions.' },
        { id: 'de_ai', type: 'single', agent: 'de_ai_editor', prompt: 'Remove AI-typical patterns from text.' },
        { id: 'reflector', type: 'single', agent: 'reflector', prompt: 'Reflect on chapter outcomes and update strategy.' },
        { id: 'state_sync', type: 'single', agent: 'observer', prompt: 'Sync all state changes to book store.' },
      ],
    },
  },
  {
    schemaVersion: 1,
    name: 'novel-init',
    description:
      'Initialize a new novel — world settings, character design, and full outline.',
    defaults: { agent: 'story_architect', readOnly: false, tools: [] },
    artifactGraph: {
      stages: [
        { id: 'premise_analysis', type: 'single', agent: 'story_architect', prompt: 'Analyze the premise and identify core themes.' },
        { id: 'world_building', type: 'single', agent: 'story_architect', prompt: 'Construct the world settings and rules.' },
        { id: 'character_design', type: 'dag', agent: 'character_designer', prompt: 'Design all major characters.', stages: [
          { id: 'protagonist_design', type: 'single', agent: 'character_designer', prompt: 'Design protagonist profile.' },
          { id: 'antagonist_design', type: 'single', agent: 'character_designer', prompt: 'Design antagonist profile.' },
        ]},
        { id: 'outline_generation', type: 'loop', agent: 'story_architect', prompt: 'Generate chapter outline iteratively.', until: 'outline complete', maxRounds: 5 },
        { id: 'validation', type: 'single', agent: 'reviewer', prompt: 'Validate outline coherence.' },
      ],
    },
  },
  {
    schemaVersion: 1,
    name: 'style-learning',
    description:
      'Analyze a reference text and produce a style profile for the writing agent.',
    defaults: { agent: 'style_analyzer', readOnly: true, tools: ['file_read'] },
    artifactGraph: {
      stages: [
        { id: 'read_source', type: 'single', agent: 'style_analyzer', prompt: 'Read and parse the source text.' },
        { id: 'analyze_patterns', type: 'single', agent: 'style_analyzer', prompt: 'Identify style patterns and constraints.' },
        { id: 'build_profile', type: 'single', agent: 'style_analyzer', prompt: 'Build the StyleProfile JSON.' },
      ],
    },
  },
  {
    schemaVersion: 1,
    name: 'review-cycle',
    description:
      'Multi-round review and editing cycle with de-AI pass.',
    defaults: { agent: 'reviewer', readOnly: false, tools: [] },
    artifactGraph: {
      stages: [
        { id: 'review_round', type: 'loop', agent: 'reviewer', prompt: 'Review chapter for issues.', until: 'no critical issues', maxRounds: 3 },
        { id: 'edit', type: 'single', agent: 'editor', prompt: 'Apply revisions from review.' },
        { id: 'de_ai', type: 'single', agent: 'de_ai_editor', prompt: 'De-AI pass on edited text.' },
        { id: 'final_check', type: 'single', agent: 'fact_checker', prompt: 'Final continuity and fact check.' },
      ],
    },
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function elapsed(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime()
  if (ms < 0) return '0s'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`
  const mins = Math.floor(ms / 60000)
  const secs = Math.floor((ms % 60000) / 1000)
  return `${mins}m ${secs}s`
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function Workflow() {
  // State
  const [workflows, setWorkflows] = useState<WorkflowSpec[]>(DEMO_WORKFLOWS)
  const [books, setBooks] = useState<{ id: string; title: string }[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null)
  const [currentRun, setCurrentRun] = useState<WorkflowRun | null>(null)
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [elapsedTime, setElapsedTime] = useState('0s')
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load workflows and books on mount
  useEffect(() => {
    workflowApi.listWorkflows().then(setWorkflows).catch(() => {
      // use demo workflows as fallback
    })
    booksApi.list().then((list) => {
      setBooks(list.map((b) => ({ id: b.id, title: b.title })))
    }).catch(() => {})
  }, [])

  // Polling for running workflows
  useEffect(() => {
    if (currentRun && (currentRun.status === 'running' || currentRun.status === 'paused')) {
      pollingRef.current = setInterval(() => {
        workflowApi.getRunStatus(currentRun.id).then((updated) => {
          setCurrentRun(updated)
          if (updated.status !== 'running' && updated.status !== 'paused') {
            setRuns((prev) =>
              prev.map((r) => (r.id === updated.id ? updated : r))
            )
          }
        }).catch(() => {})
      }, 2000)
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [currentRun?.id, currentRun?.status])

  // Elapsed timer
  useEffect(() => {
    if (!currentRun?.startedAt || currentRun.status === 'completed' || currentRun.status === 'failed') return
    const id = setInterval(() => {
      setElapsedTime(elapsed(currentRun.startedAt))
    }, 1000)
    return () => clearInterval(id)
  }, [currentRun?.startedAt, currentRun?.status])

  // Handlers
  const handleRunWorkflow = useCallback(
    async (name: string, bookId: string) => {
      try {
        const run = await workflowApi.startWorkflow(name, bookId)
        setCurrentRun(run)
        setRuns((prev) => [run, ...prev])
        setSelectedStage(null)
      } catch (err) {
        console.error('Failed to start workflow:', err)
      }
    },
    [],
  )

  const handlePause = useCallback(async () => {
    if (!currentRun) return
    try {
      await workflowApi.pauseRun(currentRun.id)
      setCurrentRun({ ...currentRun, status: 'paused' })
      setRuns((prev) =>
        prev.map((r) => (r.id === currentRun.id ? { ...r, status: 'paused' as const } : r)),
      )
    } catch (err) {
      console.error('Failed to pause:', err)
    }
  }, [currentRun])

  const handleResume = useCallback(async () => {
    if (!currentRun) return
    try {
      await workflowApi.resumeRun(currentRun.id)
      setCurrentRun({ ...currentRun, status: 'running' })
      setRuns((prev) =>
        prev.map((r) => (r.id === currentRun.id ? { ...r, status: 'running' as const } : r)),
      )
    } catch (err) {
      console.error('Failed to resume:', err)
    }
  }, [currentRun])

  const handleCancel = useCallback(async () => {
    if (!currentRun) return
    try {
      await workflowApi.cancelRun(currentRun.id)
      setCurrentRun({ ...currentRun, status: 'failed' })
      setRuns((prev) =>
        prev.map((r) => (r.id === currentRun.id ? { ...r, status: 'failed' as const } : r)),
      )
    } catch (err) {
      console.error('Failed to cancel:', err)
    }
  }, [currentRun])

  // Derived
  const activeWorkflow = workflows.find((w) => w.name === selectedWorkflow)
  const stages: StageSpec[] = activeWorkflow?.artifactGraph.stages ?? []
  const stageRuns: StageRun[] = currentRun?.stages ?? []

  const completedCount = stageRuns.filter((s) => s.status === 'completed').length
  const totalStages = stages.length
  const progressPct = totalStages > 0 ? Math.round((completedCount / totalStages) * 100) : 0

  const selectedStageSpec = stages.find((s) => s.id === selectedStage)
  const selectedStageRun = stageRuns.find((s) => s.stageId === selectedStage)

  const isRunning = currentRun?.status === 'running'
  const isPaused = currentRun?.status === 'paused'
  const isActive = isRunning || isPaused

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-8 py-6 shrink-0">
        <Link to="/" className="text-[10px] uppercase tracking-[0.2em] text-muted hover:text-foreground transition-colors">
          ← 首页
        </Link>
        <h1 className="font-serif text-3xl">工作流面板</h1>
        <p className="text-muted text-sm mt-1">
          可视化工作流编排与监控
        </p>
      </header>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel — Workflow List */}
        <WorkflowList
          workflows={workflows}
          runs={runs}
          selectedWorkflow={selectedWorkflow}
          onSelectWorkflow={setSelectedWorkflow}
          onRunWorkflow={handleRunWorkflow}
          books={books}
        />

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeWorkflow ? (
            <>
              {/* Graph area */}
              <div className="flex-1 overflow-auto px-8 py-6">
                {/* Workflow title bar */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-serif text-xl">{activeWorkflow.name}</h2>
                    <p className="text-xs text-muted mt-1">
                      {activeWorkflow.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
                      {totalStages} 个阶段
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
                      agent: {activeWorkflow.defaults.agent}
                    </div>
                    {activeWorkflow.defaults.readOnly && (
                      <span className="border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-muted">
                        只读
                      </span>
                    )}
                  </div>
                </div>

                {/* Graph */}
                {stages.length > 0 ? (
                  <WorkflowGraph
                    stages={stages}
                    stageRuns={stageRuns}
                    onStageClick={setSelectedStage}
                  />
                ) : (
                  <div className="border border-border p-8 text-center">
                    <p className="text-muted text-sm">未定义阶段</p>
                  </div>
                )}

                {/* Stage Detail */}
                {selectedStageSpec && (
                  <div className="mt-6">
                    <StageDetail
                      stage={selectedStageSpec}
                      stageRun={selectedStageRun}
                      onClose={() => setSelectedStage(null)}
                    />
                  </div>
                )}
              </div>

              {/* Bottom bar — Progress */}
              <div className="border-t border-border px-8 py-4 shrink-0">
                <div className="flex items-center justify-between">
                  {/* Left: progress info */}
                  <div className="flex items-center gap-6">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
                        进度
                      </div>
                      <div className="text-sm font-medium">
                        {completedCount} / {totalStages}
                        <span className="text-muted ml-2">
                          ({progressPct}%)
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-48 h-1.5 border border-border overflow-hidden">
                      <div
                        className="h-full bg-foreground transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    {/* Elapsed */}
                    {currentRun?.startedAt && (
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
                          已用时
                        </div>
                        <div className="text-sm font-mono">{elapsedTime}</div>
                      </div>
                    )}

                    {/* Run status */}
                    {currentRun && (
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
                          状态
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-none ${
                              isRunning
                                ? 'bg-foreground animate-pulse'
                                : isPaused
                                ? 'bg-muted/40'
                                : currentRun.status === 'completed'
                                ? 'bg-foreground'
                                : currentRun.status === 'failed'
                                ? 'bg-foreground'
                                : 'bg-muted/30'
                            }`}
                          />
                          <span className="text-sm capitalize">
                            {currentRun.status}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: action buttons */}
                  <div className="flex items-center gap-3">
                    {isRunning && (
                      <button
                        onClick={handlePause}
                        className="text-xs uppercase tracking-widest border border-border px-4 py-2 hover:border-foreground transition-colors"
                      >
                        暂停
                      </button>
                    )}
                    {isPaused && (
                      <button
                        onClick={handleResume}
                        className="text-xs uppercase tracking-widest border border-foreground px-4 py-2 bg-foreground text-background hover:bg-transparent hover:text-foreground transition-colors"
                      >
                        恢复
                      </button>
                    )}
                    {isActive && (
                      <button
                        onClick={handleCancel}
                        className="text-xs uppercase tracking-widest border border-border px-4 py-2 hover:border-foreground hover:text-foreground text-muted transition-colors"
                      >
                        取消
                      </button>
                    )}
                    {!currentRun && (
                      <span className="text-xs text-muted">
                        选择一个工作流并点击运行开始
                      </span>
                    )}
                    {currentRun && !isActive && currentRun.status !== 'completed' && (
                      <span className="text-xs text-muted">
                        运行结束
                      </span>
                    )}
                    {currentRun?.status === 'completed' && (
                      <span className="text-xs text-foreground">
                        已完成
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl text-muted/20 mb-4">⬡</div>
                <h3 className="font-serif text-xl mb-2">未选择工作流</h3>
                <p className="text-sm text-muted max-w-xs mx-auto">
                  从侧边栏选择一个工作流，查看其图表并对某本书运行。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
