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
    clean: { text: 'Git: 已同步', dotClass: 'bg-foreground' },
    dirty: { text: 'Git: 未同步', dotClass: 'bg-foreground/50' },
    syncing: { text: 'Git: 同步中', dotClass: 'bg-border animate-pulse' },
  }

  const saveStatusText = isSaving
    ? '保存中...'
    : isDirty
      ? '未保存'
      : lastSavedAt
        ? `已保存 ${new Date(lastSavedAt).toLocaleTimeString()}`
        : '已保存'

  const git = gitLabels[gitStatus]

  return (
    <footer className="h-8 border-t border-border flex items-center px-4 gap-6 shrink-0 bg-background">
      {/* Character count (Chinese) */}
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted tabular-nums">
        {charCount.toLocaleString()} 字
      </span>

      {/* Chapter number */}
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
        第 {chapterNumber ?? '—'} 章
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
        {mode === 'solo' ? '独立写作' : '协作写作'}
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
