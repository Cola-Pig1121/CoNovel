import { useState } from 'react'

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
      <button className="text-xs uppercase tracking-widest border border-foreground px-6 py-3 rounded-none hover:bg-foreground hover:text-background transition-colors">
        Apply
      </button>
    </div>
  )
}

export default function Store() {
  const [repoUrl, setRepoUrl] = useState('')

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-8 py-6">
        <h1 className="font-serif text-3xl">Template Store</h1>
        <p className="text-muted text-sm mt-1">
          Presets and community templates for your projects
        </p>
      </header>

      <main className="px-8 py-8 space-y-12">
        {/* GitHub Import */}
        <div className="border border-border p-6 rounded-none">
          <h2 className="font-serif text-lg mb-3">Import from GitHub</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/user/repo"
              className="flex-1 border border-border bg-transparent px-4 py-3 text-sm rounded-none outline-none placeholder:text-muted/50 focus:border-foreground transition-colors"
            />
            <button className="text-xs uppercase tracking-widest border border-foreground px-6 py-3 rounded-none hover:bg-foreground hover:text-background transition-colors whitespace-nowrap">
              Clone
            </button>
          </div>
        </div>

        {/* Official Presets */}
        <section>
          <div className="mb-4">
            <h2 className="font-serif text-xl">Official Presets</h2>
            <p className="text-muted text-sm mt-1">
              Curated templates maintained by the CoNovel team
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
            <h2 className="font-serif text-xl">Community Templates</h2>
            <p className="text-muted text-sm mt-1">
              Templates shared by the community
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
