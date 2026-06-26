import { defineTool } from 'eve/tools';
import { z } from 'zod';

export const addForeshadowing = defineTool({
  name: 'add-foreshadowing',
  description: '植入新伏笔',
  inputSchema: z.object({
    bookId: z.string(),
    description: z.string().describe('伏笔描述'),
    type: z.enum(['plot', 'character', 'world', 'emotion']),
    urgency: z.enum(['low', 'medium', 'high', 'critical']),
    plantedIn: z.number().describe('植入章节'),
    maxDelay: z.number().optional().describe('最长延迟回收章节'),
  }),
  execute: async (input) => {
    const res = await fetch(`${process.env.CONOVEL_API_URL || 'http://localhost:3002'}/api/books/${input.bookId}/foreshadowing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return res.ok ? { success: true, id: (await res.json()).id } : { success: false };
  },
});
