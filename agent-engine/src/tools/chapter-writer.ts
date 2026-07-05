// ============================================================================
// Chapter Writer Tool — Save chapter content with metadata
// ============================================================================

import { join } from 'path'
import { writeFile, mkdir } from 'fs/promises'
import type { CoNovelTool, FileOperations, ToolContext, ToolResult } from './types.js'

export function createChapterWriterTool(_ops?: Partial<FileOperations>): CoNovelTool {
  return {
    definition: {
      name: 'chapter_writer',
      description: '保存章节正文和元数据',
      parameters: {
        chapterNumber: { type: 'number', description: '章节号', required: true },
        title: { type: 'string', description: '章节标题', required: true },
        content: { type: 'string', description: '章节正文内容', required: true },
        outline: { type: 'string', description: '本章大纲（可选）' },
        summary: { type: 'string', description: '本章摘要（可选）' },
      },
    },

    execute: async (params, context): Promise<ToolResult> => {
      try {
        const chapterNum = params.chapterNumber as number
        const padded = String(chapterNum).padStart(4, '0')
        const chaptersDir = join(context.bookPath, 'chapters')
        await mkdir(chaptersDir, { recursive: true })

        const chapterData = {
          chapterNumber: chapterNum,
          title: params.title as string,
          content: params.content as string,
          outline: (params.outline as string) || '',
          summary: (params.summary as string) || '',
          wordCount: countChineseChars(params.content as string),
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        const filePath = join(chaptersDir, `${padded}.json`)
        await writeFile(filePath, JSON.stringify(chapterData, null, 2), 'utf-8')

        return {
          success: true,
          data: {
            path: `chapters/${padded}.json`,
            chapterNumber: chapterNum,
            wordCount: chapterData.wordCount,
          },
        }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    },
  }
}

function countChineseChars(text: string): number {
  return [...text].filter((c) => c.trim()).length
}
