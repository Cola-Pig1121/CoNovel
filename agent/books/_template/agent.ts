import { defineAgent } from 'eve/agent';

export default defineAgent({
  name: 'CoNovel Book Agent',
  description: '单本小说的写作协调Agent，管理15个专业子Agent',

  model: {
    provider: 'litellm',
    model: 'claude-sonnet-4-20250514',
  },

  config: {
    durable: true,
    checkpointEvery: 'step',
    sandbox: {
      enabled: true,
      filesystem: true,
    },
  },
});
