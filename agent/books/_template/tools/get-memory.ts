import { defineTool } from 'eve/tools';
import { z } from 'zod';

export const getMemory = defineTool({
  name: 'get-memory',
  description: '获取三层记忆数据（工作记忆/故事记忆/风格记忆）',
  inputSchema: z.object({ bookId: z.string() }),
  execute: async (input) => {
    const res = await fetch(`${process.env.CONOVEL_API_URL || 'http://localhost:3002'}/api/books/${input.bookId}/memory`);
    return res.ok ? await res.json() : { l2: {}, l3: {} };
  },
});
