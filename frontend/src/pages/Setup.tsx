import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

interface ModelStatus {
  status: string
  percent: number
  bytes_downloaded: number
  total_bytes: number
  error: string | null
  modelReady: boolean
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

export default function Setup() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<ModelStatus>({
    status: 'idle',
    percent: 0,
    bytes_downloaded: 0,
    total_bytes: 0,
    error: null,
    modelReady: false,
  })
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<number | null>(null)

  // Poll model status every 2 seconds
  useEffect(() => {
    const poll = () => {
      fetch('/api/model/status')
        .then((r) => r.json())
        .then((data: ModelStatus) => {
          setStatus(data)
          if (data.modelReady) {
            // Brief pause then redirect
            setTimeout(() => navigate('/'), 800)
          }
        })
        .catch(() => {
          // Backend unreachable — assume ready
          setStatus((s) => ({ ...s, modelReady: true }))
        })
    }

    poll()
    const interval = window.setInterval(poll, 2000)
    return () => window.clearInterval(interval)
  }, [navigate])

  // Elapsed timer
  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setElapsed((e) => e + 1)
    }, 1000)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [])

  const isDownloading = status.status === 'downloading' && !status.modelReady
  const isReady = status.modelReady
  const isFailed = status.status === 'failed'

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background text-foreground">
      {/* Title */}
      <h1 className="font-serif text-4xl md:text-5xl tracking-tight mb-3">
        CoNovel
      </h1>

      {/* Subtitle */}
      <p className="text-[10px] uppercase tracking-[0.3em] text-muted mb-16">
        自主多智能体叙事系统
      </p>

      {/* Status text */}
      <div className="w-full max-w-sm mb-8 text-center">
        {isReady && (
          <p className="text-sm text-muted">
            初始化完成，正在进入...
          </p>
        )}
        {isDownloading && (
          <p className="text-sm text-muted">
            正在配置核心智能...{' '}
            <span className="tabular-nums">{status.percent}%</span>
          </p>
        )}
        {status.status === 'idle' && (
          <p className="text-sm text-muted">
            正在初始化模型管理器...
          </p>
        )}
        {isFailed && (
          <div>
            <p className="text-sm text-muted mb-2">
              向量模型下载失败
            </p>
            {status.error && (
              <p className="text-[10px] text-muted/60 mb-4">
                {status.error}
              </p>
            )}
            <button
              onClick={() => {
                fetch('/api/model/download', { method: 'POST' })
                setStatus((s) => ({ ...s, status: 'downloading', percent: 0, error: null }))
                setElapsed(0)
              }}
              className="text-xs uppercase tracking-widest border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none"
            >
              重试
            </button>
          </div>
        )}
      </div>

      {/* Progress bar — 2px thin editorial style */}
      <div className="w-full max-w-sm">
        <div className="w-full h-[2px] bg-border">
          <div
            className="h-[2px] bg-foreground transition-all duration-500 ease-out"
            style={{ width: `${isReady ? 100 : status.percent}%` }}
          />
        </div>

        {/* Download details */}
        {isDownloading && status.total_bytes > 0 && (
          <div className="flex items-center justify-between mt-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted/60">
              {formatBytes(status.bytes_downloaded)} / {formatBytes(status.total_bytes)}
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted/60 tabular-nums">
              {elapsed}s
            </span>
          </div>
        )}
        {isDownloading && status.total_bytes === 0 && (
          <div className="flex items-center justify-end mt-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted/60 tabular-nums">
              {elapsed}s
            </span>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <p className="absolute bottom-10 text-[10px] uppercase tracking-[0.2em] text-muted/40">
        首次启动需要下载向量模型，请耐心等待
      </p>
    </div>
  )
}
