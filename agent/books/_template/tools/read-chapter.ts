import { defineTool } from 'eve/tools';
import { z } from 'zod';

/**
 * Read Chapter - 读取指定章节内容
 * 供Writer、Reviewer、Editor等Agent读取章节文本
 */
export const readChapter = defineTool({
  name: 'read-chapter',
  description: '读取指定章节的纯文本内容和元数据',

  inputSchema: z.object({
    bookId: z.string().describe('书籍ID'),
    chapterNumber: z.number().describe('章节号'),
  }),

  execute: async (input) => {
    const { bookId, chapterNumber } = input;
    const baseUrl = process.env.CONOVEL_API_URL || 'http://localhost:3002';
    const res = await fetch(`${baseUrl}/api/books/${bookId}/chapters/${chapterNumber}`);
    if (!res.ok) return { success: false, error: `Chapter ${chapterNumber} not found` };
    const chapter = await res.json();
    return {
      success: true,
      content: chapter.content || '',
      title: chapter.title || '',
      wordCount: chapter.wordCount || 0,
      status: chapter.status || 'draft',
      outline: chapter.outline || '',
    };
  },
});
