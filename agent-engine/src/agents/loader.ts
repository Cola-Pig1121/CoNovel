// ============================================================================
// Agent Loader — Eve-style: reads agent directories from disk
// Each agent = directory with: instructions.md, tools/*.ts, skills/*.md, subagents/*.md
// ============================================================================

import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { AgentDefinition, AgentSkill, SubAgentRef } from './types.js'
import type { CoNovelTool } from '../tools/types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const AGENTS_ROOT = join(__dirname, '..', '..', 'agents')

// Cache
const agentCache = new Map<string, AgentDefinition>()

// ---------------------------------------------------------------------------
// Directory reading helpers
// ---------------------------------------------------------------------------

function readMdIfExists(dir: string, filename: string): string {
  const path = join(dir, filename)
  if (!existsSync(path)) return ''
  return readFileSync(path, 'utf-8')
}

function listSubdirs(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((f) => {
    const full = join(dir, f)
    return statSync(full).isDirectory()
  })
}

// ---------------------------------------------------------------------------
// Load a single agent from its directory
// ---------------------------------------------------------------------------

export function loadAgent(role: string): AgentDefinition | null {
  if (agentCache.has(role)) return agentCache.get(role)!

  // Try both dash-separated and underscore names
  const candidates = [role, role.replace(/_/g, '-')]
  let agentDir = ''
  for (const name of candidates) {
    const dir = join(AGENTS_ROOT, name)
    if (existsSync(dir) && statSync(dir).isDirectory()) {
      agentDir = dir
      break
    }
  }

  // If no directory found, try flat .md file
  if (!agentDir) {
    for (const name of candidates) {
      const mdPath = join(AGENTS_ROOT, `${name}.md`)
      if (existsSync(mdPath)) {
        const instructions = readFileSync(mdPath, 'utf-8')
        const agent: AgentDefinition = {
          role,
          name: role.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          nameZh: getRoleNameZh(role),
          instructions,
          tools: [],
          skills: [],
          subagents: [],
          provider: 'openai',
          modelId: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 4096,
          enabled: true,
        }
        agentCache.set(role, agent)
        return agent
      }
    }
    return null
  }

  // 1. instructions.md — the system prompt
  const instructions = readMdIfExists(agentDir, 'instructions.md')

  // 2. tools/ — tool .ts files are imported by the tool registry, not loaded here
  //    Tools are registered in src/tools/index.ts and mapped by agent role
  const tools: CoNovelTool[] = []

  // 3. skills/ — reusable capabilities (.md files)
  const skillsDir = join(agentDir, 'skills')
  const skills: AgentSkill[] = []
  if (existsSync(skillsDir)) {
    for (const file of readdirSync(skillsDir)) {
      if (!file.endsWith('.md')) continue
      const content = readFileSync(join(skillsDir, file), 'utf-8')
      const name = file.replace('.md', '')
      skills.push({
        name,
        description: content.split('\n')[0]?.replace(/^#\s*/, '') ?? name,
        content,
      })
    }
  }

  // 4. subagents/ — other agents this agent can delegate to (.md files)
  const subagentsDir = join(agentDir, 'subagents')
  const subagents: SubAgentRef[] = []
  if (existsSync(subagentsDir)) {
    for (const file of readdirSync(subagentsDir)) {
      if (!file.endsWith('.md')) continue
      const content = readFileSync(join(subagentsDir, file), 'utf-8')
      const roleRef = file.replace('.md', '')
      const lines = content.split('\n')
      const descLine = lines.find((l) => l.startsWith('description:')) ?? ''
      const whenLine = lines.find((l) => l.startsWith('when:')) ?? ''
      subagents.push({
        role: roleRef,
        description: descLine.replace('description:', '').trim() || `${roleRef} agent`,
        whenToUse: whenLine.replace('when:', '').trim() || '',
      })
    }
  }

  const agent: AgentDefinition = {
    role,
    name: role.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    nameZh: getRoleNameZh(role),
    instructions,
    tools,
    skills,
    subagents,
    provider: 'openai',
    modelId: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 4096,
    enabled: true,
  }

  agentCache.set(role, agent)
  return agent
}

// ---------------------------------------------------------------------------
// Load all agents
// ---------------------------------------------------------------------------

export function loadAllAgents(): AgentDefinition[] {
  const roles = listSubdirs(AGENTS_ROOT).filter((d) => !d.startsWith('_'))
  return roles
    .map((role) => loadAgent(role))
    .filter((a): a is AgentDefinition => a !== null)
}

// ---------------------------------------------------------------------------
// Build system prompt from agent definition
// ---------------------------------------------------------------------------

export function buildSystemPrompt(agent: AgentDefinition): string {
  let prompt = agent.instructions

  if (agent.skills.length > 0) {
    prompt += '\n\n## 可用技能\n'
    for (const skill of agent.skills) {
      prompt += `\n### ${skill.name}\n${skill.content}\n`
    }
  }

  if (agent.subagents.length > 0) {
    prompt += '\n\n## 可调用的子智能体\n'
    for (const sub of agent.subagents) {
      prompt += `\n- **${sub.role}**: ${sub.description} (使用场景: ${sub.whenToUse})\n`
    }
  }

  if (agent.tools.length > 0) {
    prompt += '\n\n## 可用工具\n'
    for (const tool of agent.tools) {
      prompt += `\n- **${tool.definition.name}**: ${tool.definition.description}\n`
    }
  }

  return prompt
}

// ---------------------------------------------------------------------------
// Clear cache
// ---------------------------------------------------------------------------

export function clearAgentCache(): void {
  agentCache.clear()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROLE_NAME_ZH: Record<string, string> = {
  'executive-editor': '主编',
  'story-architect': '故事架构师',
  'narrative-writer': '叙事写手',
  'character-designer': '角色设计师',
  'character-intelligence': '★角色智能',
  'reviewer': '审稿人',
  'editor': '编辑',
  'de-ai-editor': '去AI味编辑',
  'fact-checker': '事实核查',
  'continuity-checker': '连续性检查',
  'pacing-controller': '节奏控制',
  'foreshadowing-tracker': '伏笔追踪',
  'style-analyzer': '文风分析',
  'observer': '观察者',
  'radar': '雷达',
  'reflector': '反思者',
  'market-scanner': '市场扫描',
  'text-analyzer': '文本分析',
}

function getRoleNameZh(role: string): string {
  return ROLE_NAME_ZH[role] ?? role
}
