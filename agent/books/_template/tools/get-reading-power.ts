import { defineTool } from 'eve/tools';
import { z } from 'zod';

export const getReadingPower = defineTool({
  name: 'get-reading-power',
  description: '获取追读力数据（钩子强度、爽点交付、张力、悬念）',
  inputSchema: z.object({ bookId: z.string() }),
  execute: async (input) => {
    const res = await fetch(`${process.env.CONOVEL_API_URL || 'http://localhost:3002'}/api/books/${input.bookId}/reading-power`);
    return res.ok ? await res.json() : { overall: 0, chapters: [] };
  },
});
