import { defineTool } from 'eve/tools';
import { z } from 'zod';

export const updateCharacter = defineTool({
  name: 'update-character',
  description: '更新角色状态（性格、关系、出场等）',
  inputSchema: z.object({
    bookId: z.string(),
    characterId: z.string(),
    updates: z.record(z.any()).describe('要更新的字段'),
  }),
  execute: async (input) => {
    const res = await fetch(`${process.env.CONOVEL_API_URL || 'http://localhost:3002'}/api/books/${input.bookId}/characters/${input.characterId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input.updates),
    });
    return res.ok ? { success: true } : { success: false };
  },
});
