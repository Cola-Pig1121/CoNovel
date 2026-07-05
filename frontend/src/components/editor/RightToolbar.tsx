import { useState } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import { useBookStore } from '@/stores/bookStore'
import ChatPanel from '@/components/ai/ChatPanel'
import CharacterInsight from '@/components/ai/CharacterInsight'

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type RightTab = 'outline' | 'characters' | 'ai' | 'settings'

const TABS: { key: RightTab; label: string }[] = [
  { key: 'outline', label: 'Outline' },
  { key: 'characters', label: 'Characters' },
  { key: 'ai', label: 'AI Assistant' },
  { key: 'settings', label: 'Settings' },
]

// ---------------------------------------------------------------------------
// Outline Panel
// ---------------------------------------------------------------------------

function OutlinePanel() {
  const { chapterNumber } = useEditorStore()

  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted mb-4">
        Chapter {chapterNumber ?? '—'} Outline
      </h3>
      <textarea
        placeholder="Write a brief outline for this chapter..."
        rows={8}
        className="w-full border border-border bg-transparent px-3 py-2 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors placeholder:text-muted resize-none"
      />
      <p className="text-[10px] text-muted mt-2 tracking-wide">
        Outline helps agents stay on track during generation.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Characters Panel
// ---------------------------------------------------------------------------

function CharactersPanel() {
  const { characters } = useBookStore()
  const { chapterNumber } = useEditorStore()

  const roleBadges: Record<string, string> = {
    protagonist: '主角',
    antagonist: '反派',
    supporting: '配角',
    minor: '龙套',
  }

  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted mb-4">
        Characters
      </h3>

      {characters.length === 0 && (
        <p className="text-sm text-muted mb-4">No characters defined yet.</p>
      )}

      <ul className="space-y-2 mb-4">
        {characters.map((c) => (
          <li
            key={c.id}
            className="border border-border p-3 rounded-none hover:border-foreground transition-colors flex items-center justify-between"
          >
            <div>
              <span className="text-sm font-serif">{c.name}</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted ml-2">
                {roleBadges[c.role] ?? c.role}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {/* Divider */}
      <div className="border-t border-border my-4" />

      {/* Character Intelligence */}
      <CharacterInsight chapterNumber={chapterNumber ?? 1} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Settings Panel
// ---------------------------------------------------------------------------

function SettingsPanel() {
  const [fontSize, setFontSize] = useState(16)
  const [lineHeight, setLineHeight] = useState(1.8)
  const [autoSave, setAutoSave] = useState(true)

  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted mb-4">
        Editor Settings
      </h3>

      <div className="space-y-5">
        {/* Font Size */}
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
            Font Size
          </span>
          <select
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-full border border-border bg-background px-3 py-2 text-xs font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors appearance-none cursor-pointer"
          >
            <option value={14}>14px</option>
            <option value={16}>16px</option>
            <option value={18}>18px</option>
            <option value={20}>20px</option>
          </select>
        </label>

        {/* Line Height */}
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
            Line Height
          </span>
          <select
            value={lineHeight}
            onChange={(e) => setLineHeight(Number(e.target.value))}
            className="w-full border border-border bg-background px-3 py-2 text-xs font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors appearance-none cursor-pointer"
          >
            <option value={1.6}>1.6</option>
            <option value={1.8}>1.8</option>
            <option value={2.0}>2.0</option>
            <option value={2.2}>2.2</option>
          </select>
        </label>

        {/* Auto-save toggle */}
        <label className="flex items-center justify-between py-2 cursor-pointer">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
            Auto-save
          </span>
          <button
            onClick={() => setAutoSave(!autoSave)}
            className={`text-xs border px-3 py-1 rounded-none transition-colors ${
              autoSave
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-transparent text-muted'
            }`}
          >
            {autoSave ? 'ON' : 'OFF'}
          </button>
        </label>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// RightToolbar — Main Component
// ---------------------------------------------------------------------------

interface RightToolbarProps {
  collapsed?: boolean
}

export default function RightToolbar({ collapsed = false }: RightToolbarProps) {
  const { rightPanelTab, setRightPanelTab } = useEditorStore()

  if (collapsed) return null

  return (
    <aside className="w-72 shrink-0 border-l border-border flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-border shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setRightPanelTab(tab.key)}
            className={`flex-1 py-3 text-[10px] uppercase tracking-[0.2em] transition-colors border-b-2 ${
              rightPanelTab === tab.key
                ? 'text-foreground border-foreground'
                : 'text-muted border-transparent hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {rightPanelTab === 'outline' && <OutlinePanel />}
        {rightPanelTab === 'characters' && <CharactersPanel />}
        {rightPanelTab === 'ai' && <ChatPanel />}
        {rightPanelTab === 'settings' && <SettingsPanel />}
      </div>
    </aside>
  )
}
