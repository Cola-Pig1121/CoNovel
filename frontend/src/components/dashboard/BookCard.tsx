import { useNavigate } from 'react-router-dom'
import type { BookMeta } from '@/lib/types'

// ---------------------------------------------------------------------------
// BookCard — Individual book card for Dashboard
// ---------------------------------------------------------------------------

export default function BookCard({ book }: { book: BookMeta }) {
  const navigate = useNavigate()

  const wordProgress =
    book.targetWordCount > 0
      ? Math.round((book.currentWordCount / book.targetWordCount) * 100)
      : 0

  return (
    <div className="border border-border p-6 rounded-none hover:border-foreground transition-colors group">
      {/* Genre badge */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] uppercase tracking-widest bg-foreground text-background px-2 py-0.5">
          {book.genre}
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
          {book.status}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-serif text-2xl tracking-tight mb-2 leading-snug">
        {book.title}
      </h3>

      {/* Premise excerpt */}
      <p className="text-sm text-muted leading-relaxed mb-4 line-clamp-2">
        {book.premise}
      </p>

      {/* Word count progress bar */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
            Words
          </span>
          <span className="text-xs font-sans tabular-nums">
            {book.currentWordCount.toLocaleString()}
            <span className="text-muted">
              {' '}
              / {book.targetWordCount.toLocaleString()}
            </span>
          </span>
        </div>
        <div className="w-full h-px bg-border">
          <div
            className="h-px bg-foreground transition-all"
            style={{ width: `${Math.min(wordProgress, 100)}%` }}
          />
        </div>
      </div>

      {/* Meta row: chapter count + last updated */}
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-muted mb-5">
        <span>
          {book.totalChapters} chapter{book.totalChapters !== 1 && 's'}
        </span>
        <span>{new Date(book.updatedAt).toLocaleDateString()}</span>
      </div>

      {/* Action link */}
      <button
        onClick={() => navigate(`/editor/${book.id}`)}
        className="w-full text-xs uppercase tracking-widest border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none group-hover:border-foreground"
      >
        Open Workspace →
      </button>
    </div>
  )
}
