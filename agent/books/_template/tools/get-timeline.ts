import { defineTool } from 'eve/tools';
import { z } from 'zod';

export const getTimeline = defineTool({
  name: 'get-timeline',
  description: '获取时间线事件列表',
  inputSchema: z.object({ bookId: z.string() }),
  execute: async (input) => {
    const res = await fetch(`${process.env.CONOVEL_API_URL || 'http://localhost:3002'}/api/books/${input.bookId}/timeline`);
    return res.ok ? await res.json() : { timeline: [] };
  },
});
