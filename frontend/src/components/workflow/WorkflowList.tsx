import { useState } from 'react'
import type { WorkflowSpec, WorkflowRun } from '@/lib/types'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface WorkflowListProps {
  workflows: WorkflowSpec[]
  runs: WorkflowRun[]
  selectedWorkflow: string | null
  onSelectWorkflow: (name: string) => void
  onRunWorkflow: (name: string, bookId: string) => void
  books: { id: string; title: string }[]
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const RUN_STATUS_STYLE: Record<string, string> = {
  pending: 'text-muted',
  running: 'text-foreground',
  completed: 'text-foreground',
  failed: 'text-foreground',
  paused: 'text-muted',
}

const RUN_STATUS_INDICATOR: Record<string, string> = {
  pending: 'bg-muted/30',
  running: 'bg-foreground animate-pulse',
  completed: 'bg-foreground',
  failed: 'bg-foreground',
  paused: 'bg-muted/40',
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WorkflowList({
  workflows,
  runs,
  selectedWorkflow,
  onSelectWorkflow,
  onRunWorkflow,
  books,
}: WorkflowListProps) {
  const [expandedRun, setExpandedRun] = useState<string | null>(null)

  return (
    <div className="w-72 shrink-0 border-r border-border h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <h2 className="font-serif text-lg">Workflows</h2>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted mt-1">
          {workflows.length} available
        </p>
      </div>

      {/* Workflow definitions */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted px-2 mb-2">
            Definitions
          </div>
          <div className="space-y-1">
            {workflows.map((wf) => {
              const isSelected = selectedWorkflow === wf.name
              const stageCount = wf.artifactGraph.stages.length

              return (
                <div key={wf.name}>
                  <button
                    onClick={() => onSelectWorkflow(wf.name)}
                    className={`w-full text-left border p-4 rounded-none transition-colors ${
                      isSelected
                        ? 'border-foreground bg-foreground/[0.03]'
                        : 'border-border hover:border-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{wf.name}</span>
                      <span className="text-[10px] text-muted">
                        {stageCount} stage{stageCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed line-clamp-2">
                      {wf.description}
                    </p>
                  </button>

                  {/* Run button with book selection */}
                  {isSelected && (
                    <RunWorkflowInline
                      workflow={wf}
                      books={books}
                      onRun={onRunWorkflow}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-border mx-3" />

        {/* Run history */}
        <div className="px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted px-2 mb-2">
            Recent Runs
          </div>
          <div className="space-y-1">
            {runs.length === 0 && (
              <p className="text-xs text-muted px-2 py-2">No runs yet</p>
            )}
            {runs.map((run) => (
              <div
                key={run.id}
                className="border border-border p-3 rounded-none cursor-pointer hover:border-foreground transition-colors"
                onClick={() =>
                  setExpandedRun(expandedRun === run.id ? null : run.id)
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-none shrink-0 ${RUN_STATUS_INDICATOR[run.status]}`}
                    />
                    <span className="text-xs font-medium">
                      {run.workflowName}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted">
                    {formatTime(run.startedAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-[10px] uppercase tracking-[0.2em] ${RUN_STATUS_STYLE[run.status]}`}>
                    {run.status}
                  </span>
                  <span className="text-[10px] text-muted">
                    {run.stages.filter((s) => s.status === 'completed').length}/
                    {run.stages.length}
                  </span>
                </div>

                {/* Expanded details */}
                {expandedRun === run.id && (
                  <div className="mt-3 border-t border-border pt-3 space-y-1">
                    {run.stages.map((sr) => (
                      <div
                        key={sr.stageId}
                        className="flex items-center justify-between text-[10px]"
                      >
                        <span className="text-muted truncate mr-2">
                          {sr.stageId}
                        </span>
                        <span className={`${RUN_STATUS_STYLE[sr.status]} shrink-0`}>
                          {sr.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inline Run Button
// ---------------------------------------------------------------------------

function RunWorkflowInline({
  workflow,
  books,
  onRun,
}: {
  workflow: WorkflowSpec
  books: { id: string; title: string }[]
  onRun: (name: string, bookId: string) => void
}) {
  const [bookId, setBookId] = useState(books[0]?.id ?? '')

  return (
    <div className="mt-2 border border-border p-3 rounded-none space-y-2">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
        Select Book
      </div>
      <select
        value={bookId}
        onChange={(e) => setBookId(e.target.value)}
        className="w-full border border-border bg-background text-xs px-3 py-2 focus:outline-none focus:border-foreground transition-colors"
      >
        {books.length === 0 && <option value="">No books available</option>}
        {books.map((b) => (
          <option key={b.id} value={b.id}>
            {b.title}
          </option>
        ))}
      </select>
      <button
        onClick={() => {
          if (bookId) onRun(workflow.name, bookId)
        }}
        disabled={!bookId}
        className="w-full text-xs uppercase tracking-widest border border-foreground px-4 py-2 bg-foreground text-background hover:bg-transparent hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Run
      </button>
    </div>
  )
}
