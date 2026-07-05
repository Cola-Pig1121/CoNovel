import { useState, useCallback, useEffect } from 'react'
import type { Questionnaire, QuestionAnswer, Question } from '@/lib/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuestionDialogProps {
  questionnaire: Questionnaire
  onSubmit: (answers: QuestionAnswer[]) => void
  onCancel: () => void
}

// Single-question local state
interface TabState {
  kind: 'option' | 'custom' | 'multi'
  selectedIndex: number | null
  selectedMulti: Set<number>
  customText: string
  notes: string
  showNotes: boolean
}

function emptyTabState(q: Question): TabState {
  return {
    kind: q.multiSelect ? 'multi' : 'option',
    selectedIndex: null,
    selectedMulti: new Set(),
    customText: '',
    notes: '',
    showNotes: false,
  }
}

// ---------------------------------------------------------------------------
// QuestionDialog
// ---------------------------------------------------------------------------

export default function QuestionDialog({
  questionnaire,
  onSubmit,
  onCancel,
}: QuestionDialogProps) {
  const [tabs, setTabs] = useState<TabState[]>(() =>
    questionnaire.questions.map((q) => emptyTabState(q)),
  )
  const [activeTab, setActiveTab] = useState(0)
  const [showSubmitReview, setShowSubmitReview] = useState(false)

  const questions = questionnaire.questions
  const lastTab = questions.length // submit "tab" index

  // -- Helpers --

  const updateTab = useCallback(
    (idx: number, patch: Partial<TabState>) => {
      setTabs((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)))
    },
    [],
  )

  const buildAnswers = useCallback((): QuestionAnswer[] => {
    return tabs.map((tab, i) => {
      const q = questions[i]!
      if (tab.kind === 'multi') {
        const selected = Array.from(tab.selectedMulti).map((idx) => q.options[idx]?.label ?? '?')
        return {
          questionIndex: i,
          question: q.question,
          kind: 'multi' as const,
          answer: null,
          selected,
          notes: tab.notes || undefined,
        }
      }
      if (tab.kind === 'custom') {
        return {
          questionIndex: i,
          question: q.question,
          kind: 'custom' as const,
          answer: tab.customText || null,
          notes: tab.notes || undefined,
        }
      }
      return {
        questionIndex: i,
        question: q.question,
        kind: 'option' as const,
        answer: tab.selectedIndex !== null ? q.options[tab.selectedIndex]?.label ?? null : null,
        notes: tab.notes || undefined,
      }
    })
  }, [tabs, questions])

  // Keyboard: press N to toggle notes on active tab
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (activeTab >= questions.length) return // on submit tab
      if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        updateTab(activeTab, { showNotes: !(tabs[activeTab]?.showNotes) })
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeTab, tabs, questions.length, updateTab])

  // -- Render --

  const currentTab = activeTab < questions.length ? tabs[activeTab] : null
  const currentQuestion = activeTab < questions.length ? questions[activeTab] : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/10 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-background border border-border w-full max-w-2xl max-h-[85vh] flex flex-col rounded-none shadow-none">
        {/* -- Tab bar -- */}
        <div className="flex border-b border-border shrink-0 overflow-x-auto">
          {questions.map((q, i) => (
            <button
              key={i}
              onClick={() => { setActiveTab(i); setShowSubmitReview(false) }}
              className={`px-4 py-3 text-[10px] uppercase tracking-[0.2em] whitespace-nowrap border-r border-border last:border-r-0 transition-colors ${
                activeTab === i && !showSubmitReview
                  ? 'bg-foreground text-background'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {q.header || `Q${i + 1}`}
            </button>
          ))}
          <button
            onClick={() => { setActiveTab(lastTab); setShowSubmitReview(true) }}
            className={`px-4 py-3 text-[10px] uppercase tracking-[0.2em] whitespace-nowrap transition-colors ${
              showSubmitReview
                ? 'bg-foreground text-background'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Submit
          </button>
        </div>

        {/* -- Content area -- */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {showSubmitReview ? (
            /* ===== Submit Review ===== */
            <div className="p-6">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted mb-6">
                Review Answers
              </h3>
              <div className="space-y-4">
                {tabs.map((tab, i) => {
                  const q = questions[i]
                  if (!q) return null
                  let display: string
                  if (tab.kind === 'multi') {
                    const sel = Array.from(tab.selectedMulti).map((idx) => q.options[idx]?.label ?? '?')
                    display = sel.length > 0 ? sel.join(', ') : '—'
                  } else if (tab.kind === 'custom') {
                    display = tab.customText || '—'
                  } else {
                    display = tab.selectedIndex !== null ? q.options[tab.selectedIndex]?.label ?? '—' : '—'
                  }
                  return (
                    <div key={i} className="border border-border p-4 rounded-none">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
                        {q.header}
                      </div>
                      <div className="text-xs text-muted mb-1">{q.question}</div>
                      <div className="text-sm font-serif">{display}</div>
                      {tab.notes && (
                        <div className="text-xs text-muted mt-2 italic">
                          Notes: {tab.notes}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : currentQuestion && currentTab ? (
            /* ===== Question Tab ===== */
            <div className="p-6">
              {/* Header chip */}
              <div className="mb-4">
                <span className="text-[10px] uppercase tracking-widest bg-foreground text-background px-2 py-0.5 inline-block">
                  {currentQuestion.header}
                </span>
              </div>

              {/* Question text */}
              <p className="font-serif text-lg leading-relaxed mb-6">
                {currentQuestion.question}
              </p>

              {/* Option cards */}
              <div className="space-y-2 mb-4">
                {currentQuestion.options.map((opt, oi) => {
                  if (currentTab.kind === 'multi') {
                    const checked = currentTab.selectedMulti.has(oi)
                    return (
                      <button
                        key={oi}
                        onClick={() => {
                          const next = new Set(currentTab.selectedMulti)
                          if (checked) next.delete(oi)
                          else next.add(oi)
                          updateTab(activeTab, { selectedMulti: next })
                        }}
                        className={`w-full text-left border p-4 rounded-none transition-colors ${
                          checked
                            ? 'border-foreground bg-foreground/[0.04]'
                            : 'border-border hover:border-foreground'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 w-3.5 h-3.5 border shrink-0 flex items-center justify-center ${
                              checked ? 'border-foreground bg-foreground text-background' : 'border-border'
                            }`}
                          >
                            {checked && (
                              <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M2 6l3 3 5-5" />
                              </svg>
                            )}
                          </span>
                          <div>
                            <div className="text-sm font-sans">{opt.label}</div>
                            <div className="text-xs text-muted mt-0.5">{opt.description}</div>
                            {opt.preview && (
                              <pre className="mt-2 text-xs text-muted font-mono whitespace-pre-wrap border border-border p-2 rounded-none max-h-32 overflow-y-auto">
                                {opt.preview}
                              </pre>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  }

                  // Single select
                  const selected = currentTab.selectedIndex === oi
                  return (
                    <button
                      key={oi}
                      onClick={() => {
                        updateTab(activeTab, { selectedIndex: oi, kind: 'option' })
                      }}
                      className={`w-full text-left border p-4 rounded-none transition-colors ${
                        selected
                          ? 'border-foreground bg-foreground/[0.04]'
                          : 'border-border hover:border-foreground'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-1 w-3 h-3 border shrink-0 ${
                            selected ? 'border-foreground bg-foreground' : 'border-border'
                          }`}
                        />
                        <div>
                          <div className="text-sm font-sans">{opt.label}</div>
                          <div className="text-xs text-muted mt-0.5">{opt.description}</div>
                          {opt.preview && (
                            <pre className="mt-2 text-xs text-muted font-mono whitespace-pre-wrap border border-border p-2 rounded-none max-h-32 overflow-y-auto">
                              {opt.preview}
                            </pre>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* "Other" free-text */}
              <div className="mb-4">
                <button
                  onClick={() => {
                    updateTab(activeTab, {
                      kind: 'custom',
                      customText: currentTab.customText || '',
                    })
                  }}
                  className={`w-full text-left border border-border p-3 rounded-none transition-colors ${
                    currentTab.kind === 'custom'
                      ? 'border-foreground bg-foreground/[0.04]'
                      : 'hover:border-foreground'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
                    Other
                  </span>
                </button>
                {currentTab.kind === 'custom' && (
                  <textarea
                    value={currentTab.customText}
                    onChange={(e) => updateTab(activeTab, { customText: e.target.value })}
                    placeholder="Type your answer..."
                    rows={3}
                    className="w-full mt-2 border border-border bg-transparent px-4 py-3 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors placeholder:text-muted resize-none"
                  />
                )}
              </div>

              {/* Notes field */}
              {currentTab.showNotes && (
                <div className="mb-4">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-1">
                    Notes
                  </label>
                  <textarea
                    value={currentTab.notes}
                    onChange={(e) => updateTab(activeTab, { notes: e.target.value })}
                    placeholder="Optional notes..."
                    rows={2}
                    className="w-full border border-border bg-transparent px-4 py-3 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors placeholder:text-muted resize-none"
                  />
                </div>
              )}

              {/* Keyboard hint */}
              <p className="text-[10px] text-muted/60 uppercase tracking-[0.2em]">
                Press <kbd className="border border-border px-1">N</kbd> to toggle notes
              </p>
            </div>
          ) : null}
        </div>

        {/* -- Footer actions -- */}
        <div className="shrink-0 border-t border-border px-6 py-4 flex items-center justify-between">
          <button
            onClick={onCancel}
            className="text-xs uppercase tracking-widest border border-border px-6 py-3 hover:border-foreground transition-colors rounded-none shadow-none text-muted"
          >
            Cancel
          </button>

          <div className="flex gap-2">
            {!showSubmitReview && activeTab > 0 && (
              <button
                onClick={() => setActiveTab((p) => Math.max(0, p - 1))}
                className="text-xs uppercase tracking-widest border border-border px-4 py-3 hover:border-foreground transition-colors rounded-none shadow-none text-muted"
              >
                Prev
              </button>
            )}
            {!showSubmitReview && activeTab < questions.length - 1 && (
              <button
                onClick={() => setActiveTab((p) => p + 1)}
                className="text-xs uppercase tracking-widest border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none"
              >
                Next
              </button>
            )}
            {!showSubmitReview && activeTab === questions.length - 1 && (
              <button
                onClick={() => setShowSubmitReview(true)}
                className="text-xs uppercase tracking-widest border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none"
              >
                Review
              </button>
            )}
            {showSubmitReview && (
              <button
                onClick={() => onSubmit(buildAnswers())}
                className="text-xs uppercase tracking-widest border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none"
              >
                Submit Answers
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
