import { useState } from 'react'
import { useBookStore } from '@/stores/bookStore'
import { useEditorStore } from '@/stores/editorStore'
import type { Volume } from '@/lib/types'

// ---------------------------------------------------------------------------
// Status Indicator
// ---------------------------------------------------------------------------

function StatusDot({ status }: { status: 'draft' | 'reviewed' | 'final' }) {
  const config = {
    draft: { color: 'bg-border', label: 'Draft' },
    reviewed: { color: 'bg-foreground/50', label: 'Reviewed' },
    final: { color: 'bg-foreground', label: 'Final' },
  }[status]

  return (
    <span
      className={`inline-block w-1.5 h-1.5 ${config.color} shrink-0`}
      title={config.label}
    />
  )
}

// ---------------------------------------------------------------------------
// Directory Tree
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
            className="w-full flex items-center justify-between px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-muted hover:text-foreground transition-colors border-b border-border"
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
                    className={`w-full text-left pl-6 pr-4 py-2 text-sm transition-colors border-b border-border flex items-center gap-2 ${
                      chapterNumber === ch.chapterNumber
                        ? 'bg-foreground/[0.04] text-foreground font-medium'
                        : 'text-muted hover:text-foreground hover:bg-foreground/[0.02]'
                    }`}
                  >
                    <StatusDot status="draft" />
                    <span className="text-[10px] tabular-nums mr-1 text-muted">
                      {String(ch.chapterNumber).padStart(2, '0')}
                    </span>
                    <span className="truncate">{ch.title}</span>
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
// ProjectPanel — Left panel for the editor
// ---------------------------------------------------------------------------

interface ProjectPanelProps {
  collapsed?: boolean
}

export default function ProjectPanel({ collapsed = false }: ProjectPanelProps) {
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

      {/* Directory tree */}
      <div className="flex-1 overflow-y-auto">
        <DirectoryTree volumes={volumes} />
      </div>

      {/* New Chapter button */}
      <div className="border-t border-border px-4 py-3">
        <button className="w-full text-[10px] uppercase tracking-widest border border-border px-4 py-2 hover:border-foreground hover:text-foreground transition-colors rounded-none shadow-none">
          + New Chapter
        </button>
      </div>

      {/* Quick stats */}
      <div className="px-4 py-3 border-t border-border text-[10px] uppercase tracking-[0.2em] text-muted">
        {chapters.length} chapter{chapters.length !== 1 && 's'}
      </div>
    </aside>
  )
}
