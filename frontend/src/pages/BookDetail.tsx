import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useBookStore } from '@/stores/bookStore'
import {
  constraintsApi,
  memoryApi,
  pipelineApi,
  styleApi,
} from '@/lib/api'
import type {
  ChapterMeta,
  ForeshadowingItem,
  TimelineEvent,
  WritingTechnique,
} from '@/lib/types'

// ===========================================================================
// Tab groups & definitions
// ===========================================================================

const TAB_GROUPS = [
  {
    label: 'Project',
    tabs: ['Outline', 'Chapters', 'Characters', 'Foreshadowing', 'Timeline'],
  },
  {
    label: 'Creative',
    tabs: ['Style', 'Constraints', 'Memory', 'Reference', 'Naming'],
  },
  {
    label: 'Analysis',
    tabs: ['Hooks', 'ReadingPower', 'Techniques'],
  },
  {
    label: 'System',
    tabs: ['GitHistory', 'Write'],
  },
] as const

type TabName = (typeof TAB_GROUPS)[number]['tabs'][number]

// ===========================================================================
// Tab Content Components
// ===========================================================================

// ---------------------------------------------------------------------------
// Outline Tab
// ---------------------------------------------------------------------------

function OutlineTab() {
  const { currentBook } = useBookStore()
  const [outlineText, setOutlineText] = useState('')

  useEffect(() => {
    if (currentBook?.outline?.volumes) {
      const lines = currentBook.outline.volumes.map((vol) => {
        const chapterLines = vol.chapters
          .map(
            (ch) =>
              `  ${String(ch.chapterNumber).padStart(2, '0')}. ${ch.title} — ${ch.summary}`,
          )
          .join('\n')
        return `${vol.title}\n${chapterLines}`
      })
      setOutlineText(lines.join('\n\n'))
    }
  }, [currentBook])

  return (
    <div className="border border-border p-6 rounded-none">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl tracking-tight">Outline</h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted mt-1">
            Volume & chapter structure
          </p>
        </div>
        <button className="text-xs uppercase tracking-widest border border-foreground px-4 py-2 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none">
          + Add Volume
        </button>
      </div>

      <textarea
        value={outlineText}
        onChange={(e) => setOutlineText(e.target.value)}
        placeholder="Define your story outline here..."
        rows={20}
        className="w-full border border-border bg-transparent px-4 py-3 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors placeholder:text-muted resize-none leading-relaxed"
      />

      <div className="flex justify-end mt-4">
        <button className="text-xs uppercase tracking-widest border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none">
          Save Outline
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chapters Tab
// ---------------------------------------------------------------------------

function ChaptersTab() {
  const { bookId } = useSearchParamsToObject()
  const { chapters } = useBookStore()
  const [chapterList, setChapterList] = useState<ChapterMeta[]>(chapters)

  useEffect(() => {
    setChapterList(chapters)
  }, [chapters])

  const totalWords = chapterList.reduce((sum, ch) => sum + ch.wordCount, 0)

  return (
    <div className="border border-border p-6 rounded-none">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl tracking-tight">Chapters</h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted mt-1">
            {chapterList.length} chapters · {totalWords.toLocaleString()} total 字
          </p>
        </div>
      </div>

      <div className="space-y-0">
        {chapterList.map((ch) => (
          <div
            key={ch.chapterNumber}
            className="flex items-center justify-between border-b border-border py-4 group hover:bg-foreground/[0.02] transition-colors px-2 -mx-2"
          >
            <div className="flex items-center gap-4">
              <span className="text-[10px] tabular-nums text-muted w-6 text-right">
                {String(ch.chapterNumber).padStart(2, '0')}
              </span>
              <div>
                <span className="text-sm font-serif">{ch.title}</span>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
                    {ch.wordCount.toLocaleString()} 字
                  </span>
                  <span
                    className={`text-[10px] uppercase tracking-widest border px-2 py-0 rounded-none ${
                      ch.status === 'final'
                        ? 'border-foreground bg-foreground text-background'
                        : ch.status === 'reviewed'
                          ? 'border-foreground/50 text-foreground'
                          : 'border-border text-muted'
                    }`}
                  >
                    {ch.status}
                  </span>
                </div>
              </div>
            </div>
            <Link
              to={`/editor?bookId=${bookId}&chapter=${ch.chapterNumber}`}
              className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
            >
              Edit →
            </Link>
          </div>
        ))}

        {chapterList.length === 0 && (
          <p className="text-sm text-muted py-8 text-center">
            No chapters yet. Start writing to create chapters.
          </p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Characters Tab
// ---------------------------------------------------------------------------

function CharactersTab() {
  const { characters } = useBookStore()

  const roleLabels: Record<string, string> = {
    protagonist: '主角',
    antagonist: '反派',
    supporting: '配角',
    minor: '龙套',
  }

  return (
    <div className="border border-border p-6 rounded-none">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl tracking-tight">Characters</h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted mt-1">
            {characters.length} character{characters.length !== 1 && 's'}
          </p>
        </div>
        <button className="text-xs uppercase tracking-widest border border-foreground px-4 py-2 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none">
          + Add Character
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {characters.map((c) => (
          <div
            key={c.id}
            className="border border-border p-6 rounded-none hover:border-foreground transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif text-lg tracking-tight">{c.name}</h3>
              <span className="text-[10px] uppercase tracking-widest border border-border px-2 py-0.5">
                {roleLabels[c.role] ?? c.role}
              </span>
            </div>

            <div className="space-y-2 text-xs text-muted">
              <p>
                <span className="uppercase tracking-[0.2em] text-[10px]">
                  Emotion:{' '}
                </span>
                {c.emotionalState.current} ({c.emotionalState.intensity}%)
              </p>
              <p>
                <span className="uppercase tracking-[0.2em] text-[10px]">
                  Trust:{' '}
                </span>
                {Object.keys(c.relationships).length} relationship
                {Object.keys(c.relationships).length !== 1 && 's'}
              </p>
            </div>

            <div className="flex gap-2 mt-4">
              <button className="text-[10px] uppercase tracking-widest border border-border px-3 py-1.5 hover:border-foreground transition-colors">
                Edit
              </button>
              <button className="text-[10px] uppercase tracking-widest border border-border px-3 py-1.5 hover:border-foreground transition-colors text-muted">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {characters.length === 0 && (
        <p className="text-sm text-muted py-8 text-center">
          No characters defined yet.
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Foreshadowing Tab
// ---------------------------------------------------------------------------

function ForeshadowingTab() {
  const { currentBook } = useBookStore()
  const items: ForeshadowingItem[] = currentBook?.foreshadowing ?? []

  const typeLabels = {
    planted: '已埋',
    hinted: '暗示',
    resolved: '已解',
    overdue: '超期',
  }

  const urgencyStyles = {
    low: 'border-border text-muted',
    medium: 'border-foreground/50 text-foreground',
    high: 'border-foreground bg-foreground/5 text-foreground',
    critical: 'border-foreground bg-foreground text-background',
  }

  return (
    <div className="border border-border p-6 rounded-none">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl tracking-tight">Foreshadowing</h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted mt-1">
            Track narrative threads and their resolution
          </p>
        </div>
        <button className="text-xs uppercase tracking-widest border border-foreground px-4 py-2 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none">
          + Add Thread
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="border border-border p-4 rounded-none hover:border-foreground transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-[10px] uppercase tracking-widest border px-2 py-0.5 rounded-none ${
                  urgencyStyles[item.urgency]
                }`}
              >
                {item.urgency}
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
                {typeLabels[item.type]} · Ch. {item.plantedInChapter}
                {item.resolvedInChapter
                  ? ` → ${item.resolvedInChapter}`
                  : ''}
              </span>
            </div>
            <p className="text-sm leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted py-8 text-center">
          No foreshadowing threads defined.
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Timeline Tab
// ---------------------------------------------------------------------------

function TimelineTab() {
  const { currentBook } = useBookStore()
  const events: TimelineEvent[] = currentBook?.timeline ?? []

  return (
    <div className="border border-border p-6 rounded-none">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl tracking-tight">Timeline</h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted mt-1">
            In-world chronological events
          </p>
        </div>
        <button className="text-xs uppercase tracking-widest border border-foreground px-4 py-2 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none">
          + Add Event
        </button>
      </div>

      <div className="relative border-l border-border ml-4">
        {events.map((evt) => (
          <div key={evt.id} className="relative pl-6 pb-6">
            <div className="absolute -left-1 top-1 w-2 h-2 border border-foreground bg-background" />
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
              Ch. {evt.chapterNumber} · {evt.location}
            </div>
            <p className="text-sm leading-relaxed">{evt.description}</p>
            <div className="flex gap-2 mt-1">
              {evt.characters.map((name) => (
                <span
                  key={name}
                  className="text-[10px] uppercase tracking-widest border border-border px-1.5 py-0"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {events.length === 0 && (
        <p className="text-sm text-muted py-8 text-center">
          No timeline events recorded.
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Style Tab
// ---------------------------------------------------------------------------

function StyleTab() {
  const [narrativeVoice, setNarrativeVoice] = useState('third-limited')
  const [tone, setTone] = useState('')
  const [bannedWords, setBannedWords] = useState('')

  return (
    <div className="border border-border p-6 rounded-none">
      <h2 className="font-serif text-2xl tracking-tight mb-6">Style Profile</h2>

      <div className="space-y-6">
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
            Narrative Voice
          </span>
          <select
            value={narrativeVoice}
            onChange={(e) => setNarrativeVoice(e.target.value)}
            className="w-full border border-border bg-background px-4 py-3 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors appearance-none cursor-pointer"
          >
            <option value="first">First Person</option>
            <option value="third-limited">Third Person Limited</option>
            <option value="third-omniscient">Third Person Omniscient</option>
            <option value="second">Second Person</option>
          </select>
        </label>

        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
            Tone
          </span>
          <textarea
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            placeholder="Describe the desired tone (e.g., dark, literary, humorous)..."
            rows={3}
            className="w-full border border-border bg-transparent px-4 py-3 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors placeholder:text-muted resize-none"
          />
        </label>

        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
            Banned Words (one per line)
          </span>
          <textarea
            value={bannedWords}
            onChange={(e) => setBannedWords(e.target.value)}
            placeholder="List words or phrases to avoid..."
            rows={4}
            className="w-full border border-border bg-transparent px-4 py-3 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors placeholder:text-muted resize-none"
          />
        </label>

        <div className="flex justify-end">
          <button className="text-xs uppercase tracking-widest border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none">
            Save Style
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Constraints Tab
// ---------------------------------------------------------------------------

function ConstraintsTab() {
  const { bookId } = useSearchParamsToObject()
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!bookId) return
    constraintsApi
      .get(bookId)
      .then((res) => setContent(res.content))
      .catch(() => {
        /* no constraints yet — leave empty */
      })
  }, [bookId])

  async function handleSave() {
    if (!bookId) return
    setSaving(true)
    setSaveMsg(null)
    try {
      await constraintsApi.save(bookId, content)
      setSaveMsg('已保存')
      setTimeout(() => setSaveMsg(null), 2000)
    } catch (err) {
      setSaveMsg('保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-border p-6 rounded-none">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl tracking-tight">Constraints</h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted mt-1">
            Constraint file — rules the agents must follow
          </p>
        </div>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="# Constraints&#10;&#10;Write your constraint rules here. These will be passed to every agent in the pipeline."
        rows={24}
        className="w-full border border-border bg-transparent px-4 py-3 text-sm font-mono rounded-none shadow-none outline-none focus:border-foreground transition-colors placeholder:text-muted resize-none leading-relaxed"
      />

      <div className="flex items-center justify-end gap-3 mt-4">
        {saveMsg && (
          <span className="text-xs text-muted">{saveMsg}</span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-xs uppercase tracking-widest border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none disabled:opacity-30"
        >
          {saving ? 'Saving...' : 'Save Constraints'}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Memory Tab — 4 sub-tabs: Facts, Characters, Long-term, Search
// ---------------------------------------------------------------------------

type MemorySubTab = 'facts' | 'characters' | 'long-term' | 'search'

const MEMORY_SUB_TABS: { key: MemorySubTab; label: string }[] = [
  { key: 'facts', label: '事实流' },
  { key: 'characters', label: '角色档案' },
  { key: 'long-term', label: '长期记忆' },
  { key: 'search', label: '记忆检索' },
]

// ---------------------------------------------------------------------------
// FactsTab — extracted facts grouped by chapter
// ---------------------------------------------------------------------------

function FactsTab() {
  const { bookId } = useSearchParamsToObject()
  const [facts, setFacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!bookId) return
    setLoading(true)
    memoryApi
      .getFacts(bookId)
      .then((data) => setFacts(Array.isArray(data) ? data : []))
      .catch(() => setFacts([]))
      .finally(() => setLoading(false))
  }, [bookId])

  // Group facts by chapter
  const byChapter = new Map<number, any[]>()
  for (const fact of facts) {
    const ch = fact.chapter ?? fact.chapter_number ?? 0
    const arr = byChapter.get(ch) ?? []
    arr.push(fact)
    byChapter.set(ch, arr)
  }

  const categoryColor: Record<string, string> = {
    character: 'border-foreground bg-foreground text-background',
    event: 'border-foreground/50 text-foreground',
    world: 'border-border text-muted',
    relationship: 'border-foreground/30 text-foreground',
    emotion: 'border-border text-muted',
  }

  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted mb-4">
        事实流 · 从章节中自动提取的结构化事实 ({facts.length})
      </h3>

      {loading && (
        <p className="text-sm text-muted italic">加载中...</p>
      )}

      {!loading && facts.length === 0 && (
        <div className="border border-border p-6">
          <p className="text-sm text-muted italic">运行 Pipeline 后将自动提取事实。</p>
          <p className="text-[10px] text-muted mt-2">
            事实由 Observer Agent 从每章提取，按类别（角色、事件、世界、关系、情感）分类，存储在 memory/facts/ 目录。
          </p>
        </div>
      )}

      {!loading && facts.length > 0 && (
        <div className="space-y-6">
          {Array.from(byChapter.entries())
            .sort(([a], [b]) => a - b)
            .map(([chapter, chapterFacts]) => (
              <div key={chapter}>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-3 border-b border-border pb-2">
                  第{chapter}章 · {chapterFacts.length} 条事实
                </div>
                <div className="space-y-2">
                  {chapterFacts.map((fact, i) => (
                    <div
                      key={i}
                      className="border border-border p-4 hover:border-foreground transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`text-[10px] uppercase tracking-widest border px-2 py-0 ${
                            categoryColor[fact.category ?? ''] ?? 'border-border text-muted'
                          }`}
                        >
                          {fact.category ?? 'unknown'}
                        </span>
                        {fact.subject && (
                          <span className="text-xs text-muted">{fact.subject}</span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed">{fact.content ?? fact.text ?? fact.description ?? JSON.stringify(fact)}</p>
                      {fact.evidence && (
                        <p className="text-xs text-muted mt-2 italic">「{fact.evidence}」</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// CharacterStatesTab — character memory states with emotional arcs
// ---------------------------------------------------------------------------

function CharacterStatesTab() {
  const { bookId } = useSearchParamsToObject()
  const { characters } = useBookStore()
  const [charStates, setCharStates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!bookId) return
    setLoading(true)
    memoryApi
      .getCharacterStates(bookId)
      .then((data) => setCharStates(Array.isArray(data) ? data : []))
      .catch(() => setCharStates([]))
      .finally(() => setLoading(false))
  }, [bookId])

  // Fallback: use character profiles from store if no memory states
  const displayStates =
    charStates.length > 0
      ? charStates
      : characters.map((c) => ({
          name: c.name,
          char_id: c.id,
          role: c.role,
          emotional_state: c.emotionalState?.current ?? '未知',
          mood_history: [],
          known_facts: c.knowledgeBoundary?.knows ?? [],
          relationships: c.relationships ?? {},
        }))

  const moodColor = (mood: string) => {
    const m = mood.toLowerCase()
    if (m.includes('愤怒') || m.includes('angry') || m.includes('怒')) return 'text-red-400'
    if (m.includes('开心') || m.includes('happy') || m.includes('喜')) return 'text-green-400'
    if (m.includes('悲伤') || m.includes('sad') || m.includes('悲')) return 'text-blue-400'
    if (m.includes('恐惧') || m.includes('fear') || m.includes('恐')) return 'text-yellow-400'
    if (m.includes('平静') || m.includes('calm') || m.includes('平')) return 'text-muted'
    return 'text-foreground'
  }

  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted mb-4">
        角色档案 · 角色在记忆系统中的状态 ({displayStates.length})
      </h3>

      {loading && (
        <p className="text-sm text-muted italic">加载中...</p>
      )}

      {!loading && displayStates.length === 0 && (
        <div className="border border-border p-6">
          <p className="text-sm text-muted italic">暂无角色记忆数据。</p>
          <p className="text-[10px] text-muted mt-2">
            运行 Pipeline 后，角色的情绪变化、认知边界和关系动态将自动记录到 memory/character_states/ 目录。
          </p>
        </div>
      )}

      {!loading && displayStates.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {displayStates.map((c: any) => {
            const moodHistory: Array<{ chapter: number; mood: string; trigger: string }> =
              c.mood_history ?? []
            return (
              <div key={c.char_id ?? c.name} className="border border-border p-5 hover:border-foreground transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-serif text-lg tracking-tight">{c.name ?? c.char_id}</p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted">{c.role ?? '角色'}</p>
                  </div>
                  <span className={`text-sm font-serif ${moodColor(c.emotional_state ?? '未知')}`}>
                    {c.emotional_state ?? '未知'}
                  </span>
                </div>

                {/* Emotional Arc */}
                {moodHistory.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-2">情绪弧线</p>
                    <div className="relative border-l border-border ml-2">
                      {moodHistory.slice(-5).map((h, i) => (
                        <div key={i} className="relative pl-4 pb-2">
                          <div className="absolute -left-1 top-1 w-1.5 h-1.5 border border-foreground bg-background" />
                          <span className="text-[10px] text-muted">Ch.{h.chapter}</span>
                          <span className={`text-xs ml-2 ${moodColor(h.mood)}`}>{h.mood}</span>
                          {h.trigger && (
                            <span className="text-[10px] text-muted ml-1">— {h.trigger}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Known Facts */}
                {(c.known_facts ?? []).length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">已知事实</p>
                    <div className="flex flex-wrap gap-1">
                      {(c.known_facts ?? []).slice(0, 5).map((f: string, i: number) => (
                        <span key={i} className="text-[10px] border border-border px-1.5 py-0 text-muted">
                          {f.length > 40 ? f.slice(0, 40) + '…' : f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Relationships */}
                {Object.keys(c.relationships ?? {}).length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">关系</p>
                    <div className="space-y-1">
                      {Object.entries(c.relationships).slice(0, 3).map(([name, rel]: [string, any]) => (
                        <div key={name} className="flex items-center gap-2 text-xs text-muted">
                          <span className="border border-border px-1.5 py-0">{rel.type ?? rel.relationship_type ?? '—'}</span>
                          <span>→ {name}</span>
                          {rel.trust !== undefined && (
                            <span className="tabular-nums">{Math.round(rel.trust * 100)}%</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// LongTermTab — world facts, active plot threads, style evolution
// ---------------------------------------------------------------------------

function LongTermTab() {
  const { bookId } = useSearchParamsToObject()
  const [longTerm, setLongTerm] = useState<any>(null)
  const [summaries, setSummaries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!bookId) return
    setLoading(true)
    Promise.all([
      memoryApi.getLongTerm(bookId).catch(() => null),
      memoryApi.getSummaries(bookId).catch(() => []),
    ])
      .then(([lt, sums]) => {
        setLongTerm(lt)
        setSummaries(Array.isArray(sums) ? sums : [])
      })
      .finally(() => setLoading(false))
  }, [bookId])

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted mb-4">
          长期记忆 · 世界观事实、活跃情节线索、风格演变
        </h3>

        {loading && (
          <p className="text-sm text-muted italic">加载中...</p>
        )}

        {!loading && !longTerm && summaries.length === 0 && (
          <div className="border border-border p-6">
            <p className="text-sm text-muted italic">暂无长期记忆数据。</p>
            <p className="text-[10px] text-muted mt-2">
              长期记忆在多章写作后自动积累，包含世界观事实、活跃情节线索和风格演变数据。至少完成2章后开始生成。
            </p>
          </div>
        )}
      </div>

      {/* World Facts */}
      {!loading && longTerm?.world_facts && (
        <div>
          <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted mb-3">
            世界观事实 ({(longTerm.world_facts ?? []).length})
          </h4>
          <div className="space-y-2">
            {(longTerm.world_facts ?? []).map((fact: any, i: number) => (
              <div key={i} className="border border-border p-3 hover:border-foreground transition-colors">
                <p className="text-sm leading-relaxed">{typeof fact === 'string' ? fact : fact.content ?? fact.description ?? JSON.stringify(fact)}</p>
                {fact.chapter && (
                  <span className="text-[10px] text-muted mt-1 block">Ch.{fact.chapter}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Plot Threads */}
      {!loading && longTerm?.active_threads && (
        <div>
          <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted mb-3">
            活跃情节线索 ({(longTerm.active_threads ?? []).length})
          </h4>
          <div className="space-y-2">
            {(longTerm.active_threads ?? []).map((thread: any, i: number) => (
              <div key={i} className="border border-border p-3 hover:border-foreground transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm">{typeof thread === 'string' ? thread : thread.description ?? thread.content ?? JSON.stringify(thread)}</p>
                  {thread.importance && (
                    <span className={`text-[10px] uppercase tracking-widest border px-2 py-0 ${
                      thread.importance === 'critical'
                        ? 'border-foreground bg-foreground text-background'
                        : thread.importance === 'major'
                          ? 'border-foreground/50 text-foreground'
                          : 'border-border text-muted'
                    }`}>
                      {thread.importance}
                    </span>
                  )}
                </div>
                {thread.planted_chapter !== undefined && (
                  <span className="text-[10px] text-muted">
                    埋设于 Ch.{thread.planted_chapter}
                    {thread.status ? ` · ${thread.status}` : ''}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Style Evolution */}
      {!loading && longTerm?.style_evolution && (
        <div>
          <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted mb-3">
            风格演变
          </h4>
          <div className="border border-border p-4">
            <pre className="text-xs text-muted whitespace-pre-wrap font-mono leading-relaxed">
              {typeof longTerm.style_evolution === 'string'
                ? longTerm.style_evolution
                : JSON.stringify(longTerm.style_evolution, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Chapter Summary Chain */}
      {!loading && summaries.length > 0 && (
        <div>
          <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted mb-3">
            章节摘要链 ({summaries.length})
          </h4>
          <div className="relative border-l border-border ml-4">
            {summaries.map((s: any) => (
              <div key={s.chapter ?? s.chapter_number} className="relative pl-6 pb-5">
                <div className="absolute -left-1.5 top-1 w-2.5 h-2.5 border border-foreground bg-background" />
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
                  第{s.chapter ?? s.chapter_number}章 · {s.created_at ? new Date(s.created_at).toLocaleDateString() : ''}
                </div>
                <p className="text-sm leading-relaxed">{s.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SearchTab — search box querying memory/search endpoint
// ---------------------------------------------------------------------------

function SearchTab() {
  const { bookId } = useSearchParamsToObject()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSearch() {
    if (!bookId || !query.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const data = await memoryApi.searchFacts(bookId, query.trim(), category || undefined)
      setResults(Array.isArray(data) ? data : [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted mb-4">
        记忆检索 · 在所有记忆中搜索事实和信息
      </h3>

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入关键词搜索记忆..."
          className="flex-1 border border-border bg-transparent px-4 py-3 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors placeholder:text-muted"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-border bg-background px-4 py-3 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors appearance-none cursor-pointer"
        >
          <option value="">全部类别</option>
          <option value="character">角色</option>
          <option value="event">事件</option>
          <option value="world">世界</option>
          <option value="relationship">关系</option>
          <option value="emotion">情感</option>
        </select>
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="text-xs uppercase tracking-widest border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none disabled:opacity-30"
        >
          {loading ? '检索中...' : '检索'}
        </button>
      </div>

      {loading && (
        <p className="text-sm text-muted italic">检索中...</p>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="border border-border p-6">
          <p className="text-sm text-muted italic">未找到匹配的记忆。</p>
          <p className="text-[10px] text-muted mt-2">尝试使用不同的关键词或放宽类别筛选。</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted">
            找到 {results.length} 条匹配结果
          </p>
          {results.map((r, i) => (
            <div key={i} className="border border-border p-4 hover:border-foreground transition-colors">
              <div className="flex items-center gap-2 mb-2">
                {r.category && (
                  <span className="text-[10px] uppercase tracking-widest border border-border px-2 py-0 text-muted">
                    {r.category}
                  </span>
                )}
                {r.chapter !== undefined && (
                  <span className="text-[10px] text-muted">Ch.{r.chapter}</span>
                )}
                {r.score !== undefined && (
                  <span className="text-[10px] text-muted tabular-nums ml-auto">
                    相关度: {typeof r.score === 'number' ? (r.score * 100).toFixed(0) : r.score}%
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed">
                {r.content ?? r.text ?? r.description ?? JSON.stringify(r)}
              </p>
              {r.subject && (
                <p className="text-xs text-muted mt-1">{r.subject}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && !searched && (
        <div className="text-center py-12">
          <p className="text-sm text-muted">
            输入关键词后按回车或点击「检索」按钮搜索记忆库。
          </p>
          <p className="text-xs text-muted mt-2">
            支持按角色、事件、世界、关系、情感等类别筛选。
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// MemoryTab — main container with sub-tab navigation
// ---------------------------------------------------------------------------

function MemoryTab() {
  const [subTab, setSubTab] = useState<MemorySubTab>('facts')

  return (
    <div className="border border-border p-6 rounded-none">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl tracking-tight">记忆系统</h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted mt-1">
            Memory — structured facts, character states, and long-term knowledge
          </p>
        </div>
      </div>

      {/* Sub-tab bar */}
      <div className="flex items-center gap-0 border-b border-border mb-6">
        {MEMORY_SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`text-xs uppercase tracking-widest px-5 py-3 border-b-2 transition-colors whitespace-nowrap ${
              subTab === tab.key
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      <div>
        {subTab === 'facts' && <FactsTab />}
        {subTab === 'characters' && <CharacterStatesTab />}
        {subTab === 'long-term' && <LongTermTab />}
        {subTab === 'search' && <SearchTab />}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Reference Tab
// ---------------------------------------------------------------------------

function ReferenceTab() {
  const { currentBook } = useBookStore()
  const [filePath, setFilePath] = useState('')
  const [outputPath, setOutputPath] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAnalyzeStyle() {
    if (!filePath.trim()) return
    setAnalyzing(true)
    setResult(null)
    setError(null)
    try {
      // Default output path: style.json in the book directory
      const out = outputPath.trim() || (currentBook ? `data/books/${currentBook.id}/style.json` : '')
      const res = await styleApi.analyze(filePath, out)
      if (res.error) {
        setError(res.error)
      } else {
        setResult(res.result ?? 'Style analysis complete.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Style analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="border border-border p-6 rounded-none">
      <h2 className="font-serif text-2xl tracking-tight mb-6">Reference Novel</h2>

      <div className="border border-border p-8 rounded-none text-center mb-6">
        <p className="text-sm text-muted mb-4">
          Upload a reference novel to analyze its style and structure.
        </p>
        <div className="border-2 border-dashed border-border p-8 mb-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted">
            Drag & drop .txt file or click to browse
          </p>
        </div>
        <button className="text-xs uppercase tracking-widest border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none">
          Upload Reference
        </button>
      </div>

      {/* Analyze Style */}
      <div className="border border-border p-6 rounded-none">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted mb-4">
          Style Analysis
        </h3>

        <div className="space-y-4">
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
              Reference File Path
            </span>
            <input
              type="text"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="/absolute/path/to/reference-novel.txt"
              className="w-full border border-border bg-transparent px-4 py-3 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors placeholder:text-muted"
            />
          </label>

          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
              Output Path (optional)
            </span>
            <input
              type="text"
              value={outputPath}
              onChange={(e) => setOutputPath(e.target.value)}
              placeholder="Auto: data/books/{bookId}/style.json"
              className="w-full border border-border bg-transparent px-4 py-3 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors placeholder:text-muted"
            />
          </label>

          <div className="flex items-center gap-4">
            <button
              onClick={handleAnalyzeStyle}
              disabled={analyzing || !filePath.trim()}
              className="text-xs uppercase tracking-widest border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {analyzing ? 'Analyzing...' : 'Analyze Style'}
            </button>
          </div>

          {result && (
            <div className="border border-border p-4 rounded-none mt-4">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
                Result
              </span>
              <p className="text-sm leading-relaxed">{result}</p>
            </div>
          )}

          {error && (
            <div className="border border-border p-4 rounded-none mt-4">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
                Error
              </span>
              <p className="text-sm text-red-500 leading-relaxed">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Naming Tab
// ---------------------------------------------------------------------------

function NamingTab() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<string[]>([])

  function handleGenerate() {
    // For now, show that this connects to the agent engine
    setResults([`（需要启动 Agent Engine 才能生成名字）`])
  }

  return (
    <div className="border border-border p-6 rounded-none">
      <h2 className="font-serif text-2xl tracking-tight mb-6">取名工具</h2>
      <div className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="输入关键词或风格..."
          className="flex-1 border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-foreground transition-colors"
        />
        <button
          onClick={handleGenerate}
          className="text-xs uppercase tracking-widest border border-foreground px-4 py-2 hover:bg-foreground hover:text-background transition-colors"
        >
          生成
        </button>
      </div>
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((r, i) => (
            <div key={i} className="border border-border p-3 text-sm">
              {r}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Hooks Tab
// ---------------------------------------------------------------------------

function HooksTab() {
  const { currentBook } = useBookStore()
  const items = currentBook?.foreshadowing ?? []

  const active = items.filter((f) => f.type === 'planted' || f.type === 'hinted').length
  const resolved = items.filter((f) => f.type === 'resolved').length
  const overdue = items.filter((f) => f.type === 'overdue').length

  return (
    <div className="border border-border p-6 rounded-none">
      <h2 className="font-serif text-2xl tracking-tight mb-6">Hook Governance</h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Active Hooks', value: String(active), sub: 'Threads being tracked' },
          { label: 'Resolved', value: String(resolved), sub: 'Successfully closed' },
          { label: 'Overdue', value: String(overdue), sub: 'Need attention' },
        ].map((stat) => (
          <div key={stat.label} className="border border-border p-4 rounded-none">
            <div className="font-serif text-3xl tracking-tight">{stat.value}</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted mt-1">
              {stat.label}
            </div>
            <div className="text-[10px] text-muted mt-0.5">{stat.sub}</div>
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted">
          暂无伏笔线程。在大纲中添加伏笔后，此处将自动追踪其生命周期。
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((f) => (
            <div key={f.id} className="border border-border p-3 text-sm flex items-center justify-between">
              <span>{f.description}</span>
              <span className="text-[10px] uppercase tracking-widest border border-border px-2 py-0.5 shrink-0 ml-4">
                {f.type}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ReadingPower Tab
// ---------------------------------------------------------------------------

function ReadingPowerTab() {
  const { currentBook } = useBookStore()
  const hasChapters = (currentBook?.currentChapter ?? 0) > 0

  return (
    <div className="border border-border p-6 rounded-none">
      <h2 className="font-serif text-2xl tracking-tight mb-6">Reading Power Analysis</h2>

      {!hasChapters ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted mb-2">需要先运行 Pipeline 才能生成阅读力分析。</p>
          <p className="text-xs text-muted">
            Pipeline 会在每章完成后自动分析节奏、张力曲线、情感范围和翻页指数。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {[
            { label: 'Pacing Score', desc: 'Story rhythm and momentum' },
            { label: 'Tension Curve', desc: 'Rising and falling action' },
            { label: 'Emotional Range', desc: 'Reader emotional engagement' },
            { label: 'Page Turn Index', desc: 'Hook effectiveness per chapter' },
          ].map((metric) => (
            <div
              key={metric.label}
              className="flex items-center justify-between border border-border p-4 rounded-none hover:border-foreground transition-colors"
            >
              <div>
                <span className="text-sm font-serif">{metric.label}</span>
                <span className="text-[10px] text-muted ml-3">{metric.desc}</span>
              </div>
              <span className="font-serif text-xl text-muted">—</span>
            </div>
          ))}
          <p className="text-xs text-muted mt-4">
            运行 Pipeline 后将自动生成各项指标。
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Techniques Tab
// ---------------------------------------------------------------------------

function TechniquesTab() {
  const { currentBook } = useBookStore()
  const [search, setSearch] = useState('')
  const [techniques, setTechniques] = useState<WritingTechnique[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!currentBook?.id) return
    setLoading(true)
    fetch(`/api/books/${currentBook.id}/techniques`)
      .then((res) => {
        if (!res.ok) throw new Error('Not available')
        return res.json()
      })
      .then((data: { techniques: WritingTechnique[] }) => setTechniques(data.techniques ?? []))
      .catch(() => setTechniques([]))
      .finally(() => setLoading(false))
  }, [currentBook?.id])

  const filtered = techniques.filter(
    (t) =>
      t.skill.toLowerCase().includes(search.toLowerCase()) ||
      t.keywords.some((k) => k.toLowerCase().includes(search.toLowerCase())),
  )

  return (
    <div className="border border-border p-6 rounded-none">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl tracking-tight">Writing Techniques</h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted mt-1">
            Knowledge base of narrative techniques
          </p>
        </div>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search techniques..."
        className="w-full border border-border bg-transparent px-4 py-3 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors placeholder:text-muted mb-6"
      />

      {loading && (
        <p className="text-sm text-muted py-8 text-center">加载中…</p>
      )}

      {!loading && techniques.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-muted mb-2">暂无写作技法数据。</p>
          <p className="text-xs text-muted">
            技法知识库由 CSV 数据构建。将 CSV 文件放入 <code className="font-mono">data/techniques/</code> 目录后重启后端即可加载。
          </p>
        </div>
      )}

      {!loading && techniques.length > 0 && (
        <div className="space-y-3">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="border border-border p-4 rounded-none hover:border-foreground transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-serif">{t.skill}</span>
                <span className="text-[10px] uppercase tracking-widest border border-border px-2 py-0.5">
                  {t.tier}
                </span>
              </div>
              <p className="text-xs text-muted leading-relaxed">{t.content}</p>
              <div className="flex gap-1 mt-2">
                {t.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="text-[10px] text-muted border border-border px-1.5 py-0"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted py-8 text-center">
              未找到匹配的技法。
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// GitHistory Tab
// ---------------------------------------------------------------------------

function GitHistoryTab() {
  const { currentBook } = useBookStore()
  const [commits, setCommits] = useState<
    { hash: string; message: string; date: string; author: string }[]
  >([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!currentBook?.id) return
    setLoading(true)
    fetch(`/api/books/${currentBook.id}/git/log`)
      .then((res) => {
        if (!res.ok) throw new Error('Not available')
        return res.json()
      })
      .then((data: { commits: typeof commits }) => setCommits(data.commits ?? []))
      .catch(() => setCommits([]))
      .finally(() => setLoading(false))
  }, [currentBook?.id])

  return (
    <div className="border border-border p-6 rounded-none">
      <h2 className="font-serif text-2xl tracking-tight mb-6">Git History</h2>

      {loading && (
        <p className="text-sm text-muted py-8 text-center">加载中…</p>
      )}

      {!loading && commits.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-muted mb-2">暂无 Git 提交记录。</p>
          <p className="text-xs text-muted">
            运行 Pipeline 后，每次写作都会自动提交到版本控制。
          </p>
        </div>
      )}

      {!loading && commits.length > 0 && (
        <div className="space-y-0">
          {commits.map((c) => (
            <div
              key={c.hash}
              className="flex items-center gap-4 border-b border-border py-3 last:border-b-0"
            >
              <span className="font-mono text-xs text-muted tabular-nums shrink-0">
                {c.hash}
              </span>
              <span className="text-sm flex-1">{c.message}</span>
              <span className="text-[10px] text-muted shrink-0">{c.author}</span>
              <span className="text-[10px] text-muted tabular-nums shrink-0">
                {c.date}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Write Tab (Pipeline Launcher)
// ---------------------------------------------------------------------------

function WriteTab() {
  const { bookId } = useSearchParamsToObject()
  const [pipelineStatus, setPipelineStatus] = useState<string | null>(null)
  const [activeChapter, setActiveChapter] = useState(1)

  async function handleStartPipeline() {
    if (!bookId) return
    try {
      setPipelineStatus('starting')
      await pipelineApi.start(bookId, activeChapter)
      setPipelineStatus('running')
    } catch (err) {
      setPipelineStatus('error')
      console.error('Pipeline start failed:', err)
    }
  }

  async function handleCancelPipeline() {
    if (!bookId) return
    try {
      await pipelineApi.cancel(bookId)
      setPipelineStatus('cancelled')
    } catch (err) {
      console.error('Pipeline cancel failed:', err)
    }
  }

  return (
    <div className="border border-border p-6 rounded-none">
      <h2 className="font-serif text-2xl tracking-tight mb-6">Write Pipeline</h2>

      <div className="space-y-6">
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
            Target Chapter
          </span>
          <input
            type="number"
            value={activeChapter}
            onChange={(e) => setActiveChapter(Number(e.target.value))}
            min={1}
            className="w-32 border border-border bg-transparent px-4 py-3 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors"
          />
        </label>

        <div className="flex gap-4">
          <button
            onClick={handleStartPipeline}
            disabled={pipelineStatus === 'running'}
            className="text-xs uppercase tracking-widest border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none disabled:opacity-30"
          >
            {pipelineStatus === 'running' ? 'Running...' : 'Start Pipeline'}
          </button>
          {pipelineStatus === 'running' && (
            <button
              onClick={handleCancelPipeline}
              className="text-xs uppercase tracking-widest border border-border px-6 py-3 hover:border-foreground transition-colors rounded-none shadow-none text-muted"
            >
              Cancel
            </button>
          )}
        </div>

        {pipelineStatus && (
          <div className="border border-border p-4 rounded-none">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
              Status:{' '}
            </span>
            <span className="text-sm">{pipelineStatus}</span>
          </div>
        )}

        <div className="border border-border p-4 rounded-none">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted mb-3">
            Pipeline Stages
          </h3>
          <div className="space-y-2">
            {[
              'Context Assembly',
              'Character Reasoning',
              'Writing',
              'Event Recording',
              'Fact Check',
              'Continuity Check',
              'Pacing Check',
              'Character Intelligence',
              'Review',
              'Editing',
              'De-AI',
              'Reflector',
              'State Sync',
            ].map((stage, i) => (
              <div
                key={stage}
                className="flex items-center gap-3 text-xs text-muted py-1"
              >
                <span className="w-4 text-right tabular-nums text-[10px]">
                  {i + 1}
                </span>
                <span className="w-1.5 h-1.5 bg-border" />
                <span>{stage}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ===========================================================================
// Helpers
// ===========================================================================

/** Extract bookId from URL search params (used in tab components) */
function useSearchParamsToObject() {
  const [searchParams] = useSearchParams()
  return {
    bookId: searchParams.get('bookId') ?? '',
  }
}

/** Returns the tab content component for a given tab name */
function TabContent({ tab }: { tab: TabName; bookId?: string }) {
  switch (tab) {
    case 'Outline':
      return <OutlineTab />
    case 'Chapters':
      return <ChaptersTab />
    case 'Characters':
      return <CharactersTab />
    case 'Foreshadowing':
      return <ForeshadowingTab />
    case 'Timeline':
      return <TimelineTab />
    case 'Style':
      return <StyleTab />
    case 'Constraints':
      return <ConstraintsTab />
    case 'Memory':
      return <MemoryTab />
    case 'Reference':
      return <ReferenceTab />
    case 'Naming':
      return <NamingTab />
    case 'Hooks':
      return <HooksTab />
    case 'ReadingPower':
      return <ReadingPowerTab />
    case 'Techniques':
      return <TechniquesTab />
    case 'GitHistory':
      return <GitHistoryTab />
    case 'Write':
      return <WriteTab />
    default:
      return null
  }
}

// ===========================================================================
// BookDetail Page
// ===========================================================================

export default function BookDetail() {
  const [searchParams] = useSearchParams()
  const bookId = searchParams.get('bookId') ?? ''
  const { currentBook, fetchBook, fetchChapters, fetchCharacters, loading } =
    useBookStore()
  const [activeTab, setActiveTab] = useState<TabName>('Outline')

  useEffect(() => {
    if (bookId) {
      fetchBook(bookId)
      fetchChapters(bookId)
      fetchCharacters(bookId)
    }
  }, [bookId, fetchBook, fetchChapters, fetchCharacters])

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-8 py-6">
        <Link
          to="/"
          className="text-[10px] uppercase tracking-[0.2em] text-muted hover:text-foreground transition-colors"
        >
          ← Back to Dashboard
        </Link>

        <div className="flex items-end justify-between mt-4">
          <div>
            <h1 className="font-serif text-3xl tracking-tight">
              {loading ? 'Loading...' : currentBook?.title ?? `Book ${bookId}`}
            </h1>
            {currentBook?.premise && (
              <p className="text-muted text-sm mt-1 max-w-2xl">
                {currentBook.premise}
              </p>
            )}
          </div>

          {currentBook && (
            <div className="flex items-center gap-4">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
                {currentBook.currentWordCount.toLocaleString()} /{' '}
                {currentBook.targetWordCount.toLocaleString()} 字
              </span>
              <Link
                to={`/editor/${bookId}`}
                className="text-xs uppercase tracking-widest border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none"
              >
                Open Editor →
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Tab Bar */}
      <div className="border-b border-border px-8 sticky top-0 bg-background z-10">
        <div className="flex items-center gap-6 overflow-x-auto">
          {TAB_GROUPS.map((group) => (
            <div key={group.label} className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted mr-2">
                {group.label}
              </span>
              {group.tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-xs uppercase tracking-widest px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab
                      ? 'border-foreground text-foreground'
                      : 'border-transparent text-muted hover:text-foreground'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <main className="px-8 py-8">
        <TabContent tab={activeTab} bookId={bookId} />
      </main>
    </div>
  )
}
