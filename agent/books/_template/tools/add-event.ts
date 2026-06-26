import { defineTool } from 'eve/tools';
import { z } from 'zod';

export const addEvent = defineTool({
  name: 'add-event',
  description: '添加时间线事件',
  inputSchema: z.object({
    bookId: z.string(),
    description: z.string(),
    chapterNumber: z.number(),
    location: z.string().optional(),
    significance: z.enum(['minor', 'moderate', 'major', 'critical']),
    characters: z.array(z.string()).optional(),
  }),
  execute: async (input) => {
    const res = await fetch(`${process.env.CONOVEL_API_URL || 'http://localhost:3002'}/api/books/${input.bookId}/timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return res.ok ? { success: true } : { success: false };
  },
});
