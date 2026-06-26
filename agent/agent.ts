import { defineAgent } from 'eve/agent';

export default defineAgent({
  name: 'CoNovel',
  description: '自进化多Agent小说写作系统 - 协调15个专业Agent创作中文网络小说',

  model: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
  },

  // Subagents will be loaded from subagents/ directory
  // Tools will be loaded from tools/ directory
  // Skills will be loaded from skills/ directory

  config: {
    // Persistence settings
    durable: true,
    checkpointEvery: 'step',

    // Sandbox settings
    sandbox: {
      enabled: true,
      filesystem: true,
    },

    // Human-in-the-loop settings
    approval: {
      // Require approval for external API calls
      tools: ['publish-chapter', 'send-notification'],
    },
  },
});
