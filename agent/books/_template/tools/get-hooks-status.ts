import { defineTool } from 'eve/tools';
import { z } from 'zod';

export const getHooksStatus = defineTool({
  name: 'get-hooks-status',
  description: '获取伏笔健康状态（逾期、爆发、无推进检测）',
  inputSchema: z.object({ bookId: z.string() }),
  execute: async (input) => {
    const res = await fetch(`${process.env.CONOVEL_API_URL || 'http://localhost:3002'}/api/books/${input.bookId}/hooks`);
    return res.ok ? await res.json() : { summary: {}, alerts: {}, recommendations: [] };
  },
});
