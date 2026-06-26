import { defineTool } from 'eve/tools';
import { z } from 'zod';

export const getStyle = defineTool({
  name: 'get-style',
  description: '获取风格配置（禁词、叙事视角、句式风格等）',
  inputSchema: z.object({ bookId: z.string() }),
  execute: async (input) => {
    const res = await fetch(`${process.env.CONOVEL_API_URL || 'http://localhost:3002'}/api/books/${input.bookId}/style`);
    return res.ok ? await res.json() : {};
  },
});
