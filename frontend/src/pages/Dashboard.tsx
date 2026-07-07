import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useBookStore } from '@/stores/bookStore'
import { useUIStore } from '@/stores/uiStore'
import { storeApi } from '@/lib/api'
import GoalPanel from '@/components/dashboard/GoalPanel'
import Skeleton from '@/components/ui/Skeleton'
import type { BookMeta } from '@/lib/types'

// ---------------------------------------------------------------------------
// BookCard
// ---------------------------------------------------------------------------

function BookCard({ book }: { book: BookMeta }) {
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
      <h3 className="font-serif text-xl tracking-tight mb-2">{book.title}</h3>

      {/* Premise excerpt */}
      <p className="text-sm text-muted leading-relaxed mb-4 line-clamp-2">
        {book.premise}
      </p>

      {/* Word count bar */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
            字数
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

      {/* Meta row */}
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-muted mb-4">
        <span>Ch. {book.currentChapter} / {book.totalChapters}</span>
        <span>{new Date(book.updatedAt).toLocaleDateString()}</span>
      </div>

      {/* Action */}
      <button
        onClick={() => navigate(`/editor/${book.id}`)}
        className="w-full text-xs uppercase tracking-widest border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none"
      >
        打开工作区
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CreateBookModal
// ---------------------------------------------------------------------------

function CreateBookModal() {
  const { activeModal, closeModal } = useUIStore()
  const { createBook } = useBookStore()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState('fantasy')
  const [premise, setPremise] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (activeModal !== 'createBook') return null

  const genres = [
    'fantasy',
    'sci-fi',
    'mystery',
    'thriller',
    'romance',
    'literary',
    'historical',
    'horror',
    'adventure',
    'other',
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setSubmitting(true)
    try {
      const book = await createBook({ title: title.trim(), genre, premise: premise.trim() })
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
        <h2 className="font-serif text-2xl tracking-tight mb-1">新建手稿</h2>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-8">
          在开始写作前配置你的项目
        </p>

        {/* Title */}
        <label className="block mb-6">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
            标题
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="未命名手稿"
            required
            className="w-full border border-border bg-transparent px-4 py-3 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors placeholder:text-muted"
          />
        </label>

        {/* Genre */}
        <label className="block mb-6">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
            类型
          </span>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="w-full border border-border bg-background px-4 py-3 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors appearance-none cursor-pointer"
          >
            {genres.map((g) => (
              <option key={g} value={g}>
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </option>
            ))}
          </select>
        </label>

        {/* Premise */}
        <label className="block mb-8">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
            故事前提
          </span>
          <textarea
            value={premise}
            onChange={(e) => setPremise(e.target.value)}
            placeholder="简要描述你想讲述的故事..."
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
            取消
          </button>
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="flex-1 text-xs uppercase tracking-widest border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? '创建中...' : '创建手稿'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const { books, loading, error, fetchBooks } = useBookStore()
  const { openModal } = useUIStore()
  const [templateInput, setTemplateInput] = useState('')
  const [templates, setTemplates] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [status, setStatus] = useState({ backend: 'checking', engine: 'checking' })

  useEffect(() => {
    fetchBooks()
  }, [fetchBooks])

  // ---- Fetch templates from backend ----
  useEffect(() => {
    storeApi.listLocal().then(data => setTemplates(data)).catch(() => {})
  }, [])

  // ---- Real health checks ----
  useEffect(() => {
    fetch('/api/health')
      .then(r => r.ok ? setStatus(s => ({ ...s, backend: 'online' })) : setStatus(s => ({ ...s, backend: 'error' })))
      .catch(() => setStatus(s => ({ ...s, backend: 'offline' })))
    fetch('http://127.0.0.1:3583/health')
      .then(r => r.ok ? setStatus(s => ({ ...s, engine: 'online' })) : setStatus(s => ({ ...s, engine: 'error' })))
      .catch(() => setStatus(s => ({ ...s, engine: 'offline' })))
  }, [])

  async function handleImport() {
    const url = templateInput.trim()
    if (!url) return
    setImporting(true)
    try {
      await storeApi.import(url)
      setTemplateInput('')
      // Refresh template list
      const data = await storeApi.listLocal()
      setTemplates(data)
    } catch (err) {
      console.error('Import failed:', err)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ----- Header ----- */}
      <header className="border-b border-border px-10 py-12">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-serif text-6xl tracking-tight leading-none">
              CoNovel Studio
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted mt-3">
              自主多智能体叙事系统 // v0.1.0
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/import"
              className="text-xs uppercase tracking-widest border border-foreground px-4 py-2 hover:bg-foreground hover:text-background transition-colors"
            >
              导入书籍
            </Link>
            <button
              onClick={() => openModal('createBook')}
              className="text-xs uppercase tracking-widest border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none"
            >
              创建书籍
            </button>
          </div>
        </div>
      </header>

      {/* ----- Main Grid ----- */}
      <main className="px-10 py-10">
        <div className="grid grid-cols-12 gap-8">
          {/* ---- Left: Active Manuscripts (8 cols) ---- */}
          <section className="col-span-8">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted">
                活跃手稿
              </h2>
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
                {books.length} project{books.length !== 1 && 's'}
              </span>
            </div>

            {loading && (
              <div className="grid grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="border border-border p-6 rounded-none">
                    <div className="flex items-center justify-between mb-4">
                      <Skeleton className="w-16 h-4" />
                      <Skeleton className="w-20 h-4" />
                    </div>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton lines={2} className="mb-4" />
                    <Skeleton className="h-px w-full mb-4" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            )}

            {!loading && error && (
              <div className="border border-border p-12 text-center rounded-none">
                <p className="font-serif text-xl tracking-tight mb-2">
                  加载手稿失败
                </p>
                <p className="text-sm text-muted mb-6">
                  {error}
                </p>
                <button
                  onClick={() => fetchBooks()}
                  className="text-xs uppercase tracking-widest border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none"
                >
                  重试
                </button>
              </div>
            )}

            {!loading && books.length === 0 && (
              <div className="border border-border p-12 text-center rounded-none">
                <p className="font-serif text-2xl tracking-tight mb-2">
                  暂无手稿
                </p>
                <p className="text-sm text-muted mb-6">
                  创建你的第一本书，开始使用 AI 智能体进行创作。
                </p>
                <button
                  onClick={() => openModal('createBook')}
                  className="text-xs uppercase tracking-widest border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none"
                >
                  创建书籍
                </button>
              </div>
            )}

            {!loading && books.length > 0 && (
              <div className="grid grid-cols-2 gap-6">
                {books.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            )}

            {/* Writing Goal */}
            {!loading && books.length > 0 && books[0] && (
              <div className="mt-8">
                <GoalPanel bookId={books[0].id} />
              </div>
            )}
          </section>

          {/* ---- Right: Template Store & Status (4 cols) ---- */}
          <aside className="col-span-4">
            {/* Template Store */}
            <div className="border border-border p-6 rounded-none mb-6">
              <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted mb-4">
                模板商店
              </h2>

              {/* Import input */}
              <div className="flex gap-2 mb-5">
                <input
                  type="text"
                  value={templateInput}
                  onChange={(e) => setTemplateInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleImport()}
                  placeholder="导入模板 URL..."
                  className="flex-1 border border-border bg-transparent px-3 py-2 text-xs font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors placeholder:text-muted"
                />
                <button
                  onClick={handleImport}
                  disabled={importing || !templateInput.trim()}
                  className="text-xs uppercase tracking-widest border border-foreground px-4 py-2 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {importing ? '导入中...' : '导入'}
                </button>
              </div>

              {/* Template list */}
              {templates.length === 0 && (
                <p className="text-xs text-muted py-4 text-center">暂无本地模板</p>
              )}
              <ul className="space-y-0">
                {templates.map((tpl) => (
                  <li
                    key={tpl}
                    className="flex items-center justify-between border-b border-border last:border-b-0 py-3 group cursor-pointer hover:bg-foreground/[0.02] transition-colors px-1 -mx-1"
                    onClick={() => {
                      openModal('createBook')
                    }}
                  >
                    <span className="text-sm font-sans">{tpl}</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted group-hover:text-foreground transition-colors">
                      使用
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* System Status */}
            <div className="border border-border p-6 rounded-none">
              <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted mb-4">
                系统状态
              </h2>

              <ul className="space-y-3">
                {[
                  { label: '后端 API', status: status.backend },
                  { label: '智能体引擎', status: status.engine },
                ].map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted">{item.label}</span>
                    <span className="flex items-center gap-2">
                      <span
                        className={`w-1.5 h-1.5 rounded-full inline-block ${
                          item.status === 'online'
                            ? 'bg-green-500'
                            : item.status === 'checking'
                              ? 'bg-yellow-500 animate-pulse'
                              : 'bg-red-500'
                        }`}
                      />
                      <span className="text-[10px] uppercase tracking-[0.2em]">
                        {item.status}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </main>

      {/* ----- Modal ----- */}
      <CreateBookModal />
    </div>
  )
}
