import { useState, useEffect, useCallback, useRef } from 'react'

// ---------------------------------------------------------------------------
// Action definitions
// ---------------------------------------------------------------------------

const ACTIONS = [
  { label: '润色', icon: '✦', description: 'Polish selected text' },
  { label: '扩写', icon: '↕', description: 'Expand selected text' },
  { label: '去AI味', icon: '↘', description: 'De-AI selected text' },
] as const

// ---------------------------------------------------------------------------
// FloatingToolbar — appears above text selection
// ---------------------------------------------------------------------------

interface FloatingToolbarProps {
  onAction?: (action: string, selectedText: string) => void
  onDeAI?: (selectedText: string) => void
  loading?: boolean
}

export default function FloatingToolbar({ onAction, onDeAI, loading }: FloatingToolbarProps) {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [selectedText, setSelectedText] = useState('')
  const toolbarRef = useRef<HTMLDivElement>(null)

  const handleMouseUp = useCallback(() => {
    // Delay slightly to ensure selection is final
    setTimeout(() => {
      const sel = window.getSelection()
      const text = sel?.toString().trim()
      if (text && text.length > 0 && sel?.rangeCount) {
        const range = sel.getRangeAt(0)
        const rect = range.getBoundingClientRect()

        // Position above the selection, centered
        const toolbarHeight = 40
        const top = rect.top + window.scrollY - toolbarHeight - 8
        const left = rect.left + window.scrollX + rect.width / 2

        setPosition({ top, left })
        setSelectedText(text)
        setVisible(true)
      } else {
        setVisible(false)
        setSelectedText('')
      }
    }, 10)
  }, [])

  // Hide when clicking outside the toolbar
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        // Let the mouseup handler check if there's still a selection
        return
      }
    },
    [],
  )

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mousedown', handleMouseDown)
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [handleMouseUp, handleMouseDown])

  // Hide on scroll
  useEffect(() => {
    function handleScroll() {
      setVisible(false)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!visible) return null

  return (
    <div
      ref={toolbarRef}
      className="fixed z-40 flex items-center border border-border bg-background rounded-none shadow-none -translate-x-1/2"
      style={{ top: position.top, left: position.left }}
    >
      {ACTIONS.map((action) => (
        <button
          key={action.label}
          onClick={() => {
            if (action.label === '去AI味') {
              onDeAI?.(selectedText)
            } else {
              onAction?.(action.label, selectedText)
            }
            setVisible(false)
          }}
          disabled={loading}
          title={action.description}
          className="px-3 py-2 text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors border-r border-border last:border-r-0 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="mr-1">{action.icon}</span>
          {loading && action.label === '去AI味' ? '处理中...' : action.label}
        </button>
      ))}
    </div>
  )
}
