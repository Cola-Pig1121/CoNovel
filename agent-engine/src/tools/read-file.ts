// ============================================================================
// Read File Tool — Read files from the book's directory
// ============================================================================

import { readFile as fsReadFile, access as fsAccess, stat as fsStat } from 'fs/promises'
import { constants } from 'fs'
import { join, isAbsolute, resolve } from 'path'
import type { CoNovelTool, FileOperations, ToolContext, ToolResult } from './types.js'

const defaultOps: FileOperations = {
  readFile: (p) => fsReadFile(p, 'utf-8'),
  writeFile: async () => {},
  mkdir: async () => {},
  exists: async (p) => { try { await fsAccess(p, constants.R_OK); return true } catch { return false } },
  readdir: async () => [],
  stat: async (p) => { const s = await fsStat(p); return { isFile: s.isFile(), isDirectory: s.isDirectory(), size: s.size } },
}

export function createReadFileTool(ops?: Partial<FileOperations>): CoNovelTool {
  const o = { ...defaultOps, ...ops }

  return {
    definition: {
      name: 'read_file',
      description: '读取书籍目录下的文件内容',
      parameters: {
        path: { type: 'string', description: '相对于书籍根目录的文件路径，或绝对路径', required: true },
        offset: { type: 'number', description: '起始行号（1-indexed）' },
        limit: { type: 'number', description: '最大读取行数' },
      },
    },

    execute: async (params, context): Promise<ToolResult> => {
      try {
        const filePath = resolveFilePath(params.path as string, context.bookPath)
        const exists = await o.exists(filePath)
        if (!exists) return { success: false, error: `文件不存在: ${filePath}` }

        const content = await o.readFile(filePath)
        const lines = content.split('\n')

        const offset = (params.offset as number) || 0
        const limit = params.limit as number | undefined

        const selected = limit
          ? lines.slice(offset, offset + limit)
          : offset
            ? lines.slice(offset)
            : lines

        return {
          success: true,
          data: {
            content: selected.join('\n'),
            totalLines: lines.length,
            offset,
            limit: limit ?? lines.length,
          },
        }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    },
  }
}

function resolveFilePath(path: string, bookPath: string): string {
  if (isAbsolute(path)) return path
  return resolve(bookPath, path)
}
