import { useUIStore } from '@/stores/uiStore'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
}

const colors = {
  success: 'border-foreground',
  error: 'border-foreground',
  info: 'border-muted',
}

export default function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts)
  const removeToast = useUIStore((s) => s.removeToast)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
      {toasts.map((t) => {
        const Icon = icons[t.type]
        return (
          <div
            key={t.id}
            className={`flex items-center gap-3 border ${colors[t.type]} bg-background px-4 py-3 text-sm min-w-[280px]`}
          >
            <Icon size={14} className="shrink-0" />
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 p-0.5 hover:bg-foreground/5"
            >
              <X size={12} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
