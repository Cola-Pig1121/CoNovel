import { useEffect, useState } from 'react'
import { useBookStore } from '@/stores/bookStore'
import { pipelineApi, memoryApi } from '@/lib/api'
import type { PipelineState } from '@/lib/types'

export default function Evolution() {
  const { currentBook, chapters, fetchBook, fetchChapters } = useBookStore()
  const [pipelineState, setPipelineState] = useState<PipelineState | null>(null)
  const [styleProfile, setStyleProfile] = useState<any>(null)
  const [longTerm, setLongTerm] = useState<any>(null)
  const [evolutionLog, setEvolutionLog] = useState<string | null>(null)

  const bookId = currentBook?.id

  useEffect(() => {
    if (bookId) {
      fetchBook(bookId)
      fetchChapters(bookId)
      pipelineApi
        .status(bookId)
        .then((ps) => setPipelineState(ps))
        .catch(() => {})

      // Fetch style profile from book style.json
      fetch(`/api/books/${bookId}/style`)
        .then((res) => {
          if (res.ok) return res.json()
          throw new Error('not found')
        })
        .then((data) => setStyleProfile(data))
        .catch(() => {})

      // Fetch long-term memory for style evolution data
      memoryApi
        .getLongTerm(bookId)
        .then((data) => {
          setLongTerm(data)
          if (data?.style_evolution) {
            setEvolutionLog(
              typeof data.style_evolution === 'string'
                ? data.style_evolution
                : JSON.stringify(data.style_evolution, null, 2),
            )
          }
        })
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

        {/* Style Evolution */}
        <section>
          <div className="border border-border p-6 rounded-none">
            <h2 className="font-serif text-xl mb-2">Style Evolution</h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-4">
              Prose quality & consistency
            </p>
            <div className="border border-border/50 p-6 rounded-none">
              {styleProfile ? (
                <div className="space-y-4">
                  {styleProfile.constraints && (
                    <div className="space-y-3">
                      {styleProfile.constraints.dialogueStyle && (
                        <div>
                          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-1">
                            Dialogue Style
                          </span>
                          <p className="text-sm">{styleProfile.constraints.dialogueStyle}</p>
                        </div>
                      )}
                      {styleProfile.constraints.paragraphLength && (
                        <div>
                          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-1">
                            Paragraph Length
                          </span>
                          <p className="text-sm">{styleProfile.constraints.paragraphLength}</p>
                        </div>
                      )}
                      {styleProfile.constraints.tonePattern && (
                        <div>
                          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-1">
                            Tone Pattern
                          </span>
                          <p className="text-sm">{styleProfile.constraints.tonePattern}</p>
                        </div>
                      )}
                      {styleProfile.constraints.avgSentenceLength !== undefined && (
                        <div className="flex items-baseline gap-2">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
                            Avg Sentence Length:
                          </span>
                          <span className="text-sm tabular-nums">
                            {styleProfile.constraints.avgSentenceLength} chars
                          </span>
                        </div>
                      )}
                      {styleProfile.constraints.dialogueRatio !== undefined && (
                        <div className="flex items-baseline gap-2">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
                            Dialogue Ratio:
                          </span>
                          <span className="text-sm tabular-nums">
                            {(styleProfile.constraints.dialogueRatio * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                      {longTerm?.style_evolution && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
                            Style Evolution Data
                          </span>
                          <pre className="text-xs text-muted whitespace-pre-wrap font-mono leading-relaxed border border-border p-4 rounded-none">
                            {typeof longTerm.style_evolution === 'string'
                              ? longTerm.style_evolution
                              : JSON.stringify(longTerm.style_evolution, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                  {!styleProfile.constraints && (
                    <p className="text-sm text-muted">
                      Style profile loaded but no constraint data available.
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted leading-relaxed max-w-lg mx-auto">
                    Run the style-learning workflow first to generate a style profile. The profile
                    captures dialogue style, paragraph length, tone patterns, and vocabulary
                    characteristics from your reference novel.
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted mt-4">
                    Use the Reference tab in Book Detail to analyze a reference novel
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Performance Metrics — word count growth */}
        <section>
          <div className="border border-border p-6 rounded-none">
            <h2 className="font-serif text-xl mb-2">Performance Metrics</h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-4">
              Quantitative measurements
            </p>
            {chapters.length === 0 ? (
              <div className="border border-border/50 p-8 rounded-none text-center">
                <p className="text-sm text-muted leading-relaxed max-w-lg mx-auto">
                  No chapter data available yet. Metrics will appear once chapters are written.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Word count growth chart (text-based) */}
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-3">
                    Word Count Growth
                  </span>
                  <div className="space-y-2">
                    {chapters.map((ch) => {
                      const maxWord = Math.max(...chapters.map((c) => c.wordCount), 1)
                      const pct = Math.round((ch.wordCount / maxWord) * 100)
                      return (
                        <div key={ch.chapterNumber} className="flex items-center gap-3">
                          <span className="text-[10px] tabular-nums text-muted w-6 text-right shrink-0">
                            {String(ch.chapterNumber).padStart(2, '0')}
                          </span>
                          <div className="flex-1 h-4 bg-border/20 rounded-none overflow-hidden">
                            <div
                              className="h-full bg-foreground/20 rounded-none transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] tabular-nums text-muted w-16 text-right shrink-0">
                            {ch.wordCount.toLocaleString()}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-1">
                      Total Words
                    </span>
                    <span className="text-sm tabular-nums font-sans">
                      {chapters.reduce((s, c) => s + c.wordCount, 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-1">
                      Avg per Chapter
                    </span>
                    <span className="text-sm tabular-nums font-sans">
                      {Math.round(
                        chapters.reduce((s, c) => s + c.wordCount, 0) / chapters.length,
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-1">
                      Completion
                    </span>
                    <span className="text-sm tabular-nums font-sans">
                      {currentBook
                        ? `${Math.round((currentBook.currentWordCount / currentBook.targetWordCount) * 100)}%`
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Learning History */}
        <section>
          <div className="border border-border p-6 rounded-none">
            <h2 className="font-serif text-xl mb-2">Learning History</h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-4">
              Prompt & memory evolution
            </p>
            <div className="border border-border/50 p-6 rounded-none">
              {evolutionLog ? (
                <pre className="text-xs text-muted whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
                  {evolutionLog}
                </pre>
              ) : longTerm?.world_facts || longTerm?.active_threads ? (
                <div className="space-y-4">
                  {longTerm.world_facts && longTerm.world_facts.length > 0 && (
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
                        World Facts Accumulated ({longTerm.world_facts.length})
                      </span>
                      <div className="text-sm text-muted">
                        {longTerm.world_facts.length} world facts tracked across chapters
                      </div>
                    </div>
                  )}
                  {longTerm.active_threads && longTerm.active_threads.length > 0 && (
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
                        Active Plot Threads ({longTerm.active_threads.length})
                      </span>
                      <div className="text-sm text-muted">
                        {longTerm.active_threads.length} plot threads being tracked
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted leading-relaxed max-w-lg mx-auto">
                    Learning history will accumulate as the pipeline runs. It tracks memory
                    updates, prompt refinements, and constraint adjustments over time.
                  </p>
                  {completedRuns < 2 && (
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted mt-4">
                      Requires at least 2 completed pipeline runs ({completedRuns} so far)
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
