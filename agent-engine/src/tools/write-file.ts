// ============================================================================
// Write File Tool — Write files to the book's directory
// ============================================================================

import { writeFile as fsWriteFile, mkdir as fsMkdir, access as fsAccess, stat as fsStat } from 'fs/promises'
import { constants } from 'fs'
import { join, isAbsolute, resolve, dirname } from 'path'
import type { CoNovelTool, FileOperations, ToolContext, ToolResult } from './types.js'

const defaultOps: FileOperations = {
  readFile: async () => '',
  writeFile: (p, c) => fsWriteFile(p, c, 'utf-8'),
  mkdir: (p) => fsMkdir(p, { recursive: true }).then(() => {}),
  exists: async (p) => { try { await fsAccess(p, constants.R_OK); return true } catch { return false } },
  readdir: async () => [],
  stat: async (p) => { const s = await fsStat(p); return { isFile: s.isFile(), isDirectory: s.isDirectory(), size: s.size } },
}

export function createWriteFileTool(ops?: Partial<FileOperations>): CoNovelTool {
  const o = { ...defaultOps, ...ops }

  return {
    definition: {
      name: 'write_file',
      description: '写入文件到书籍目录',
      parameters: {
        path: { type: 'string', description: '相对于书籍根目录的文件路径', required: true },
        content: { type: 'string', description: '要写入的内容', required: true },
        append: { type: 'boolean', description: '是否追加模式（默认覆盖写入）' },
      },
    },

    execute: async (params, context): Promise<ToolResult> => {
      try {
        const filePath = resolveFilePath(params.path as string, context.bookPath)
        const dir = dirname(filePath)

        // 确保目录存在
        await o.mkdir(dir)

        if (params.append) {
          // 追加模式：先读取现有内容
          let existing = ''
          try { existing = await o.readFile(filePath) } catch { /* new file */ }
          await o.writeFile(filePath, existing + (params.content as string))
        } else {
          await o.writeFile(filePath, params.content as string)
        }

        return {
          success: true,
          data: { path: filePath, bytesWritten: (params.content as string).length },
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
