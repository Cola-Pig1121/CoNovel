import { useEffect, useState } from 'react'
import { useBookStore } from '@/stores/bookStore'
import { pipelineApi } from '@/lib/api'
import type { PipelineState } from '@/lib/types'

export default function Evolution() {
  const { currentBook, chapters, fetchBook, fetchChapters } = useBookStore()
  const [pipelineState, setPipelineState] = useState<PipelineState | null>(null)

  const bookId = currentBook?.id

  useEffect(() => {
    if (bookId) {
      fetchBook(bookId)
      fetchChapters(bookId)
      pipelineApi
        .status(bookId)
        .then((ps) => setPipelineState(ps))
        .catch(() => {})
    }
  }, [bookId, fetchBook, fetchChapters])

  const totalChaptersWritten = chapters.filter((ch) => ch.wordCount > 0).length
  const completedRuns = pipelineState?.stages.filter((s) => s.status === 'completed').length ?? 0
  const createdDate = currentBook?.createdAt
    ? new Date(currentBook.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-8 py-6">
        <h1 className="font-serif text-3xl">Evolution Tracking</h1>
        <p className="text-muted text-sm mt-1">
          Track performance, style drift, and learning progress over time
        </p>
      </header>

      <main className="px-8 py-8 space-y-12">
        {/* Book Overview */}
        <section>
          <div className="border border-border p-6 rounded-none">
            <h2 className="font-serif text-xl mb-2">Book Overview</h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-6">
              Current manuscript statistics
            </p>

            {!currentBook ? (
              <p className="text-sm text-muted">
                No book selected. Open a manuscript from the Dashboard to view evolution data.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div className="border border-border/50 p-5 rounded-none">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
                    Title
                  </span>
                  <span className="font-serif text-lg">{currentBook.title}</span>
                </div>
                <div className="border border-border/50 p-5 rounded-none">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
                    Created
                  </span>
                  <span className="text-sm">{createdDate ?? 'Unknown'}</span>
                </div>
                <div className="border border-border/50 p-5 rounded-none">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
                    Chapters Written
                  </span>
                  <span className="text-sm tabular-nums">
                    {totalChaptersWritten}
                    <span className="text-muted">
                      {' '}/ {currentBook.totalChapters}
                    </span>
                  </span>
                </div>
                <div className="border border-border/50 p-5 rounded-none">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
                    Word Count
                  </span>
                  <span className="text-sm tabular-nums">
                    {currentBook.currentWordCount.toLocaleString()}
                    <span className="text-muted">
                      {' '}/ {currentBook.targetWordCount.toLocaleString()}
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Pipeline Runs */}
        <section>
          <div className="border border-border p-6 rounded-none">
            <h2 className="font-serif text-xl mb-2">Pipeline Runs</h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-6">
              Agent pipeline execution history
            </p>

            <div className="border border-border/50 p-5 rounded-none">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-sm">Stages completed</span>
                <span className="text-sm tabular-nums font-sans">{completedRuns}</span>
              </div>
              {pipelineState && (
                <div className="flex items-baseline justify-between">
                  <span className="text-sm">Last run</span>
                  <span className="text-sm text-muted">
                    {pipelineState.startedAt
                      ? new Date(pipelineState.startedAt).toLocaleString()
                      : 'No runs yet'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Evolution Placeholders */}
        <section>
          <div className="border border-border p-6 rounded-none">
            <h2 className="font-serif text-xl mb-2">Style Evolution</h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-4">
              Prose quality & consistency
            </p>
            <div className="border border-border/50 p-8 rounded-none text-center">
              <p className="text-sm text-muted leading-relaxed max-w-lg mx-auto">
                Style tracking will become available once multiple pipeline runs have completed.
                It will visualize how the writing style evolves across chapters, including readability
                scores, vocabulary richness, sentence complexity, and alignment with your reference
                style profile.
              </p>
              {completedRuns < 2 && (
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted mt-4">
                  Requires at least 2 completed pipeline runs ({completedRuns} so far)
                </p>
              )}
            </div>
          </div>
        </section>

        <section>
          <div className="border border-border p-6 rounded-none">
            <h2 className="font-serif text-xl mb-2">Performance Metrics</h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-4">
              Quantitative measurements
            </p>
            <div className="border border-border/50 p-8 rounded-none text-center">
              <p className="text-sm text-muted leading-relaxed max-w-lg mx-auto">
                Performance dashboards will display token usage, latency, cost analysis, and
                throughput metrics across all agents and pipeline runs.
              </p>
              {completedRuns < 2 && (
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted mt-4">
                  Requires at least 2 completed pipeline runs ({completedRuns} so far)
                </p>
              )}
            </div>
          </div>
        </section>

        <section>
          <div className="border border-border p-6 rounded-none">
            <h2 className="font-serif text-xl mb-2">Learning History</h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-4">
              Prompt & memory evolution
            </p>
            <div className="border border-border/50 p-8 rounded-none text-center">
              <p className="text-sm text-muted leading-relaxed max-w-lg mx-auto">
                Learning history will provide a changelog of memory updates, prompt refinements,
                and constraint adjustments, with diffs showing how the system has adapted over time.
              </p>
              {completedRuns < 2 && (
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted mt-4">
                  Requires at least 2 completed pipeline runs ({completedRuns} so far)
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
