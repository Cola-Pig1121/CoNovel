// ============================================================================
// Outline Builder Tool — Create and manage novel outline structure
// ============================================================================

import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import type { CoNovelTool, FileOperations, ToolContext, ToolResult } from './types.js'

interface Volume {
  id: string
  title: string
  chapters: {
    chapterNumber: number
    title: string
    summary: string
    keyEvents: string[]
    position: 'high-pressure' | 'propulsive' | 'relationship' | 'low-pressure'
  }[]
}

interface OutlineStructure {
  volumes: Volume[]
}

export function createOutlineBuilderTool(_ops?: Partial<FileOperations>): CoNovelTool {
  return {
    definition: {
      name: 'outline_builder',
      description: '构建和更新小说大纲',
      parameters: {
        action: { type: 'string', description: '操作类型', required: true, enum: ['get', 'create', 'update_volume', 'add_chapter'] },
        volumeId: { type: 'string', description: '卷 ID（update_volume/add_chapter 时需要）' },
        volumeTitle: { type: 'string', description: '卷标题（create/update_volume 时需要）' },
        chapter: { type: 'object', description: '章节数据（add_chapter 时需要）' },
      },
    },

    execute: async (params, context): Promise<ToolResult> => {
      try {
        const outlinePath = join(context.bookPath, 'outline.json')
        const action = params.action as string

        // 读取现有大纲
        let outline: OutlineStructure = { volumes: [] }
        if (existsSync(outlinePath)) {
          outline = JSON.parse(await readFile(outlinePath, 'utf-8'))
        }

        switch (action) {
          case 'get': {
            return { success: true, data: outline }
          }

          case 'create': {
            const vol: Volume = {
              id: `vol_${Date.now().toString(36)}`,
              title: (params.volumeTitle as string) || `第${outline.volumes.length + 1}卷`,
              chapters: [],
            }
            outline.volumes.push(vol)
            await saveOutline(outlinePath, outline)
            return { success: true, data: { volume: vol, totalVolumes: outline.volumes.length } }
          }

          case 'update_volume': {
            const vol = outline.volumes.find((v) => v.id === params.volumeId)
            if (!vol) return { success: false, error: `卷 ${params.volumeId} 不存在` }
            if (params.volumeTitle) vol.title = params.volumeTitle as string
            await saveOutline(outlinePath, outline)
            return { success: true, data: vol }
          }

          case 'add_chapter': {
            const vol = outline.volumes.find((v) => v.id === params.volumeId)
            if (!vol) return { success: false, error: `卷 ${params.volumeId} 不存在` }
            const chapter = params.chapter as any
            const chapterNumber = vol.chapters.length > 0
              ? Math.max(...vol.chapters.map((c) => c.chapterNumber)) + 1
              : 1
            vol.chapters.push({
              chapterNumber,
              title: chapter?.title || `第${chapterNumber}章`,
              summary: chapter?.summary || '',
              keyEvents: chapter?.keyEvents || [],
              position: chapter?.position || 'propulsive',
            })
            await saveOutline(outlinePath, outline)
            return { success: true, data: { chapterNumber, totalChapters: vol.chapters.length } }
          }

          default:
            return { success: false, error: `未知操作: ${action}` }
        }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    },
  }
}

async function saveOutline(path: string, outline: OutlineStructure): Promise<void> {
  await mkdir(join(path, '..'), { recursive: true }).catch(() => {})
  await writeFile(path, JSON.stringify(outline, null, 2), 'utf-8')
}
