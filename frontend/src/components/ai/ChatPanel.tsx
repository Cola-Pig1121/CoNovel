import { useState, useRef, useEffect, useCallback } from 'react'
import { streamGenerate, questionApi } from '@/lib/api'
import { useBookStore } from '@/stores/bookStore'
import { useEditorStore } from '@/stores/editorStore'
import type { Questionnaire, QuestionAnswer } from '@/lib/types'
import QuestionDialog from './QuestionDialog'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  text: string
  timestamp: string
}

// ---------------------------------------------------------------------------
// Quick Actions
// ---------------------------------------------------------------------------

const QUICK_ACTIONS = [
  { label: '续写', prompt: '请根据当前上下文继续写作' },
  { label: '润色', prompt: '请润色当前选中的文本，提升文学性' },
  { label: '去AI味', prompt: '请去除当前文本的AI痕迹，使其更自然' },
  { label: '分析角色', prompt: '请分析当前场景中角色的行为一致性' },
  { label: '检查连续性', prompt: '请检查当前章节与前文的连续性问题' },
  { label: '生成大纲', prompt: '请为下一章生成详细大纲' },
] as const

// ---------------------------------------------------------------------------
// ChatPanel Component
// ---------------------------------------------------------------------------

export default function ChatPanel() {
  const { currentBook } = useBookStore()
  const { content, chapterNumber } = useEditorStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [pendingQuestionnaire, setPendingQuestionnaire] = useState<Questionnaire | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // -- Poll for pending questionnaires --
  useEffect(() => {
    let active = true
    async function poll() {
      try {
        const pending = await questionApi.listPending()
        if (active && pending.length > 0 && !pendingQuestionnaire) {
          const first = pending[0]
          if (first) setPendingQuestionnaire(first)
        }
      } catch {
        // silently fail
      }
    }
    poll()
    const interval = setInterval(poll, 3000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [pendingQuestionnaire])

  // -- Handle question submit --
  const handleQuestionSubmit = useCallback(
    async (answers: QuestionAnswer[]) => {
      if (!pendingQuestionnaire) return
      try {
        await questionApi.answer(pendingQuestionnaire.id, answers)
        // Add answers to chat as a system message
        const summary = answers
          .map((a) => {
            const val = a.kind === 'multi' ? (a.selected ?? []).join(', ') : (a.answer ?? '—')
            return `Q: ${a.question}\nA: ${val}${a.notes ? `\nNotes: ${a.notes}` : ''}`
          })
          .join('\n\n')
        const answerMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          text: `[Questionnaire Answers]\n${summary}`,
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, answerMsg])
      } catch (err) {
        console.error('Failed to submit questionnaire:', err)
      } finally {
        setPendingQuestionnaire(null)
      }
    },
    [pendingQuestionnaire],
  )

  const handleQuestionCancel = useCallback(async () => {
    if (!pendingQuestionnaire) return
    try {
      await questionApi.cancel(pendingQuestionnaire.id)
    } catch {
      // silently fail
    }
    setPendingQuestionnaire(null)
  }, [pendingQuestionnaire])

  const handleSend = useCallback(
    async (text?: string) => {
      const prompt = (text || input).trim()
      if (!prompt || isStreaming) return

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        text: prompt,
        timestamp: new Date().toISOString(),
      }

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'ai',
        text: '',
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, userMsg, aiMsg])
      setInput('')
      setIsStreaming(true)

      try {
        const historyContext = messages
          .map((m) => `${m.role === 'user' ? '作者' : 'AI'}: ${m.text}`)
          .join('\n')

        const generator = streamGenerate('writing', {
          prompt,
          genre: currentBook?.genre ?? '',
          historyContext: historyContext + '\n\n--- 当前章节内容 ---\n' + content.slice(-2000),
        })

        let accumulated = ''
        for await (const chunk of generator) {
          accumulated += chunk
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsg.id ? { ...m, text: accumulated } : m,
            ),
          )
        }
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsg.id
              ? { ...m, text: `[Error] ${String(err)}` }
              : m,
          ),
        )
      } finally {
        setIsStreaming(false)
      }
    },
    [input, isStreaming, messages, content, currentBook],
  )

  // ---- Keyboard shortcut ----
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSend()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleSend])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 shrink-0">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted">
          AI Assistant
        </h3>
        <p className="text-[10px] text-muted mt-1">
          Ch. {chapterNumber ?? '—'} · {currentBook?.genre ?? ''}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-1.5 px-4 py-3 border-b border-border shrink-0">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => handleSend(action.prompt)}
            disabled={isStreaming}
            className="text-[10px] uppercase tracking-widest border border-border px-2.5 py-1 hover:border-foreground hover:text-foreground transition-colors rounded-none shadow-none disabled:opacity-30"
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-muted/60 italic text-center">
              与AI对话，获取写作建议<br />
              <span className="text-[10px] uppercase tracking-[0.2em]">
                Ctrl+Enter to send
              </span>
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'text-foreground'
                : 'text-muted border-l-2 border-border pl-3'
            }`}
          >
            <div className="font-serif whitespace-pre-wrap">{msg.text}</div>
            {msg.role === 'ai' && msg.text === '' && isStreaming && (
              <span className="inline-block w-2 h-4 bg-foreground animate-pulse" />
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border px-4 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="输入指令..."
            disabled={isStreaming}
            className="flex-1 border border-border bg-transparent px-3 py-2 text-xs font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors placeholder:text-muted disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={isStreaming || !input.trim()}
            className="text-xs uppercase tracking-widest border border-foreground px-4 py-2 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isStreaming ? '...' : 'Send'}
          </button>
        </div>
      </div>

      {/* Question Dialog */}
      {pendingQuestionnaire && (
        <QuestionDialog
          questionnaire={pendingQuestionnaire}
          onSubmit={handleQuestionSubmit}
          onCancel={handleQuestionCancel}
        />
      )}
    </div>
  )
}
