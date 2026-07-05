import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBookStore } from '@/stores/bookStore'
import { useUIStore } from '@/stores/uiStore'

// ---------------------------------------------------------------------------
// Genre options
// ---------------------------------------------------------------------------

const GENRES = [
  '玄幻',
  '仙侠',
  '武侠',
  '都市',
  '悬疑',
  '科幻',
  '言情',
  '历史',
  '游戏',
  '其他',
] as const

// ---------------------------------------------------------------------------
// CreateBookModal
// ---------------------------------------------------------------------------

export default function CreateBookModal() {
  const { activeModal, closeModal } = useUIStore()
  const { createBook } = useBookStore()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState<string>(GENRES[0])
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
        genre,
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

        {/* Genre */}
        <label className="block mb-6">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
            Genre
          </span>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="w-full border border-border bg-background px-4 py-3 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors appearance-none cursor-pointer"
          >
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
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
