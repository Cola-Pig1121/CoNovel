// ============================================================================
// File Search Tool — Fast file search with content matching
// Inspired by fff (dmtrKovalenko/fff): bigram filtering + glob + content grep
// ============================================================================

import { readdir, stat, readFile } from 'fs/promises'
import { join, relative, extname } from 'path'
import type { CoNovelTool, FileOperations, ToolContext, ToolResult } from './types.js'

interface SearchResult {
  file: string
  line?: number
  text?: string
  score?: number
}

const TEXT_EXTENSIONS = new Set([
  '.md', '.txt', '.json', '.csv', '.yaml', '.yml', '.toml',
  '.ts', '.tsx', '.js', '.jsx', '.py', '.rs',
  '.css', '.html', '.xml',
])

const IGNORE_DIRS = new Set([
  '.git', 'node_modules', '__pycache__', '.venv', 'dist', 'build', '.turbo',
])

/**
 * Create a fast file search tool.
 *
 * Modes:
 * - glob: find files matching a pattern (e.g., "*.md", "characters/*.json")
 * - content: search file contents for a pattern (regex or literal)
 * - fuzzy: find files whose names fuzzy-match a query
 */
export function createFileSearchTool(_ops?: Partial<FileOperations>): CoNovelTool {
  return {
    definition: {
      name: 'file_search',
      description: '在书籍目录中快速搜索文件。支持文件名匹配、内容搜索、模糊匹配。',
      parameters: {
        query: { type: 'string', description: '搜索关键词', required: true },
        mode: { type: 'string', description: '搜索模式', enum: ['glob', 'content', 'fuzzy'], required: true },
        path: { type: 'string', description: '搜索子目录（默认整个书籍目录）' },
        limit: { type: 'number', description: '最大结果数（默认 20）' },
      },
    },

    execute: async (params, context): Promise<ToolResult> => {
      try {
        const query = params.query as string
        const mode = params.mode as string
        const searchPath = params.path
          ? join(context.bookPath, params.path as string)
          : context.bookPath
        const limit = (params.limit as number) || 20

        let results: SearchResult[] = []

        switch (mode) {
          case 'glob':
            results = await searchGlob(searchPath, query, limit)
            break
          case 'content':
            results = await searchContent(searchPath, query, limit)
            break
          case 'fuzzy':
            results = await searchFuzzy(searchPath, query, limit)
            break
          default:
            return { success: false, error: `未知搜索模式: ${mode}` }
        }

        return {
          success: true,
          data: {
            results,
            totalMatches: results.length,
            limitReached: results.length >= limit,
          },
        }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    },
  }
}

// --- Glob search: find files matching a pattern ---

async function searchGlob(root: string, pattern: string, limit: number): Promise<SearchResult[]> {
  const results: SearchResult[] = []
  const regex = globToRegex(pattern)

  async function walk(dir: string) {
    if (results.length >= limit) return
    try {
      const entries = await readdir(dir)
      for (const entry of entries) {
        if (results.length >= limit) return
        if (IGNORE_DIRS.has(entry)) continue
        const fullPath = join(dir, entry)
        const info = await stat(fullPath)
        if (info.isDirectory()) {
          await walk(fullPath)
        } else if (regex.test(entry)) {
          results.push({ file: relative(root, fullPath) })
        }
      }
    } catch { /* skip */ }
  }

  await walk(root)
  return results
}

// --- Content search: grep file contents ---

async function searchContent(root: string, pattern: string, limit: number): Promise<SearchResult[]> {
  const results: SearchResult[] = []
  let regex: RegExp
  try {
    regex = new RegExp(pattern, 'gi')
  } catch {
    regex = new RegExp(escapeRegex(pattern), 'gi')
  }

  async function walk(dir: string) {
    if (results.length >= limit) return
    try {
      const entries = await readdir(dir)
      for (const entry of entries) {
        if (results.length >= limit) return
        if (IGNORE_DIRS.has(entry)) continue
        const fullPath = join(dir, entry)
        const info = await stat(fullPath)
        if (info.isDirectory()) {
          await walk(fullPath)
        } else if (TEXT_EXTENSIONS.has(extname(entry).toLowerCase())) {
          try {
            const content = await readFile(fullPath, 'utf-8')
            const lines = content.split('\n')
            for (let i = 0; i < lines.length; i++) {
              if (results.length >= limit) return
              regex.lastIndex = 0
              if (regex.test(lines[i])) {
                results.push({
                  file: relative(root, fullPath),
                  line: i + 1,
                  text: lines[i].trim().substring(0, 200),
                })
              }
            }
          } catch { /* skip unreadable */ }
        }
      }
    } catch { /* skip */ }
  }

  await walk(root)
  return results
}

// --- Fuzzy search: match file names with character overlap ---

async function searchFuzzy(root: string, query: string, limit: number): Promise<SearchResult[]> {
  const results: { file: string; score: number }[] = []
  const queryChars = [...query.toLowerCase()]

  async function walk(dir: string) {
    try {
      const entries = await readdir(dir)
      for (const entry of entries) {
        if (IGNORE_DIRS.has(entry)) continue
        const fullPath = join(dir, entry)
        const info = await stat(fullPath)
        if (info.isDirectory()) {
          await walk(fullPath)
        } else {
          const name = entry.toLowerCase()
          // Calculate character overlap score
          let matched = 0
          for (const qc of queryChars) {
            if (name.includes(qc)) matched++
          }
          const score = matched / queryChars.length
          if (score > 0.3) {
            results.push({ file: relative(root, fullPath), score })
          }
        }
      }
    } catch { /* skip */ }
  }

  await walk(root)
  results.sort((a, b) => b.score - a.score)
  return results.slice(0, limit).map((r) => ({
    file: r.file,
    score: Math.round(r.score * 100) / 100,
  }))
}

// --- Helpers ---

function globToRegex(glob: string): RegExp {
  let regexStr = '^'
  for (const ch of glob) {
    if (ch === '.') regexStr += '\\.'
    else if (ch === '*') regexStr += '.*'
    else if (ch === '?') regexStr += '.'
    else regexStr += ch
  }
  regexStr += '$'
  return new RegExp(regexStr, 'i')
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
