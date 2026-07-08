import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { importApi } from '@/lib/api'
import type { DetectResult, ImportResult } from '@/lib/api'

// ---------------------------------------------------------------------------
// Step Indicator
// ---------------------------------------------------------------------------

function StepIndicator({ current }: { current: number }) {
  const steps = ['目录', '预览', '导入']

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
      setError(err?.message || '检测失败')
    } finally {
      setDetecting(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="font-serif text-3xl tracking-tight mb-2">选择目录</h2>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-8">
        指向包含你的手稿或 CoNovel 项目的文件夹
      </p>

      {/* Path input */}
      <label className="block mb-6">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
            目录路径
          </span>
          <div className="flex gap-3">
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDetect()}
              placeholder="你的小说目录路径..."
            className="flex-1 border border-border bg-transparent px-4 py-3 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors placeholder:text-muted"
          />
          <button
            type="button"
            onClick={() => {
              alert(
                '如何找到你的目录路径：\n\n' +
                  '• Windows：打开文件资源管理器，导航到该文件夹，' +
                  '点击地址栏并复制路径\n' +
                  '  （例如 D:\\Novels\\MyBook）\n\n' +
                  '• macOS / Linux：打开终端，使用 cd 导航到该文件夹，' +
                  '然后输入 pwd 打印完整路径。',
              )
            }}
            className="text-xs uppercase tracking-widest border border-border px-5 py-3 hover:border-foreground transition-colors rounded-none shadow-none text-muted shrink-0"
          >
            浏览
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
        {detecting ? '检测中\u2026' : '检测格式'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2: Format Preview
// ---------------------------------------------------------------------------

function GenreSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const genres = [
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

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-border bg-background px-4 py-3 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors appearance-none cursor-pointer"
    >
      {genres.map((g) => (
        <option key={g.value} value={g.value}>
          {g.label}
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
      <h2 className="font-serif text-3xl tracking-tight mb-2">格式预览</h2>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-8">
        导入前检查检测结果
      </p>

      {/* Detection summary card */}
      <div className="border border-border p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span
            className={`w-2 h-2 rounded-full inline-block ${
              isCoNovel ? 'bg-green-500' : isUnknown ? 'bg-red-500' : 'bg-yellow-500'
            }`}
          />
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted">已检测格式</span>
        </div>

        <h3 className="font-serif text-xl tracking-tight mb-1">{detectResult.format}</h3>
        <p className="text-sm text-muted mb-4">{detectResult.description}</p>

        <div className="grid grid-cols-3 gap-4 text-[10px] uppercase tracking-[0.2em] text-muted">
          <div>
            <span className="block mb-1">置信度</span>
            <span className="text-sm font-sans text-foreground normal-case tracking-normal">
              {Math.round(detectResult.confidence * 100)}%
            </span>
          </div>
          <div>
            <span className="block mb-1">文件数量</span>
            <span className="text-sm font-sans text-foreground normal-case tracking-normal">
              {detectResult.files.length}
            </span>
          </div>
          <div>
            <span className="block mb-1">预计章节</span>
            <span className="text-sm font-sans text-foreground normal-case tracking-normal">
              {detectResult.estimatedChapters}
            </span>
          </div>
        </div>

        {detectResult.hasMetadata && (
          <div className="mt-4 pt-4 border-t border-border text-[10px] uppercase tracking-[0.2em] text-green-600">
            \u2713 已找到元数据文件
          </div>
        )}
        {detectResult.hasGit && (
          <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-green-600">
            \u2713 已检测到 Git 历史
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
            此目录是一个 CoNovel 项目。所有章节、角色和元数据将
            原样导入。
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
            文本/Markdown 文件将被解析并转换为 CoNovel 章节格式。你可以在
            下方可选地设置标题、类型和故事前提。
          </p>

          <div className="ml-5 text-[10px] uppercase tracking-[0.2em] text-muted space-y-1 mb-6">
            <p>
              预计章节: {detectResult.estimatedChapters}
            </p>
          </div>

          {/* Optional fields */}
          <div className="ml-5 space-y-5">
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
                标题 <span className="normal-case tracking-normal">（可选）</span>
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="未命名手稿"
                className="w-full border border-border bg-transparent px-4 py-3 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors placeholder:text-muted"
              />
            </label>

            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
                类型
              </span>
              <GenreSelect value={genre} onChange={setGenre} />
            </label>

            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
                故事前提 <span className="normal-case tracking-normal">（可选）</span>
              </span>
              <textarea
                value={premise}
                onChange={(e) => setPremise(e.target.value)}
                placeholder="简要描述故事内容..."
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
            此目录中的文件无法匹配到已知格式。导入可能会失败或
            产生不完整的结果。
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="text-xs uppercase tracking-widest border border-border px-6 py-3 hover:border-foreground transition-colors rounded-none shadow-none text-muted"
        >
          返回
        </button>
        <button
          onClick={onNext}
          className="text-xs uppercase tracking-widest border border-foreground px-8 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none"
        >
          继续
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
      setError(err?.message || '导入失败')
    } finally {
      setImporting(false)
    }
  }

  // Success state
  if (result) {
    return (
      <div className="max-w-2xl">
        <h2 className="font-serif text-3xl tracking-tight mb-2">导入完成</h2>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-8">
          你的手稿已准备就绪
        </p>

        <div className="border border-border p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-2 h-2 rounded-full inline-block bg-green-500" />
            <span className="text-sm font-sans">\u2713 导入成功</span>
          </div>

          <h3 className="font-serif text-xl tracking-tight mb-1">{result.title}</h3>

          <div className="grid grid-cols-3 gap-4 mt-4 text-[10px] uppercase tracking-[0.2em] text-muted">
            <div>
              <span className="block mb-1">格式</span>
              <span className="text-sm font-sans text-foreground normal-case tracking-normal">
                {result.format}
              </span>
            </div>
            <div>
              <span className="block mb-1">章节</span>
              <span className="text-sm font-sans text-foreground normal-case tracking-normal">
                {result.chapters}
              </span>
            </div>
            {result.totalWords != null && (
              <div>
                <span className="block mb-1">字数</span>
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
            仪表盘
          </Link>
          <button
            onClick={() => navigate(`/editor/${result.bookId}`)}
            className="text-xs uppercase tracking-widest border border-foreground px-8 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none"
          >
            打开编辑器
          </button>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-2xl">
        <h2 className="font-serif text-3xl tracking-tight mb-2">导入失败</h2>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-8">
          导入过程中出现问题
        </p>

        <div className="border border-red-400/40 bg-red-400/5 p-6 mb-8">
          <p className="text-sm text-red-600">{error}</p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onBack}
            className="text-xs uppercase tracking-widest border border-border px-6 py-3 hover:border-foreground transition-colors rounded-none shadow-none text-muted"
          >
            返回
          </button>
          <button
            onClick={handleImport}
            className="text-xs uppercase tracking-widest border border-foreground px-8 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  // Confirm state
  return (
    <div className="max-w-2xl">
      <h2 className="font-serif text-3xl tracking-tight mb-2">确认导入</h2>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-8">
        检查并开始导入流程
      </p>

      <div className="border border-border p-6 mb-8">
        <h3 className="font-serif text-xl tracking-tight mb-4">导入摘要</h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-border pb-3">
            <span className="text-muted">格式</span>
            <span className="font-sans">{detectResult.format}</span>
          </div>
          <div className="flex justify-between border-b border-border pb-3">
            <span className="text-muted">文件</span>
            <span className="font-sans">{detectResult.files.length}</span>
          </div>
          <div className="flex justify-between border-b border-border pb-3">
            <span className="text-muted">预计章节</span>
            <span className="font-sans">{detectResult.estimatedChapters}</span>
          </div>
          {title && (
            <div className="flex justify-between border-b border-border pb-3">
              <span className="text-muted">标题</span>
              <span className="font-sans">{title}</span>
            </div>
          )}
          <div className="flex justify-between border-b border-border pb-3">
            <span className="text-muted">类型</span>
            <span className="font-sans capitalize">{genre}</span>
          </div>
          {premise && (
            <div className="flex justify-between pb-1">
              <span className="text-muted">故事前提</span>
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
              导入中\u2026
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
          返回
        </button>
        <button
          onClick={handleImport}
          disabled={importing}
          className="text-xs uppercase tracking-widest border border-foreground px-8 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none disabled:opacity-40"
        >
          {importing ? '导入中\u2026' : '确认导入'}
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
  const [genre, setGenre] = useState('xuanhuan')
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
          <h1 className="font-serif text-3xl tracking-tight">导入手稿</h1>
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
