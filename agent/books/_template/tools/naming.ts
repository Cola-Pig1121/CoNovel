import { defineTool } from 'eve/tools';
import { z } from 'zod';

export const naming = defineTool({
  name: 'naming',
  description: '取名工具 - 生成角色/地名/物品/势力名称，自动排除同质化名称',
  inputSchema: z.object({
    type: z.enum(['character', 'place', 'item', 'faction']),
    genre: z.string(),
    gender: z.enum(['male', 'female', 'neutral']).optional(),
    count: z.number().optional().default(10),
    avoidNames: z.array(z.string()).optional(),
  }),
  execute: async (input) => {
    const res = await fetch(`${process.env.CONOVEL_API_URL || 'http://localhost:3002'}/api/naming`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return res.ok ? await res.json() : { names: [] };
  },
});
