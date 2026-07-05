import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEditorStore } from '@/stores/editorStore'
import { useBookStore } from '@/stores/bookStore'
import FloatingToolbar from '@/components/editor/FloatingToolbar'
import LexicalEditor from '@/components/editor/LexicalEditor'
import Skeleton from '@/components/ui/Skeleton'
import { chaptersApi, toolsApi } from '@/lib/api'
import type { Volume } from '@/lib/types'
import ChatPanel from '@/components/ai/ChatPanel'

// ---------------------------------------------------------------------------
// Directory Tree — Volume > Chapter hierarchy
// ---------------------------------------------------------------------------

function DirectoryTree({ volumes }: { volumes: Volume[] }) {
  const { chapterNumber, setBookContext } = useEditorStore()
  const { currentBook } = useBookStore()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  function toggleVolume(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <nav className="space-y-0">
      {volumes.map((vol) => (
        <div key={vol.id}>
          {/* Volume header */}
          <button
            onClick={() => toggleVolume(vol.id)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs uppercase tracking-[0.2em] text-muted hover:text-foreground transition-colors border-b border-border"
          >
            <span className="truncate">{vol.title}</span>
            <span className="text-[10px] ml-2 shrink-0">
              {expanded[vol.id] ? '−' : '+'}
            </span>
          </button>

          {/* Chapters */}
          {expanded[vol.id] && (
            <ul>
              {vol.chapters.map((ch) => (
                <li key={ch.chapterNumber}>
                  <button
                    onClick={() =>
                      setBookContext(currentBook?.id ?? '', ch.chapterNumber)
                    }
                    className={`w-full text-left pl-6 pr-3 py-2 text-sm transition-colors border-b border-border ${
                      chapterNumber === ch.chapterNumber
                        ? 'bg-foreground/[0.04] text-foreground font-medium'
                        : 'text-muted hover:text-foreground hover:bg-foreground/[0.02]'
                    }`}
                  >
                    <span className="text-[10px] tabular-nums mr-2 text-muted">
                      {String(ch.chapterNumber).padStart(2, '0')}
                    </span>
                    {ch.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </nav>
  )
}

// ---------------------------------------------------------------------------
// ProjectPanel (Left)
// ---------------------------------------------------------------------------

function ProjectPanel({ collapsed }: { collapsed: boolean }) {
  const { currentBook, chapters } = useBookStore()

  if (collapsed) return null

  // Build pseudo-volumes from chapters if the book has no outline structure
  const volumes: Volume[] = currentBook?.outline?.volumes?.length
    ? currentBook.outline.volumes
    : [
        {
          id: 'default',
          title: 'Chapters',
          chapters: chapters.map((ch) => ({
            chapterNumber: ch.chapterNumber,
            title: ch.title,
            summary: '',
            keyEvents: [],
            position: 'propulsive' as const,
          })),
        },
      ]

  return (
    <aside className="w-64 shrink-0 border-r border-border overflow-y-auto flex flex-col">
      {/* Book title */}
      <div className="px-4 py-4 border-b border-border">
        <h2 className="font-serif text-lg tracking-tight leading-snug truncate">
          {currentBook?.title ?? 'Untitled'}
        </h2>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted mt-1">
          {currentBook?.genre ?? 'No genre'}
        </p>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto">
        <DirectoryTree volumes={volumes} />
      </div>

      {/* Quick stats */}
      <div className="px-4 py-3 border-t border-border text-[10px] uppercase tracking-[0.2em] text-muted">
        {chapters.length} chapter{chapters.length !== 1 && 's'}
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// RightToolbar (Right)
// ---------------------------------------------------------------------------

type RightTab = 'outline' | 'characters' | 'ai' | 'settings'

const TABS: { key: RightTab; label: string }[] = [
  { key: 'outline', label: 'Outline' },
  { key: 'characters', label: 'Characters' },
  { key: 'ai', label: 'AI Assistant' },
  { key: 'settings', label: 'Settings' },
]

function RightToolbar({ collapsed }: { collapsed: boolean }) {
  const { rightPanelTab, setRightPanelTab } = useEditorStore()
  const { characters } = useBookStore()

  if (collapsed) return null

  return (
    <aside className="w-72 shrink-0 border-l border-border flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-border shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setRightPanelTab(tab.key)}
            className={`flex-1 py-3 text-[10px] uppercase tracking-[0.2em] transition-colors border-b-2 ${
              rightPanelTab === tab.key
                ? 'text-foreground border-foreground'
                : 'text-muted border-transparent hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {rightPanelTab === 'outline' && <OutlinePanel />}
        {rightPanelTab === 'characters' && (
          <CharactersPanel characters={characters} />
        )}
        {rightPanelTab === 'ai' && <AIAssistantPanel />}
        {rightPanelTab === 'settings' && <SettingsPanel />}
      </div>
    </aside>
  )
}

/* ---- Outline ---- */
function OutlinePanel() {
  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted mb-4">
        Chapter Outline
      </h3>
      <textarea
        placeholder="Write a brief outline for this chapter..."
        rows={8}
        className="w-full border border-border bg-transparent px-3 py-2 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors placeholder:text-muted resize-none"
      />
      <p className="text-[10px] text-muted mt-2 tracking-wide">
        Outline helps agents stay on track during generation.
      </p>
    </div>
  )
}

/* ---- Characters ---- */
function CharactersPanel({
  characters,
}: {
  characters: { id: string; name: string; role: string }[]
}) {
  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted mb-4">
        Characters in Scene
      </h3>

      {characters.length === 0 && (
        <p className="text-sm text-muted">No characters defined yet.</p>
      )}

      <ul className="space-y-3">
        {characters.map((c) => (
          <li
            key={c.id}
            className="border border-border p-3 rounded-none hover:border-foreground transition-colors"
          >
            <span className="text-sm font-serif">{c.name}</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted ml-2">
              {c.role}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---- AI Assistant ---- */
function AIAssistantPanel() {
  return <ChatPanel />
}

/* ---- Settings ---- */
function SettingsPanel() {
  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted mb-4">
        Editor Settings
      </h3>

      <div className="space-y-5">
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
            Font Size
          </span>
          <select className="w-full border border-border bg-background px-3 py-2 text-xs font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors appearance-none cursor-pointer">
            <option>14px</option>
            <option>16px</option>
            <option>18px</option>
          </select>
        </label>

        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
            Line Height
          </span>
          <select className="w-full border border-border bg-background px-3 py-2 text-xs font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors appearance-none cursor-pointer">
            <option>1.6</option>
            <option>1.8</option>
            <option>2.0</option>
          </select>
        </label>

        <label className="flex items-center justify-between py-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
            Auto-save
          </span>
          <span className="text-xs border border-border px-2 py-0.5 rounded-none">
            ON
          </span>
        </label>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 border border-border bg-background px-4 py-3 text-xs tracking-wide shadow-lg animate-in fade-in slide-in-from-bottom-2">
      {message}
    </div>
  )
}

// ---------------------------------------------------------------------------
// StatusBar (Bottom)
// ---------------------------------------------------------------------------

function StatusBar() {
  const { content, isDirty, isSaving, lastSavedAt, mode, chapterNumber, toggleMode } =
    useEditorStore()

  const wordCount = content
    .split(/\s+/)
    .filter((w) => w.length > 0).length

  return (
    <footer className="h-8 border-t border-border flex items-center px-4 gap-6 shrink-0 bg-background">
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted tabular-nums">
        {wordCount.toLocaleString()} words
      </span>

      <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
        Ch. {chapterNumber ?? '—'}
      </span>

      <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
        {isSaving
          ? 'Saving...'
          : isDirty
            ? 'Unsaved changes'
            : lastSavedAt
              ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`
              : 'Saved'}
      </span>

      <div className="flex-1" />

      {/* Solo / Co-Write toggle */}
      <button
        onClick={toggleMode}
        className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted hover:text-foreground transition-colors"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            mode === 'co-write' ? 'bg-foreground' : 'bg-border'
          }`}
        />
        {mode === 'solo' ? 'Solo' : 'Co-Write'}
      </button>
    </footer>
  )
}

// ---------------------------------------------------------------------------
// Editor Page
// ---------------------------------------------------------------------------

export default function Editor() {
  const { bookId } = useParams<{ bookId: string }>()
  const navigate = useNavigate()
  const {
    content,
    setContent,
    isDirty,
    setSaving,
    setLastSaved,
    showLeftPanel,
    showRightPanel,
    toggleLeftPanel,
    toggleRightPanel,
    setBookContext,
    chapterNumber,
  } = useEditorStore()
  const { fetchBook, fetchChapters, fetchCharacters, currentBook, loading: bookLoading, error: bookError } = useBookStore()

  const [deAILoading, setDeAILoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // ---- Load book data ----
  useEffect(() => {
    if (!bookId) {
      navigate('/')
      return
    }
    fetchBook(bookId)
    fetchChapters(bookId)
    fetchCharacters(bookId)
    setBookContext(bookId, 1)
  }, [bookId, navigate, fetchBook, fetchChapters, fetchCharacters, setBookContext])

  // ---- De-AI handler ----
  const handleDeAI = useCallback(async (selectedText: string) => {
    if (!selectedText.trim()) return
    setDeAILoading(true)
    try {
      const res = await toolsApi.deAI(selectedText)
      if (res.error) {
        setToast(`De-AI failed: ${res.error}`)
        return
      }
      const result = res.result ?? ''
      if (!result) {
        setToast('De-AI returned empty result')
        return
      }
      // Replace selected text via execCommand (works with contentEditable / Lexical)
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        sel.deleteFromDocument()
        document.execCommand('insertText', false, result)
      }
      setToast('De-AI applied successfully')
    } catch (err) {
      console.error('De-AI error:', err)
      setToast(`De-AI error: ${err instanceof Error ? err.message : 'unknown'}`)
    } finally {
      setDeAILoading(false)
    }
  }, [])

  // ---- Save handler ----
  const handleSave = useCallback(async () => {
    if (!bookId || !chapterNumber) return
    setSaving(true)
    try {
      await chaptersApi.update(bookId, chapterNumber, {
        content,
        wordCount: content.split(/\s+/).filter((w) => w.length > 0).length,
      })
      setLastSaved(new Date().toISOString())
    } catch (e) {
      console.error('Save failed:', e)
    } finally {
      setSaving(false)
    }
  }, [bookId, chapterNumber, content, setSaving, setLastSaved])

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* ---- Top bar ---- */}
      <header className="h-11 border-b border-border flex items-center px-4 gap-3 shrink-0">
        <button
          onClick={toggleLeftPanel}
          className="text-[10px] uppercase tracking-[0.2em] text-muted hover:text-foreground transition-colors px-2 py-1"
          title="Toggle project panel"
        >
          {showLeftPanel ? '◁ Panel' : '▷ Panel'}
        </button>

        <div className="w-px h-4 bg-border" />

        <h1 className="font-serif text-sm tracking-tight truncate">
          {currentBook?.title ?? 'Untitled'}
        </h1>

        <div className="flex-1" />

        {isDirty && (
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
            ● unsaved
          </span>
        )}

        <button
          onClick={handleSave}
          disabled={!isDirty}
          className="text-[10px] uppercase tracking-widest border border-border px-3 py-1 hover:border-foreground transition-colors rounded-none shadow-none disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Save
        </button>

        <div className="w-px h-4 bg-border" />

        <button
          onClick={toggleRightPanel}
          className="text-[10px] uppercase tracking-[0.2em] text-muted hover:text-foreground transition-colors px-2 py-1"
          title="Toggle right toolbar"
        >
          {showRightPanel ? 'Toolbar ▷' : '◁ Toolbar'}
        </button>
      </header>

      {/* ---- Body: 3-column layout ---- */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        <ProjectPanel collapsed={!showLeftPanel} />

        {/* Center editor */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {bookLoading && !currentBook ? (
            <div className="flex-1 overflow-y-auto px-8 py-10 space-y-4">
              <Skeleton className="h-6 w-1/3 mb-6" />
              <Skeleton lines={12} />
            </div>
          ) : bookError ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="font-serif text-lg tracking-tight mb-2">Failed to load chapter</p>
                <p className="text-sm text-muted mb-4">{bookError}</p>
                <button
                  onClick={() => bookId && fetchBook(bookId)}
                  className="text-xs uppercase tracking-widest border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-8 py-10">
              <LexicalEditor
                initialContent={content}
                onChange={(text) => setContent(text)}
                placeholder="Begin writing your chapter here..."
              />
            </div>
          )}
        </main>

        {/* Right panel */}
        <RightToolbar collapsed={!showRightPanel} />
      </div>

      {/* ---- Floating toolbar (on text selection) ---- */}
      <FloatingToolbar onDeAI={handleDeAI} loading={deAILoading} />

      {/* ---- Toast ---- */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* ---- Status bar ---- */}
      <StatusBar />
    </div>
  )
}
