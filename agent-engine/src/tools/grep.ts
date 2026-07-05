// ============================================================================
// Grep Tool — Search text patterns in book files
// ============================================================================

import { readFile as fsReadFile, stat as fsStat, readdir as fsReaddir } from 'fs/promises'
import { join, isAbsolute, resolve, relative } from 'path'
import type { CoNovelTool, FileOperations, ToolContext, ToolResult } from './types.js'

const defaultOps: FileOperations = {
  readFile: (p) => fsReadFile(p, 'utf-8'),
  writeFile: async () => {},
  mkdir: async () => {},
  exists: async () => false,
  readdir: (p) => fsReaddir(p).then((f) => f.map(String)),
  stat: async (p) => { const s = await fsStat(p); return { isFile: s.isFile(), isDirectory: s.isDirectory(), size: s.size } },
}

export function createGrepTool(ops?: Partial<FileOperations>): CoNovelTool {
  const o = { ...defaultOps, ...ops }

  return {
    definition: {
      name: 'grep',
      description: '在书籍文件中搜索文本模式',
      parameters: {
        pattern: { type: 'string', description: '搜索模式（正则表达式或字面字符串）', required: true },
        path: { type: 'string', description: '搜索目录或文件（默认：整个书籍目录）' },
        glob: { type: 'string', description: '文件过滤 glob 模式，如 "*.md" 或 "*.json"' },
        ignoreCase: { type: 'boolean', description: '忽略大小写（默认 false）' },
        limit: { type: 'number', description: '最大匹配数（默认 50）' },
      },
    },

    execute: async (params, context): Promise<ToolResult> => {
      try {
        const searchPath = params.path
          ? resolveFilePath(params.path as string, context.bookPath)
          : context.bookPath
        const pattern = new RegExp(
          params.pattern as string,
          (params.ignoreCase as boolean) ? 'gi' : 'g',
        )
        const glob = params.glob as string | undefined
        const limit = (params.limit as number) || 50

        const matches: { file: string; line: number; text: string }[] = []
        await searchDir(searchPath, pattern, glob, o, matches, limit, context.bookPath)

        return {
          success: true,
          data: {
            matches,
            totalMatches: matches.length,
            limitReached: matches.length >= limit,
          },
        }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    },
  }
}

async function searchDir(
  dir: string,
  pattern: RegExp,
  glob: string | undefined,
  ops: FileOperations,
  matches: { file: string; line: number; text: string }[],
  limit: number,
  bookPath: string,
): Promise<void> {
  if (matches.length >= limit) return

  const entries = await ops.readdir(dir)
  for (const entry of entries) {
    if (matches.length >= limit) return
    const fullPath = join(dir, entry)
    const info = await ops.stat(fullPath)

    if (info.isDirectory) {
      if (entry === '.git' || entry === 'node_modules') continue
      await searchDir(fullPath, pattern, glob, ops, matches, limit, bookPath)
    } else if (info.isFile) {
      if (glob && !matchGlob(entry, glob)) continue
      if (!entry.endsWith('.md') && !entry.endsWith('.json') && !entry.endsWith('.txt') && !entry.endsWith('.csv')) continue

      try {
        const content = await ops.readFile(fullPath)
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (matches.length >= limit) return
          pattern.lastIndex = 0
          if (pattern.test(lines[i])) {
            matches.push({
              file: relative(bookPath, fullPath),
              line: i + 1,
              text: lines[i].trim(),
            })
          }
        }
      } catch { /* skip unreadable files */ }
    }
  }
}

function matchGlob(filename: string, glob: string): boolean {
  const regex = new RegExp(
    '^' + glob.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
  )
  return regex.test(filename)
}

function resolveFilePath(path: string, bookPath: string): string {
  if (isAbsolute(path)) return path
  return resolve(bookPath, path)
}
