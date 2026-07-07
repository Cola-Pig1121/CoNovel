import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { importApi } from '@/lib/api'
import type { DetectResult, ImportResult } from '@/lib/api'

// ---------------------------------------------------------------------------
// Step Indicator
// ---------------------------------------------------------------------------

function StepIndicator({ current }: { current: number }) {
  const steps = ['Directory', 'Preview', 'Import']

  return (
    <div className="flex items-center gap-0 mb-12">
      {steps.map((label, i) => {
        const num = i + 1
        const isActive = num === current
        const isDone = num < current
        return (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-3">
              <span
                className={`w-7 h-7 flex items-center justify-center border text-[10px] tracking-widest font-sans rounded-none transition-colors ${
                  isActive
                    ? 'border-foreground bg-foreground text-background'
                    : isDone
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border text-muted'
                }`}
              >
                {isDone ? '\u2713' : num}
              </span>
              <span
                className={`text-[10px] uppercase tracking-[0.2em] transition-colors ${
                  isActive ? 'text-foreground' : 'text-muted'
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-16 h-px mx-4 transition-colors ${
                  num < current ? 'bg-foreground' : 'bg-border'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 1: Directory Selection
// ---------------------------------------------------------------------------

function StepDirectory({
  path,
  setPath,
  onDetected,
}: {
  path: string
  setPath: (v: string) => void
  onDetected: (result: DetectResult) => void
}) {
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDetect() {
    if (!path.trim()) return
    setDetecting(true)
    setError(null)
    try {
      const result = await importApi.detect(path.trim())
      onDetected(result)
    } catch (err: any) {
      setError(err?.message || 'Detection failed')
    } finally {
      setDetecting(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="font-serif text-3xl tracking-tight mb-2">Select Directory</h2>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-8">
        Point to the folder containing your manuscript or CoNovel project
      </p>

      {/* Path input */}
      <label className="block mb-6">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
          Directory Path
        </span>
        <div className="flex gap-3">
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleDetect()}
            placeholder="/path/to/your/novel..."
            className="flex-1 border border-border bg-transparent px-4 py-3 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors placeholder:text-muted"
          />
          <button
            type="button"
            onClick={() => {
              alert(
                'How to find your directory path:\n\n' +
                  '• Windows: Open File Explorer, navigate to the folder, ' +
                  'click the address bar, and copy the path\n' +
                  '  (e.g. D:\\Novels\\MyBook)\n\n' +
                  '• macOS / Linux: Open Terminal, navigate to the folder with cd, ' +
                  'then type pwd to print the full path.',
              )
            }}
            className="text-xs uppercase tracking-widest border border-border px-5 py-3 hover:border-foreground transition-colors rounded-none shadow-none text-muted shrink-0"
          >
            Browse
          </button>
        </div>
      </label>

      {/* Error */}
      {error && (
        <div className="border border-red-400/40 bg-red-400/5 p-4 mb-6">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Detect button */}
      <button
        onClick={handleDetect}
        disabled={!path.trim() || detecting}
        className="text-xs uppercase tracking-widest border border-foreground px-8 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {detecting ? 'Detecting\u2026' : 'Detect Format'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2: Format Preview
// ---------------------------------------------------------------------------

function GenreSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-border bg-background px-4 py-3 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors appearance-none cursor-pointer"
    >
      {genres.map((g) => (
        <option key={g} value={g}>
          {g.charAt(0).toUpperCase() + g.slice(1)}
        </option>
      ))}
    </select>
  )
}

function StepPreview({
  detectResult,
  onNext,
  onBack,
  title,
  setTitle,
  genre,
  setGenre,
  premise,
  setPremise,
}: {
  detectResult: DetectResult
  onNext: () => void
  onBack: () => void
  title: string
  setTitle: (v: string) => void
  genre: string
  setGenre: (v: string) => void
  premise: string
  setPremise: (v: string) => void
}) {
  const isCoNovel = detectResult.format.toLowerCase().includes('conovel')
  const isUnknown = detectResult.format.toLowerCase().includes('unknown')
  const isText =
    detectResult.format.toLowerCase().includes('text') ||
    detectResult.format.toLowerCase().includes('markdown') ||
    detectResult.format.toLowerCase().includes('md') ||
    detectResult.format.toLowerCase().includes('txt')

  return (
    <div className="max-w-2xl">
      <h2 className="font-serif text-3xl tracking-tight mb-2">Format Preview</h2>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-8">
        Review detection results before importing
      </p>

      {/* Detection summary card */}
      <div className="border border-border p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span
            className={`w-2 h-2 rounded-full inline-block ${
              isCoNovel ? 'bg-green-500' : isUnknown ? 'bg-red-500' : 'bg-yellow-500'
            }`}
          />
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted">Format Detected</span>
        </div>

        <h3 className="font-serif text-xl tracking-tight mb-1">{detectResult.format}</h3>
        <p className="text-sm text-muted mb-4">{detectResult.description}</p>

        <div className="grid grid-cols-3 gap-4 text-[10px] uppercase tracking-[0.2em] text-muted">
          <div>
            <span className="block mb-1">Confidence</span>
            <span className="text-sm font-sans text-foreground normal-case tracking-normal">
              {Math.round(detectResult.confidence * 100)}%
            </span>
          </div>
          <div>
            <span className="block mb-1">Files Found</span>
            <span className="text-sm font-sans text-foreground normal-case tracking-normal">
              {detectResult.files.length}
            </span>
          </div>
          <div>
            <span className="block mb-1">Est. Chapters</span>
            <span className="text-sm font-sans text-foreground normal-case tracking-normal">
              {detectResult.estimatedChapters}
            </span>
          </div>
        </div>

        {detectResult.hasMetadata && (
          <div className="mt-4 pt-4 border-t border-border text-[10px] uppercase tracking-[0.2em] text-green-600">
            \u2713 Metadata file found
          </div>
        )}
        {detectResult.hasGit && (
          <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-green-600">
            \u2713 Git history detected
          </div>
        )}
      </div>

      {/* Format-specific content */}
      {isCoNovel && (
        <div className="border border-border p-6 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-2 h-2 rounded-full inline-block bg-green-500" />
            <span className="text-sm font-sans">
              \u2713 检测到 CoNovel 格式 — 可直接导入
            </span>
          </div>
          <p className="text-xs text-muted ml-5">
            This directory is a CoNovel project. All chapters, characters, and metadata will be
            imported as-is.
          </p>
        </div>
      )}

      {isText && (
        <div className="border border-border p-6 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-2 h-2 rounded-full inline-block bg-yellow-500" />
            <span className="text-sm font-sans">将自动转换为 CoNovel 格式</span>
          </div>
          <p className="text-xs text-muted ml-5 mb-4">
            Text / Markdown files will be parsed and converted into CoNovel chapter format. You can
            optionally set a title, genre, and premise below.
          </p>

          <div className="ml-5 text-[10px] uppercase tracking-[0.2em] text-muted space-y-1 mb-6">
            <p>
              Estimated chapters: {detectResult.estimatedChapters}
            </p>
          </div>

          {/* Optional fields */}
          <div className="ml-5 space-y-5">
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
                Title <span className="normal-case tracking-normal">(optional)</span>
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled Manuscript"
                className="w-full border border-border bg-transparent px-4 py-3 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors placeholder:text-muted"
              />
            </label>

            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
                Genre
              </span>
              <GenreSelect value={genre} onChange={setGenre} />
            </label>

            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
                Premise <span className="normal-case tracking-normal">(optional)</span>
              </span>
              <textarea
                value={premise}
                onChange={(e) => setPremise(e.target.value)}
                placeholder="A brief summary of the story..."
                rows={3}
                className="w-full border border-border bg-transparent px-4 py-3 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors placeholder:text-muted resize-none"
              />
            </label>
          </div>
        </div>
      )}

      {isUnknown && (
        <div className="border border-border p-6 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-2 h-2 rounded-full inline-block bg-red-500" />
            <span className="text-sm font-sans">无法识别的格式</span>
          </div>
          <p className="text-xs text-muted ml-5">
            The files in this directory could not be matched to a known format. Import may fail or
            produce incomplete results.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="text-xs uppercase tracking-widest border border-border px-6 py-3 hover:border-foreground transition-colors rounded-none shadow-none text-muted"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="text-xs uppercase tracking-widest border border-foreground px-8 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3: Import Confirmation
// ---------------------------------------------------------------------------

function StepConfirm({
  detectResult,
  importPath,
  title,
  genre,
  premise,
  onBack,
}: {
  detectResult: DetectResult
  importPath: string
  title: string
  genre: string
  premise: string
  onBack: () => void
}) {
  const navigate = useNavigate()
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleImport() {
    setImporting(true)
    setError(null)
    try {
      const res = await importApi.execute(
        importPath,
        title || undefined,
        genre || undefined,
        premise || undefined,
      )
      setResult(res)
    } catch (err: any) {
      setError(err?.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  // Success state
  if (result) {
    return (
      <div className="max-w-2xl">
        <h2 className="font-serif text-3xl tracking-tight mb-2">Import Complete</h2>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-8">
          Your manuscript is ready
        </p>

        <div className="border border-border p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-2 h-2 rounded-full inline-block bg-green-500" />
            <span className="text-sm font-sans">\u2713 Import successful</span>
          </div>

          <h3 className="font-serif text-xl tracking-tight mb-1">{result.title}</h3>

          <div className="grid grid-cols-3 gap-4 mt-4 text-[10px] uppercase tracking-[0.2em] text-muted">
            <div>
              <span className="block mb-1">Format</span>
              <span className="text-sm font-sans text-foreground normal-case tracking-normal">
                {result.format}
              </span>
            </div>
            <div>
              <span className="block mb-1">Chapters</span>
              <span className="text-sm font-sans text-foreground normal-case tracking-normal">
                {result.chapters}
              </span>
            </div>
            {result.totalWords != null && (
              <div>
                <span className="block mb-1">Words</span>
                <span className="text-sm font-sans text-foreground normal-case tracking-normal">
                  {result.totalWords.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4">
          <Link
            to="/"
            className="text-xs uppercase tracking-widest border border-border px-6 py-3 hover:border-foreground transition-colors rounded-none shadow-none text-muted inline-block"
          >
            Dashboard
          </Link>
          <button
            onClick={() => navigate(`/editor/${result.bookId}`)}
            className="text-xs uppercase tracking-widest border border-foreground px-8 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none"
          >
            Open Editor
          </button>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-2xl">
        <h2 className="font-serif text-3xl tracking-tight mb-2">Import Failed</h2>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-8">
          Something went wrong during the import
        </p>

        <div className="border border-red-400/40 bg-red-400/5 p-6 mb-8">
          <p className="text-sm text-red-600">{error}</p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onBack}
            className="text-xs uppercase tracking-widest border border-border px-6 py-3 hover:border-foreground transition-colors rounded-none shadow-none text-muted"
          >
            Back
          </button>
          <button
            onClick={handleImport}
            className="text-xs uppercase tracking-widest border border-foreground px-8 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Confirm state
  return (
    <div className="max-w-2xl">
      <h2 className="font-serif text-3xl tracking-tight mb-2">Confirm Import</h2>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-8">
        Review and start the import process
      </p>

      <div className="border border-border p-6 mb-8">
        <h3 className="font-serif text-xl tracking-tight mb-4">Import Summary</h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-border pb-3">
            <span className="text-muted">Format</span>
            <span className="font-sans">{detectResult.format}</span>
          </div>
          <div className="flex justify-between border-b border-border pb-3">
            <span className="text-muted">Files</span>
            <span className="font-sans">{detectResult.files.length}</span>
          </div>
          <div className="flex justify-between border-b border-border pb-3">
            <span className="text-muted">Est. Chapters</span>
            <span className="font-sans">{detectResult.estimatedChapters}</span>
          </div>
          {title && (
            <div className="flex justify-between border-b border-border pb-3">
              <span className="text-muted">Title</span>
              <span className="font-sans">{title}</span>
            </div>
          )}
          <div className="flex justify-between border-b border-border pb-3">
            <span className="text-muted">Genre</span>
            <span className="font-sans capitalize">{genre}</span>
          </div>
          {premise && (
            <div className="flex justify-between pb-1">
              <span className="text-muted">Premise</span>
              <span className="font-sans text-right max-w-xs line-clamp-2">{premise}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress */}
      {importing && (
        <div className="border border-border p-6 mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-2 h-2 rounded-full inline-block bg-yellow-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
              Importing\u2026
            </span>
          </div>
          <div className="w-full h-px bg-border">
            <div className="h-px bg-foreground animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={onBack}
          disabled={importing}
          className="text-xs uppercase tracking-widest border border-border px-6 py-3 hover:border-foreground transition-colors rounded-none shadow-none text-muted disabled:opacity-40"
        >
          Back
        </button>
        <button
          onClick={handleImport}
          disabled={importing}
          className="text-xs uppercase tracking-widest border border-foreground px-8 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none disabled:opacity-40"
        >
          {importing ? 'Importing\u2026' : 'Confirm Import'}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ImportPage (parent — manages all wizard state)
// ---------------------------------------------------------------------------

export default function ImportPage() {
  const [step, setStep] = useState(1)
  const [detectResult, setDetectResult] = useState<DetectResult | null>(null)
  const [importPath, setImportPath] = useState('')
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState('fantasy')
  const [premise, setPremise] = useState('')

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-10 py-8">
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="text-[10px] uppercase tracking-[0.2em] text-muted hover:text-foreground transition-colors"
          >
            \u2190 Dashboard
          </Link>
          <div className="h-4 w-px bg-border" />
          <h1 className="font-serif text-3xl tracking-tight">Import Manuscript</h1>
        </div>
      </header>

      {/* Content */}
      <main className="px-10 py-10">
        <StepIndicator current={step} />

        {step === 1 && (
          <StepDirectory
            path={importPath}
            setPath={setImportPath}
            onDetected={(result) => {
              setDetectResult(result)
              setStep(2)
            }}
          />
        )}

        {step === 2 && detectResult && (
          <StepPreview
            detectResult={detectResult}
            title={title}
            setTitle={setTitle}
            genre={genre}
            setGenre={setGenre}
            premise={premise}
            setPremise={setPremise}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && detectResult && (
          <StepConfirm
            detectResult={detectResult}
            importPath={importPath}
            title={title}
            genre={genre}
            premise={premise}
            onBack={() => setStep(2)}
          />
        )}
      </main>
    </div>
  )
}
