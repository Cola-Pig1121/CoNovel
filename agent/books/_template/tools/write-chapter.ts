import { defineTool } from 'eve/tools';
import { z } from 'zod';

/**
 * Write Chapter - 保存章节内容（纯文本）
 * 供Writer、Editor、De-AI Editor等Agent保存修改后的文本
 */
export const writeChapter = defineTool({
  name: 'write-chapter',
  description: '保存章节纯文本内容（自动清除markdown语法）',

  inputSchema: z.object({
    bookId: z.string().describe('书籍ID'),
    chapterNumber: z.number().describe('章节号'),
    content: z.string().describe('纯文本内容'),
    status: z.string().optional().describe('章节状态'),
    outline: z.string().optional().describe('章节大纲'),
  }),

  execute: async (input) => {
    const { bookId, chapterNumber, content, status, outline } = input;
    const baseUrl = process.env.CONOVEL_API_URL || 'http://localhost:3002';
    const res = await fetch(`${baseUrl}/api/books/${bookId}/chapters/${chapterNumber}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, status, outline }),
    });
    if (!res.ok) return { success: false, error: 'Failed to save chapter' };
    const result = await res.json();
    return { success: true, wordCount: result.wordCount };
  },
});
