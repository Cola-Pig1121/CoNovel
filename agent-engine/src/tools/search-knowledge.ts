// ============================================================================
// Search Knowledge Tool — Search CSV knowledge base using BM25
// ============================================================================

import { join } from 'path'
import type { CoNovelTool, FileOperations, ToolContext, ToolResult } from './types.js'

// Inline minimal BM25 for Chinese text
function tokenize(text: string): string[] {
  const tokens: string[] = []
  // Chinese character bigrams
  const chars = [...text].filter((c) => c.trim())
  for (let i = 0; i < chars.length - 1; i++) {
    tokens.push(chars[i] + chars[i + 1])
  }
  // Also add individual characters
  for (const c of chars) {
    tokens.push(c)
  }
  // English words
  const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? []
  tokens.push(...words)
  return tokens
}

function bm25Score(query: string, doc: string, avgDl: number, docs: string[]): number {
  const k1 = 1.5
  const b = 0.75
  const N = docs.length
  const queryTokens = tokenize(query)
  const docTokens = tokenize(doc)
  const dl = docTokens.length

  // Build term frequency map
  const tf = new Map<string, number>()
  for (const t of docTokens) {
    tf.set(t, (tf.get(t) ?? 0) + 1)
  }

  let score = 0
  for (const qt of queryTokens) {
    const f = tf.get(qt) ?? 0
    if (f === 0) continue

    // Document frequency: how many docs contain this term
    let df = 0
    for (const d of docs) {
      if (tokenize(d).includes(qt)) df++
    }
    const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1)
    const tfNorm = (f * (k1 + 1)) / (f + k1 * (1 - b + b * (dl / avgDl)))
    score += idf * tfNorm
  }
  return score
}

interface Technique {
  id: string
  skill: string
  category: string
  tier: string
  keywords: string[]
  genres: string[]
  content: string
}

function parseCSV(text: string): Technique[] {
  const lines = text.split('\n').filter((l) => l.trim())
  if (lines.length < 2) return []

  const techniques: Technique[] = []
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i])
    if (fields.length < 7) continue
    techniques.push({
      id: fields[0],
      skill: fields[1],
      category: fields[2],
      tier: fields[3],
      keywords: fields[4].split(',').map((k) => k.trim()).filter(Boolean),
      genres: fields[5].split(',').map((g) => g.trim()).filter(Boolean),
      content: fields[6],
    })
  }
  return techniques
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue }
    if (ch === ',' && !inQuotes) { fields.push(current); current = ''; continue }
    current += ch
  }
  fields.push(current)
  return fields
}

let cachedTechniques: Technique[] | null = null

function loadTechniques(bookPath: string): Technique[] {
  if (cachedTechniques) return cachedTechniques

  const kbDir = join(bookPath, 'knowledge')
  const techniques: Technique[] = []

  try {
    const { readdirSync, readFileSync } = require('fs')
    const files = readdirSync(kbDir).filter((f: string) => f.endsWith('.csv'))
    for (const file of files) {
      const content = readFileSync(join(kbDir, file), 'utf-8')
      techniques.push(...parseCSV(content))
    }
  } catch {
    // Also try the global data directory
    try {
      const { readdirSync, readFileSync } = require('fs')
      const dataDir = join(bookPath, '..', '..', 'data')
      const files = readdirSync(dataDir).filter((f: string) => f.endsWith('.csv'))
      for (const file of files) {
        const content = readFileSync(join(dataDir, file), 'utf-8')
        techniques.push(...parseCSV(content))
      }
    } catch { /* no knowledge base available */ }
  }

  cachedTechniques = techniques
  return techniques
}

export function createSearchKnowledgeTool(_ops?: Partial<FileOperations>): CoNovelTool {
  return {
    definition: {
      name: 'search_knowledge',
      description: '在 CSV 知识库中搜索写作技法（基于 BM25 检索）',
      parameters: {
        query: { type: 'string', description: '搜索关键词', required: true },
        genre: { type: 'string', description: '题材过滤（如"玄幻""仙侠"）' },
        skill: { type: 'string', description: '技能类型过滤（如"scene-writing""anti-ai-edit"）' },
        topK: { type: 'number', description: '返回数量（默认 5）' },
      },
    },

    execute: async (params, context): Promise<ToolResult> => {
      try {
        const techniques = loadTechniques(context.bookPath)
        if (techniques.length === 0) {
          return { success: true, data: { results: [], message: '知识库为空' } }
        }

        const query = params.query as string
        const genre = params.genre as string | undefined
        const skill = params.skill as string | undefined
        const topK = (params.topK as number) || 5

        // Filter by genre/skill
        let filtered = techniques
        if (genre) {
          filtered = filtered.filter((t) =>
            t.genres.some((g) => g.includes(genre) || genre.includes(g)),
          )
        }
        if (skill) {
          filtered = filtered.filter((t) => t.skill === skill)
        }

        // BM25 scoring
        const avgDl = filtered.reduce((sum, t) => sum + tokenize(t.content).length, 0) / (filtered.length || 1)
        const scored = filtered.map((t) => ({
          technique: t,
          score: bm25Score(query, t.content, avgDl, filtered.map((f) => f.content)),
        }))

        // Sort by score and take top K
        scored.sort((a, b) => b.score - a.score)
        const results = scored.slice(0, topK).map((s) => ({
          id: s.technique.id,
          category: s.technique.category,
          tier: s.technique.tier,
          content: s.technique.content,
          score: Math.round(s.score * 100) / 100,
        }))

        return { success: true, data: { results, total: techniques.length } }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    },
  }
}
