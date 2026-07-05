import { useState } from 'react'
import { useEditorStore } from '@/stores/editorStore'

// ---------------------------------------------------------------------------
// StatusBar — Bottom status bar for the editor
// ---------------------------------------------------------------------------

export default function StatusBar() {
  const {
    content,
    isDirty,
    isSaving,
    lastSavedAt,
    mode,
    chapterNumber,
    toggleMode,
  } = useEditorStore()

  const [gitStatus] = useState<'clean' | 'dirty' | 'syncing'>('clean')

  // Chinese character count (count all non-whitespace characters)
  const charCount = content.replace(/\s/g, '').length

  const gitLabels = {
    clean: { text: 'Git: clean', dotClass: 'bg-foreground' },
    dirty: { text: 'Git: dirty', dotClass: 'bg-foreground/50' },
    syncing: { text: 'Git: syncing', dotClass: 'bg-border animate-pulse' },
  }

  const saveStatusText = isSaving
    ? 'Saving...'
    : isDirty
      ? 'Unsaved changes'
      : lastSavedAt
        ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`
        : 'Saved'

  const git = gitLabels[gitStatus]

  return (
    <footer className="h-8 border-t border-border flex items-center px-4 gap-6 shrink-0 bg-background">
      {/* Character count (Chinese) */}
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted tabular-nums">
        {charCount.toLocaleString()} 字
      </span>

      {/* Chapter number */}
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
        Ch. {chapterNumber ?? '—'}
      </span>

      {/* Save status */}
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
        {saveStatusText}
      </span>

      <div className="flex-1" />

      {/* Solo / Co-Write mode toggle */}
      <button
        onClick={toggleMode}
        className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted hover:text-foreground transition-colors"
      >
        <span
          className={`w-1.5 h-1.5 ${
            mode === 'co-write' ? 'bg-foreground' : 'bg-border'
          }`}
        />
        {mode === 'solo' ? 'Solo' : 'Co-Write'}
      </button>

      {/* Divider */}
      <div className="w-px h-3 bg-border" />

      {/* Git status */}
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted">
        <span className={`w-1.5 h-1.5 ${git.dotClass}`} />
        {git.text}
      </span>
    </footer>
  )
}
