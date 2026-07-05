// ============================================================================
// Agent Module — Public API
// Vercel Eve-style: Agent = Directory on disk
// ============================================================================

export type { AgentDefinition, AgentTool, AgentSkill, SubAgentRef, AgentContext, AgentResult } from './types.js'
export { loadAgent, loadAllAgents, buildSystemPrompt, clearAgentCache } from './loader.js'
