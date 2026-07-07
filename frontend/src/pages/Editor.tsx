import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEditorStore } from '@/stores/editorStore'
import { useBookStore } from '@/stores/bookStore'
import FloatingToolbar from '@/components/editor/FloatingToolbar'
import LexicalEditor from '@/components/editor/LexicalEditor'
import DiffView from '@/components/editor/DiffView'
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
  { key: 'outline', label: '大纲' },
  { key: 'characters', label: '角色' },
  { key: 'ai', label: 'AI 助手' },
  { key: 'settings', label: '设置' },
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
        章节大纲
      </h3>
      <textarea
        placeholder="为本章写一个简要大纲..."
        rows={8}
        className="w-full border border-border bg-transparent px-3 py-2 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors placeholder:text-muted resize-none"
      />
      <p className="text-[10px] text-muted mt-2 tracking-wide">
        大纲帮助智能体在生成时保持方向。
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
        场景中的角色
      </h3>

      {characters.length === 0 && (
        <p className="text-sm text-muted">暂无角色定义。</p>
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
  const { fontSize, lineHeight, setFontSize, setLineHeight } = useEditorStore()

  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted mb-4">
        编辑器设置
      </h3>

      <div className="space-y-5">
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
            字体大小
          </span>
          <select
            value={`${fontSize}px`}
            onChange={(e) => setFontSize(e.target.value.replace('px', ''))}
            className="w-full border border-border bg-background px-3 py-2 text-xs font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors appearance-none cursor-pointer"
          >
            <option value="14px">14px</option>
            <option value="16px">16px</option>
            <option value="18px">18px</option>
            <option value="20px">20px</option>
            <option value="22px">22px</option>
          </select>
        </label>

        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
            行高
          </span>
          <select
            value={lineHeight}
            onChange={(e) => setLineHeight(e.target.value)}
            className="w-full border border-border bg-background px-3 py-2 text-xs font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors appearance-none cursor-pointer"
          >
            <option value="1.6">1.6</option>
            <option value="1.8">1.8</option>
            <option value="2.0">2.0</option>
            <option value="2.2">2.2</option>
          </select>
        </label>

        <label className="flex items-center justify-between py-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
            自动保存
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
        {wordCount.toLocaleString()} 字
      </span>

      <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
        Ch. {chapterNumber ?? '—'}
      </span>

      <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
        {isSaving
          ? '保存中...'
          : isDirty
            ? '未保存的更改'
            : lastSavedAt
              ? `已保存 ${new Date(lastSavedAt).toLocaleTimeString()}`
              : '已保存'}
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
        {mode === 'solo' ? '独立写作' : '协作写作'}
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
    fontSize,
    lineHeight,
    reviewMode,
    originalContent,
    aiDraft,
    reviewStatus,
    enterReviewMode,
    discardAllChanges,
    exitReviewMode,
  } = useEditorStore()
  const { fetchBook, fetchChapters, fetchCharacters, currentBook, loading: bookLoading, error: bookError } = useBookStore()

  const [aiProcessing, setAiProcessing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // ---- Load book data ----
  useEffect(() => {
    if (!bookId) {
      navigate('/')
      return
    }
    fetchBook(bookId)
    fetchCharacters(bookId)

    // Fetch chapters then load the first chapter's content into the editor
    fetchChapters(bookId).then(() => {
      const { chapters } = useBookStore.getState()
      if (chapters.length > 0 && chapters[0]) {
        setContent(chapters[0].content ?? '')
        setBookContext(bookId, chapters[0].chapterNumber)
      } else {
        setBookContext(bookId, 1)
      }
    })
  }, [bookId, navigate, fetchBook, fetchChapters, fetchCharacters, setBookContext, setContent])

  // ---- Load chapter content when chapter number changes ----
  useEffect(() => {
    if (!bookId || !chapterNumber) return
    const { chapters } = useBookStore.getState()
    const ch = chapters.find((c) => c.chapterNumber === chapterNumber)
    if (ch) {
      setContent(ch.content ?? '')
    }
  }, [bookId, chapterNumber, setContent])

  // ---- AI action handler (polish / de-AI) — enters review mode ----
  const runAiAction = useCallback(
    async (action: 'polish' | 'deai', selectedText: string) => {
      if (!selectedText.trim()) return
      setAiProcessing(true)
      enterReviewMode(content, '') // show processing state
      try {
        const res =
          action === 'polish'
            ? await toolsApi.polish(selectedText)
            : await toolsApi.deAI(selectedText)
        if (res.error) {
          setToast(`${action === 'polish' ? '润色' : 'De-AI'} failed: ${res.error}`)
          exitReviewMode()
          return
        }
        const result = res.result ?? ''
        if (!result) {
          setToast('AI returned empty result')
          exitReviewMode()
          return
        }
        const newContent = content.replace(selectedText, result)
        enterReviewMode(content, newContent)
      } catch (err) {
        console.error('AI action error:', err)
        setToast(`AI error: ${err instanceof Error ? err.message : 'unknown'}`)
        exitReviewMode()
      } finally {
        setAiProcessing(false)
      }
    },
    [content, enterReviewMode, exitReviewMode],
  )

  const handlePolish = useCallback(
    (selectedText: string) => runAiAction('polish', selectedText),
    [runAiAction],
  )

  const handleDeAI = useCallback(
    (selectedText: string) => runAiAction('deai', selectedText),
    [runAiAction],
  )

  // ---- Review mode handlers ----
  const handleReviewAcceptAll = useCallback(
    (mergedText: string) => {
      setContent(mergedText)
      exitReviewMode()
      setToast('Changes applied successfully')
    },
    [setContent, exitReviewMode],
  )

  const handleReviewDiscardAll = useCallback(() => {
    discardAllChanges()
    setToast('Changes discarded')
  }, [discardAllChanges])

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

  // ---- Auto-save after 30 seconds of inactivity ----
  useEffect(() => {
    if (!isDirty || !bookId || !chapterNumber) return
    const timer = setTimeout(() => {
      handleSave()
    }, 30000)
    return () => clearTimeout(timer)
  }, [content, isDirty, bookId, chapterNumber, handleSave])

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* ---- Top bar ---- */}
      <header className="h-11 border-b border-border flex items-center px-4 gap-3 shrink-0">
        <button
          onClick={toggleLeftPanel}
          className="text-[10px] uppercase tracking-[0.2em] text-muted hover:text-foreground transition-colors px-2 py-1"
          title="切换项目面板"
        >
          {showLeftPanel ? '◁ 面板' : '▷ 面板'}
        </button>

        <div className="w-px h-4 bg-border" />

        <h1 className="font-serif text-sm tracking-tight truncate">
          {currentBook?.title ?? 'Untitled'}
        </h1>

        <div className="flex-1" />

        {isDirty && (
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
            ● 未保存
          </span>
        )}

        <button
          onClick={handleSave}
          disabled={!isDirty}
          className="text-[10px] uppercase tracking-widest border border-border px-3 py-1 hover:border-foreground transition-colors rounded-none shadow-none disabled:opacity-30 disabled:cursor-not-allowed"
        >
          保存
        </button>

        <div className="w-px h-4 bg-border" />

        <button
          onClick={toggleRightPanel}
          className="text-[10px] uppercase tracking-[0.2em] text-muted hover:text-foreground transition-colors px-2 py-1"
          title="切换右侧工具栏"
        >
          {showRightPanel ? '工具栏 ▷' : '◁ 工具栏'}
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
                <p className="font-serif text-lg tracking-tight mb-2">加载章节失败</p>
                <p className="text-sm text-muted mb-4">{bookError}</p>
                <button
                  onClick={() => bookId && fetchBook(bookId)}
                  className="text-xs uppercase tracking-widest border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none"
                >
                  重试
                </button>
              </div>
            </div>
          ) : reviewMode ? (
            /* ---- Review Mode ---- */
            <div className="flex-1 overflow-y-auto px-8 py-10">
              {/* Review Mode Banner */}
              <div className="diff-review-banner mb-6">
                <span className="flex items-center gap-2">
                  <span className="text-base">📐</span>
                  Review Mode: AI 已完成润色。绿色区域可编辑。确认后点击应用合并。
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleReviewDiscardAll}
                    className="text-[10px] uppercase tracking-widest border border-border px-3 py-1.5 hover:border-foreground transition-colors rounded-none"
                  >
                    丢弃更改
                  </button>
                  <button
                    onClick={() => {
                      // Compute merged text from current accepted state and apply
                      const merged = content // fallback; DiffView will call onAcceptAll
                      handleReviewAcceptAll(merged)
                    }}
                    className="text-[10px] uppercase tracking-widest border border-foreground px-3 py-1.5 hover:bg-foreground hover:text-background transition-colors rounded-none"
                  >
                    应用合并
                  </button>
                </div>
              </div>

              {reviewStatus === 'diffing' && originalContent ? (
                <DiffView
                  original={originalContent}
                  modified={aiDraft}
                  onAcceptAll={handleReviewAcceptAll}
                  onDiscardAll={handleReviewDiscardAll}
                />
              ) : (
                <div className="flex items-center justify-center py-20">
                  <div className="text-sm text-muted animate-pulse tracking-wider">
                    AI 正在处理中...
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-8 py-10">
              <LexicalEditor
                initialContent={content}
                onChange={(text) => setContent(text)}
                placeholder="在此开始创作你的章节..."
                fontSize={Number(fontSize)}
                lineHeight={Number(lineHeight)}
              />
            </div>
          )}
        </main>

        {/* Right panel */}
        <RightToolbar collapsed={!showRightPanel} />
      </div>

      {/* ---- Floating toolbar (on text selection) ---- */}
      <FloatingToolbar onAction={(action, text) => {
        if (action === '润色') handlePolish(text)
        else if (action === '去AI味') handleDeAI(text)
      }} onDeAI={handleDeAI} loading={aiProcessing} />

      {/* ---- Toast ---- */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* ---- Status bar ---- */}
      <StatusBar />
    </div>
  )
}
