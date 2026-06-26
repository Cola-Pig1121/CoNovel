import { defineTool } from 'eve/tools';
import { z } from 'zod';

export const getCharacters = defineTool({
  name: 'get-characters',
  description: '获取小说所有角色列表及其状态',
  inputSchema: z.object({ bookId: z.string() }),
  execute: async (input) => {
    const res = await fetch(`${process.env.CONOVEL_API_URL || 'http://localhost:3002'}/api/books/${input.bookId}/characters`);
    return res.ok ? await res.json() : { characters: [] };
  },
});
