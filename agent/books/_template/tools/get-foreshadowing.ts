import { defineTool } from 'eve/tools';
import { z } from 'zod';

export const getForeshadowing = defineTool({
  name: 'get-foreshadowing',
  description: '获取伏笔列表及其状态',
  inputSchema: z.object({ bookId: z.string() }),
  execute: async (input) => {
    const res = await fetch(`${process.env.CONOVEL_API_URL || 'http://localhost:3002'}/api/books/${input.bookId}/foreshadowing`);
    return res.ok ? await res.json() : { foreshadowing: [] };
  },
});
