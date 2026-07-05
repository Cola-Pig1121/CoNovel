// Stage types: single, foreach, reduce, loop, dag, dynamic
// Each stage has: id, type, agent, prompt, from (dependencies), output (control schema)

export type StageType = 'single' | 'foreach' | 'reduce' | 'loop' | 'dag' | 'dynamic'
export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused'
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export interface WorkflowSpec {
  schemaVersion: 1
  name: string
  description: string
  defaults: {
    agent: string
    readOnly: boolean
    tools: string[]
  }
  artifactGraph: {
    stages: StageSpec[]
  }
}

export interface StageSpec {
  id: string
  type: StageType
  agent: string
  prompt: string
  from?: string | string[]  // upstream stage IDs
  fromPath?: string         // JSON path for foreach (e.g., "$.items")
  each?: { prompt: string } // foreach child prompt template
  until?: string            // loop stop condition
  maxRounds?: number        // loop max iterations
  stages?: StageSpec[]      // dag child stages
  output?: { controlSchema?: any }
  tools?: string[]
  readOnly?: boolean
}

export interface WorkflowRun {
  id: string
  workflowName: string
  status: WorkflowStatus
  bookId: string
  startedAt: string
  completedAt?: string
  stages: StageRun[]
  context: Record<string, any>
}

export interface StageRun {
  stageId: string
  status: TaskStatus
  output?: any
  error?: string
  startedAt?: string
  completedAt?: string
  tasks: TaskRun[]
}

export interface TaskRun {
  id: string
  agent: string
  status: TaskStatus
  input?: any
  output?: any
  error?: string
  startedAt?: string
  completedAt?: string
}