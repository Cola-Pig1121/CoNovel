import { defineTool } from 'eve/tools';
import { z } from 'zod';

export const getGraph = defineTool({
  name: 'get-graph',
  description: '获取知识图谱数据（角色关系、事件网络）',
  inputSchema: z.object({ bookId: z.string() }),
  execute: async (input) => {
    const res = await fetch(`${process.env.CONOVEL_API_URL || 'http://localhost:3002'}/api/books/${input.bookId}/graph`);
    return res.ok ? await res.json() : { nodes: [], edges: [] };
  },
});
