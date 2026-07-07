import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBookStore } from '@/stores/bookStore'
import { useUIStore } from '@/stores/uiStore'

// ---------------------------------------------------------------------------
// Genre options
// ---------------------------------------------------------------------------

const GENRES = [
  { value: 'xuanhuan', label: '玄幻' },
  { value: 'xianxia', label: '仙侠' },
  { value: 'wuxia', label: '武侠' },
  { value: 'dushi', label: '都市' },
  { value: 'xuanyi', label: '悬疑' },
  { value: 'kehuan', label: '科幻' },
  { value: 'yanqing', label: '言情' },
  { value: 'lishi', label: '历史' },
  { value: 'youxi', label: '游戏' },
  { value: 'qita', label: '其他' },
]

// ---------------------------------------------------------------------------
// CreateBookModal
// ---------------------------------------------------------------------------

export default function CreateBookModal() {
  const { activeModal, closeModal } = useUIStore()
  const { createBook } = useBookStore()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [premise, setPremise] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (activeModal !== 'createBook') return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setSubmitting(true)
    try {
      const book = await createBook({
        title: title.trim(),
        genres: selectedGenres,
        premise: premise.trim(),
      })
      closeModal()
      navigate(`/editor/${book.id}`)
    } catch (err) {
      console.error('Failed to create book:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/10 backdrop-blur-sm"
        onClick={closeModal}
      />

      {/* Dialog */}
      <form
        onSubmit={handleSubmit}
        className="relative bg-background border border-border w-full max-w-lg p-8 rounded-none shadow-none"
      >
        <h2 className="font-serif text-2xl tracking-tight mb-1">New Manuscript</h2>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-8">
          Configure your project before writing begins
        </p>

        {/* Title */}
        <label className="block mb-6">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
            Title
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Manuscript"
            required
            className="w-full border border-border bg-transparent px-4 py-3 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors placeholder:text-muted"
          />
        </label>

        {/* Genres (multi-select) */}
        <label className="block mb-6">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
            Genres
          </span>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => {
              const checked = selectedGenres.includes(g.value)
              return (
                <label
                  key={g.value}
                  className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-sans cursor-pointer transition-colors select-none ${
                    checked
                      ? 'border-foreground bg-foreground/5'
                      : 'border-border hover:border-foreground/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => {
                      setSelectedGenres((prev) =>
                        prev.includes(g.value)
                          ? prev.filter((v) => v !== g.value)
                          : [...prev, g.value],
                      )
                    }}
                  />
                  <span
                    className={`inline-block w-3 h-3 border flex-shrink-0 flex items-center justify-center ${
                      checked ? 'border-foreground bg-foreground' : 'border-border'
                    }`}
                  >
                    {checked && (
                      <svg className="w-2 h-2 text-background" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    )}
                  </span>
                  {g.label}
                </label>
              )
            })}
          </div>
        </label>

        {/* Premise */}
        <label className="block mb-8">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
            Premise
          </span>
          <textarea
            value={premise}
            onChange={(e) => setPremise(e.target.value)}
            placeholder="A brief summary of the story you want to tell..."
            rows={4}
            className="w-full border border-border bg-transparent px-4 py-3 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors placeholder:text-muted resize-none"
          />
        </label>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={closeModal}
            className="flex-1 text-xs uppercase tracking-widest border border-border px-6 py-3 hover:border-foreground transition-colors rounded-none shadow-none text-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="flex-1 text-xs uppercase tracking-widest border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating...' : 'Create Manuscript'}
          </button>
        </div>
      </form>
    </div>
  )
}
