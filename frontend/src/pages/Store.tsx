import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { storeApi } from '@/lib/api'

interface Template {
  name: string
  description: string
  tags: string[]
}

const OFFICIAL_PRESETS: Template[] = [
  {
    name: 'Classic Chinese Novel',
    description:
      'Traditional Chinese novel structure with chapter arcs, character webs, and thematic foreshadowing.',
    tags: ['Chinese', 'Classical', 'Literary'],
  },
  {
    name: 'Web Novel Sprint',
    description:
      'Fast-paced web novel format optimized for daily serialization and hook retention.',
    tags: ['Web Novel', 'Serialization', 'Commercial'],
  },
  {
    name: 'Literary Fiction',
    description:
      'Character-driven literary fiction with emphasis on prose style and interiority.',
    tags: ['Literary', 'Character-driven', 'Arts'],
  },
  {
    name: 'Mystery & Thriller',
    description:
      'Crime and mystery structure with clue planting, red herrings, and payoff tracking.',
    tags: ['Mystery', 'Thriller', 'Plot-driven'],
  },
]

const COMMUNITY_TEMPLATES: Template[] = [
  {
    name: 'Xianxia Epic',
    description:
      'Cultivation novel template with power system, realm progression, and faction dynamics.',
    tags: ['Xianxia', 'Fantasy', 'Cultivation'],
  },
  {
    name: 'Slice of Life',
    description:
      'Gentle daily-life narrative with ensemble characters and emotional resonance.',
    tags: ['Slice of Life', 'Drama', 'Low-stakes'],
  },
]

function TemplateCard({ template }: { template: Template }) {
  const navigate = useNavigate()
  const [applying, setApplying] = useState(false)

  async function handleApply() {
    setApplying(true)
    try {
      await storeApi.import(template.name)
      // Navigate to dashboard after applying — the template is now local
      navigate('/')
    } catch (e) {
      console.error('Apply template failed:', e)
    }
    setApplying(false)
  }

  return (
    <div className="border border-border p-6 rounded-none hover:border-foreground transition-colors">
      <h3 className="font-serif text-lg mb-2">{template.name}</h3>
      <p className="text-sm text-muted mb-4">{template.description}</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {template.tags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] uppercase tracking-[0.2em] text-muted border border-border px-2 py-1 rounded-none"
          >
            {tag}
          </span>
        ))}
      </div>
      <button
        onClick={handleApply}
        disabled={applying}
        className="text-xs uppercase tracking-widest border border-foreground px-6 py-3 rounded-none hover:bg-foreground hover:text-background transition-colors disabled:opacity-40"
      >
        {applying ? '应用中...' : '应用'}
      </button>
    </div>
  )
}

export default function Store() {
  const navigate = useNavigate()
  const [repoUrl, setRepoUrl] = useState('')
  const [cloning, setCloning] = useState(false)
  const [cloneMsg, setCloneMsg] = useState<string | null>(null)

  async function handleClone() {
    const url = repoUrl.trim()
    if (!url) return
    setCloning(true)
    setCloneMsg(null)
    try {
      const res = await storeApi.import(url)
      setCloneMsg(`Imported: ${res.name}`)
      setRepoUrl('')
      // Navigate to dashboard after cloning
      setTimeout(() => navigate('/'), 1000)
    } catch (e) {
      setCloneMsg('Clone failed: ' + String(e))
    }
    setCloning(false)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-8 py-6">
        <Link to="/" className="text-[10px] uppercase tracking-[0.2em] text-muted hover:text-foreground transition-colors">
          ← 首页
        </Link>
        <h1 className="font-serif text-3xl">模板商店</h1>
        <p className="text-muted text-sm mt-1">
          项目预设和社区模板
        </p>
      </header>

      <main className="px-8 py-8 space-y-12">
        {/* GitHub Import */}
        <div className="border border-border p-6 rounded-none">
          <h2 className="font-serif text-lg mb-3">从 GitHub 导入</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleClone()}
              placeholder="https://github.com/user/repo"
              className="flex-1 border border-border bg-transparent px-4 py-3 text-sm rounded-none outline-none placeholder:text-muted/50 focus:border-foreground transition-colors"
            />
            <button
              onClick={handleClone}
              disabled={cloning || !repoUrl.trim()}
              className="text-xs uppercase tracking-widest border border-foreground px-6 py-3 rounded-none hover:bg-foreground hover:text-background transition-colors whitespace-nowrap disabled:opacity-40"
            >
              {cloning ? '克隆中...' : '克隆'}
            </button>
          </div>
          {cloneMsg && (
            <p className="text-xs text-muted mt-2">{cloneMsg}</p>
          )}
        </div>

        {/* Official Presets */}
        <section>
          <div className="mb-4">
            <h2 className="font-serif text-xl">官方预设</h2>
            <p className="text-muted text-sm mt-1">
              由 CoNovel 团队维护的精选模板
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {OFFICIAL_PRESETS.map((t) => (
              <TemplateCard key={t.name} template={t} />
            ))}
          </div>
        </section>

        {/* Community Templates */}
        <section>
          <div className="mb-4">
            <h2 className="font-serif text-xl">社区模板</h2>
            <p className="text-muted text-sm mt-1">
              由社区分享的模板
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {COMMUNITY_TEMPLATES.map((t) => (
              <TemplateCard key={t.name} template={t} />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
