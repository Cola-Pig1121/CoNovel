// ============================================================================
// Vercel Eve-style Agent Framework Types
// Agent = Directory on disk with structured files
// ============================================================================

import type { CoNovelTool } from '../tools/types.js'

// Re-export for convenience
export type { CoNovelTool as AgentTool }

/**
 * Skill definition — reusable writing capability.
 * Skills are markdown files that provide domain-specific guidance.
 */
export interface AgentSkill {
  name: string
  description: string
  content: string  // markdown content
}

/**
 * Sub-agent definition — another agent this agent can delegate to.
 */
export interface SubAgentRef {
  role: string
  description: string
  whenToUse: string
}

/**
 * Agent context — runtime state passed to tools during execution.
 */
export interface AgentContext {
  bookPath: string
  bookState: any
  chapterNumber: number
  chapterContent?: string
  characters: any[]
  knowledge: any[]
  styleProfile?: any
  [key: string]: any
}

/**
 * Agent definition — the complete Eve-style agent specification.
 * Loaded from a directory on disk.
 */
export interface AgentDefinition {
  // Identity
  role: string
  name: string
  nameZh: string

  // From disk
  instructions: string       // instructions.md content
  tools: CoNovelTool[]       // tools/ (TypeScript implementations)
  skills: AgentSkill[]       // skills/ directory (markdown)
  subagents: SubAgentRef[]   // subagents/ directory (markdown)

  // Model config (from agent-config.json)
  provider: string
  modelId: string
  temperature: number
  maxTokens: number
  enabled: boolean
}

/**
 * Agent execution result.
 */
export interface AgentResult {
  agent: string
  output: string
  toolCalls?: { tool: string; params: any; result: any }[]
  duration: number
  success: boolean
  error?: string
}
