import { useCallback, useEffect, useRef } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import type { EditorState } from 'lexical'
import { $getRoot, $createParagraphNode, $createTextNode } from 'lexical'

// ---------------------------------------------------------------------------
// Theme — Minimal Editorial styling, no markdown symbols
// ---------------------------------------------------------------------------

const THEME = {
  paragraph: 'editor-paragraph',
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
  },
}

// ---------------------------------------------------------------------------
// Placeholder Component
// ---------------------------------------------------------------------------

function Placeholder({ text }: { text: string }) {
  return (
    <div className="absolute top-0 left-0 text-muted/40 pointer-events-none select-none font-sans text-base leading-[1.8]">
      {text}
    </div>
  )
}

// ---------------------------------------------------------------------------
// InitPlugin — seeds initial content from external state
// ---------------------------------------------------------------------------

function InitPlugin({ initialContent }: { initialContent: string }) {
  const [editor] = useLexicalComposerContext()
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    if (!initialContent) return
    initialized.current = true

    editor.update(() => {
      const root = $getRoot()
      const paragraphs = initialContent.split('\n')
      for (const para of paragraphs) {
        const p = $createParagraphNode()
        const t = $createTextNode(para)
        p.append(t)
        root.append(p)
      }
    })
  }, [editor, initialContent])

  return null
}

// ---------------------------------------------------------------------------
// ExportPlugin — pushes editor state to parent via onChange
// ---------------------------------------------------------------------------

function ExportPlugin({
  onChange,
}: {
  onChange: (editorState: EditorState, text: string) => void
}) {
  const [_editor] = useLexicalComposerContext()

  const handleChange = useCallback(
    (state: EditorState) => {
      state.read(() => {
        const root = $getRoot()
        const text = root.getTextContent()
        onChange(state, text)
      })
    },
    [onChange],
  )

  return <OnChangePlugin onChange={handleChange} />
}

// ---------------------------------------------------------------------------
// LexicalEditor Props
// ---------------------------------------------------------------------------

interface LexicalEditorProps {
  initialContent?: string
  onChange?: (text: string) => void
  placeholder?: string
  fontSize?: number
  lineHeight?: number
}

// ---------------------------------------------------------------------------
// LexicalEditor Component
// ---------------------------------------------------------------------------

const INITIAL_CONFIG = {
  namespace: 'CoNovelEditor',
  theme: THEME,
  nodes: [],
  onError: (error: Error) => {
    console.error('[LexicalEditor]', error)
  },
}

export default function LexicalEditor({
  initialContent = '',
  onChange,
  placeholder = 'Begin writing your chapter here...\n\nThe agents will assist you in crafting compelling prose, maintaining character consistency, and tracking narrative threads.',
  fontSize = 16,
  lineHeight = 1.8,
}: LexicalEditorProps) {
  const handleChange = useCallback(
    (_state: EditorState, text: string) => {
      onChange?.(text)
    },
    [onChange],
  )

  return (
    <LexicalComposer initialConfig={INITIAL_CONFIG}>
      <div
        className="relative min-h-[60vh] w-full"
        style={{ fontSize: `${fontSize}px`, lineHeight }}
      >
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className="outline-none min-h-[60vh] w-full font-sans text-foreground caret-foreground"
              aria-label="Editor"
              // Chinese IME support — no composing guard needed for Lexical
            />
          }
          placeholder={<Placeholder text={placeholder} />}
          ErrorBoundary={({ children }) => (
            <div className="border border-border p-4 rounded-none text-sm text-muted">
              {children}
            </div>
          )}
        />
        <HistoryPlugin />
        <InitPlugin initialContent={initialContent} />
        <ExportPlugin onChange={handleChange} />
      </div>
    </LexicalComposer>
  )
}
