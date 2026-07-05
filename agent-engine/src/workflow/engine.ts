import { randomUUID } from 'crypto'
import { WorkflowSpec, StageSpec, WorkflowRun, StageRun, TaskRun, WorkflowStatus, TaskStatus } from './types'
import { createLoopState, shouldContinueLoop, checkLoopConvergence } from './loop'
import * as fs from 'fs/promises'
import * as path from 'path'

export class WorkflowEngine {
  private spec: WorkflowSpec
  private run: WorkflowRun
  private agentExecutor: (agent: string, prompt: string, context: any) => Promise<string>
  private bookPath: string

  constructor(
    spec: WorkflowSpec,
    bookId: string,
    agentExecutor: (agent: string, prompt: string, context: any) => Promise<string>,
    bookPath: string = '.'
  ) {
    this.spec = spec
    this.agentExecutor = agentExecutor
    this.bookPath = bookPath
    this.run = {
      id: randomUUID(),
      workflowName: spec.name,
      status: 'pending',
      bookId,
      startedAt: new Date().toISOString(),
      stages: spec.artifactGraph.stages.map(stage => ({
        stageId: stage.id,
        status: 'pending' as TaskStatus,
        tasks: []
      })),
      context: {}
    }
  }

  async runWorkflow(): Promise<WorkflowRun> {
    this.run.status = 'running'
    this.run.startedAt = new Date().toISOString()
    
    try {
      const executionOrder = this.resolveExecutionOrder(this.spec.artifactGraph.stages)
      
      for (const wave of executionOrder) {
        if ((this.run.status as WorkflowStatus) === 'paused') {
          await this.saveRunState()
          return this.run
        }
        
        // Execute stages in parallel within a wave
        const promises = wave.map(stage => 
          this.executeStage(stage, this.getUpstreamOutputs(stage.id, new Map(
            this.run.stages
              .filter(sr => sr.status === 'completed')
              .map(sr => [sr.stageId, sr.output])
          )))
        )
        
        await Promise.all(promises)
      }
      
      this.run.status = 'completed'
      this.run.completedAt = new Date().toISOString()
    } catch (error) {
      this.run.status = 'failed'
      this.run.stages.forEach(stageRun => {
        if (stageRun.status === 'running') {
          stageRun.status = 'failed'
          stageRun.error = error instanceof Error ? error.message : String(error)
        }
      })
    }
    
    await this.saveRunState()
    return this.run
  }

  async resume(): Promise<WorkflowRun> {
    const savedRun = await WorkflowEngine.loadRunState(this.run.id, this.bookPath)
    this.run = savedRun
    return this.runWorkflow()
  }

  async pause(): Promise<void> {
    this.run.status = 'paused'
    await this.saveRunState()
  }

  private async executeStage(stage: StageSpec, upstreamOutputs: Map<string, any>): Promise<any> {
    const stageRun = this.run.stages.find(sr => sr.stageId === stage.id)
    if (!stageRun) throw new Error(`Stage ${stage.id} not found in run`)
    
    stageRun.status = 'running'
    stageRun.startedAt = new Date().toISOString()
    
    try {
      let output: any
      
      // Merge upstream outputs into context
      const context = {
        ...this.run.context,
        upstream: Object.fromEntries(upstreamOutputs)
      }
      
      switch (stage.type) {
        case 'single':
          output = await this.executeSingle(stage, context)
          break
        case 'foreach':
          output = await this.executeForeach(stage, context)
          break
        case 'reduce':
          output = await this.executeReduce(stage, context)
          break
        case 'loop':
          output = await this.executeLoop(stage, context)
          break
        case 'dag':
          output = await this.executeDag(stage, context)
          break
        case 'dynamic':
          output = await this.executeDynamic(stage, context)
          break
        default:
          throw new Error(`Unknown stage type: ${stage.type}`)
      }
      
      stageRun.output = output
      stageRun.status = 'completed'
      stageRun.completedAt = new Date().toISOString()
      
      // Store output in run context
      this.run.context[stage.id] = output
      
      return output
    } catch (error) {
      stageRun.status = 'failed'
      stageRun.error = error instanceof Error ? error.message : String(error)
      throw error
    }
  }

  private async executeSingle(stage: StageSpec, context: any): Promise<any> {
    const taskRun: TaskRun = {
      id: randomUUID(),
      agent: stage.agent,
      status: 'running',
      startedAt: new Date().toISOString()
    }
    
    this.run.stages.find(sr => sr.stageId === stage.id)?.tasks.push(taskRun)
    
    try {
      const prompt = this.interpolatePrompt(stage.prompt, context)
      const output = await this.agentExecutor(stage.agent, prompt, context)
      
      taskRun.status = 'completed'
      taskRun.output = output
      taskRun.completedAt = new Date().toISOString()
      
      return output
    } catch (error) {
      taskRun.status = 'failed'
      taskRun.error = error instanceof Error ? error.message : String(error)
      throw error
    }
  }

  private async executeForeach(stage: StageSpec, context: any): Promise<any[]> {
    if (!stage.fromPath || !stage.each) {
      throw new Error(`ForEach stage ${stage.id} requires fromPath and each`)
    }
    
    const items = this.resolveJsonPath(context, stage.fromPath)
    if (!Array.isArray(items)) {
      throw new Error(`ForEach source must be an array, got ${typeof items}`)
    }
    
    const results: any[] = []
    
    for (const item of items) {
      const itemContext = { ...context, item }
      const taskRun: TaskRun = {
        id: randomUUID(),
        agent: stage.agent,
        status: 'running',
        input: item,
        startedAt: new Date().toISOString()
      }
      
      this.run.stages.find(sr => sr.stageId === stage.id)?.tasks.push(taskRun)
      
      try {
        const prompt = this.interpolatePrompt(stage.each.prompt, itemContext)
        const output = await this.agentExecutor(stage.agent, prompt, itemContext)
        results.push(output)
        
        taskRun.status = 'completed'
        taskRun.output = output
        taskRun.completedAt = new Date().toISOString()
      } catch (error) {
        taskRun.status = 'failed'
        taskRun.error = error instanceof Error ? error.message : String(error)
        throw error
      }
    }
    
    return results
  }

  private async executeReduce(stage: StageSpec, context: any): Promise<any> {
    const taskRun: TaskRun = {
      id: randomUUID(),
      agent: stage.agent,
      status: 'running',
      startedAt: new Date().toISOString()
    }
    
    this.run.stages.find(sr => sr.stageId === stage.id)?.tasks.push(taskRun)
    
    try {
      const prompt = this.interpolatePrompt(stage.prompt, context)
      const output = await this.agentExecutor(stage.agent, prompt, context)
      
      taskRun.status = 'completed'
      taskRun.output = output
      taskRun.completedAt = new Date().toISOString()
      
      return output
    } catch (error) {
      taskRun.status = 'failed'
      taskRun.error = error instanceof Error ? error.message : String(error)
      throw error
    }
  }

  private async executeLoop(stage: StageSpec, context: any): Promise<any> {
    const maxRounds = stage.maxRounds || 3
    let loopState = createLoopState(maxRounds)
    let currentOutput: any = null
    
    while (shouldContinueLoop(loopState)) {
      const taskRun: TaskRun = {
        id: randomUUID(),
        agent: stage.agent,
        status: 'running',
        input: { round: loopState.round },
        startedAt: new Date().toISOString()
      }
      
      this.run.stages.find(sr => sr.stageId === stage.id)?.tasks.push(taskRun)
      
      try {
        const prompt = this.interpolatePrompt(stage.prompt, {
          ...context,
          loopState: {
            round: loopState.round,
            maxRounds: loopState.maxRounds,
            history: loopState.history
          }
        })
        
        const output = await this.agentExecutor(stage.agent, prompt, context)
        currentOutput = output
        
        loopState = checkLoopConvergence(loopState, output, stage.until)
        
        taskRun.status = 'completed'
        taskRun.output = output
        taskRun.completedAt = new Date().toISOString()
      } catch (error) {
        taskRun.status = 'failed'
        taskRun.error = error instanceof Error ? error.message : String(error)
        throw error
      }
    }
    
    return currentOutput
  }

  private async executeDag(stage: StageSpec, context: any): Promise<any> {
    if (!stage.stages) {
      throw new Error(`DAG stage ${stage.id} requires stages array`)
    }
    
    const results: Record<string, any> = {}
    
    // Execute all child stages in parallel
    const promises = stage.stages.map(async childStage => {
      const childContext = { ...context, dagResults: results }
      results[childStage.id] = await this.executeStage(childStage, new Map(Object.entries(results)))
    })
    
    await Promise.all(promises)
    
    return results
  }

  private async executeDynamic(stage: StageSpec, context: any): Promise<any> {
    // Dynamic stages generate their own stage specs at runtime
    // For now, delegate to single stage execution
    return this.executeSingle(stage, context)
  }

  private resolveExecutionOrder(stages: StageSpec[]): StageSpec[][] {
    // Topological sort with wave detection
    const stageMap = new Map(stages.map(s => [s.id, s]))
    const waves: StageSpec[][] = []
    const executed = new Set<string>()
    let remaining = [...stages]
    
    while (remaining.length > 0) {
      const wave: StageSpec[] = []
      const nextRemaining: StageSpec[] = []
      
      for (const stage of remaining) {
        const deps = this.getDependencies(stage)
        const allDepsMet = deps.every(dep => executed.has(dep))
        
        if (allDepsMet) {
          wave.push(stage)
        } else {
          nextRemaining.push(stage)
        }
      }
      
      if (wave.length === 0 && nextRemaining.length > 0) {
        throw new Error('Circular dependency detected in workflow stages')
      }
      
      waves.push(wave)
      wave.forEach(s => executed.add(s.id))
      remaining = nextRemaining
    }
    
    return waves
  }

  private getDependencies(stage: StageSpec): string[] {
    if (!stage.from) return []
    if (Array.isArray(stage.from)) return stage.from
    return [stage.from]
  }

  private getUpstreamOutputs(stageId: string, outputs: Map<string, any>): Map<string, any> {
    const stage = this.spec.artifactGraph.stages.find(s => s.id === stageId)
    if (!stage) return new Map()
    
    const upstreamOutputs = new Map<string, any>()
    const deps = this.getDependencies(stage)
    
    for (const dep of deps) {
      const output = outputs.get(dep)
      if (output !== undefined) {
        upstreamOutputs.set(dep, output)
      }
    }
    
    return upstreamOutputs
  }

  private interpolatePrompt(template: string, context: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = context[key]
      return value !== undefined ? String(value) : `{{${key}}}`
    })
  }

  private resolveJsonPath(obj: any, path: string): any {
    // Simple JSON path resolution (e.g., "$.items")
    const parts = path.replace(/^\$\./, '').split('.')
    let current = obj
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined
      }
      current = current[part]
    }
    
    return current
  }

  private async saveRunState(): Promise<void> {
    const stateDir = path.join(this.bookPath, '.workflow-state')
    await fs.mkdir(stateDir, { recursive: true })
    const stateFile = path.join(stateDir, `${this.run.id}.json`)
    await fs.writeFile(stateFile, JSON.stringify(this.run, null, 2))
  }

  static async loadRunState(runId: string, bookPath: string): Promise<WorkflowRun> {
    const stateFile = path.join(bookPath, '.workflow-state', `${runId}.json`)
    const content = await fs.readFile(stateFile, 'utf-8')
    return JSON.parse(content)
  }
}