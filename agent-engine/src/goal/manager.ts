// ============================================================================
// Goal Manager — Filesystem-backed goal tracking for books
// ============================================================================

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import type { Goal, GoalStatus, GoalEvent, Milestone } from './types.js'

export class GoalManager {
  private goalsDir: string

  constructor(bookPath: string) {
    this.goalsDir = join(bookPath, '.goals')
    if (!existsSync(this.goalsDir)) {
      mkdirSync(this.goalsDir, { recursive: true })
    }
  }

  // ------------------------------------------------------------------
  // CRUD
  // ------------------------------------------------------------------

  create(objective: string, milestoneDescriptions?: string[]): Goal {
    const id = `goal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
    const now = new Date().toISOString()

    const milestones = milestoneDescriptions
      ? milestoneDescriptions.map((desc, i) => ({
          id: `ms_${i}`,
          description: desc,
          completed: false,
        }))
      : GoalManager.generateMilestones(objective)

    const goal: Goal = {
      id,
      bookId: '',
      objective,
      status: 'active',
      progress: 0,
      milestones,
      createdAt: now,
      updatedAt: now,
      history: [
        {
          timestamp: now,
          type: 'created',
          message: `目标创建: ${objective}`,
        },
      ],
    }

    this.save(goal)
    return goal
  }

  get(goalId: string): Goal | null {
    const filePath = this.filePath(goalId)
    if (!existsSync(filePath)) return null
    try {
      const raw = readFileSync(filePath, 'utf-8')
      return JSON.parse(raw) as Goal
    } catch {
      return null
    }
  }

  list(): Goal[] {
    if (!existsSync(this.goalsDir)) return []
    const files = readdirSync(this.goalsDir).filter((f) => f.endsWith('.json'))
    const goals: Goal[] = []
    for (const file of files) {
      try {
        const raw = readFileSync(join(this.goalsDir, file), 'utf-8')
        goals.push(JSON.parse(raw) as Goal)
      } catch {
        // skip corrupted files
      }
    }
    return goals
  }

  delete(goalId: string): boolean {
    const filePath = this.filePath(goalId)
    if (!existsSync(filePath)) return false
    unlinkSync(filePath)
    return true
  }

  // ------------------------------------------------------------------
  // Status & Progress
  // ------------------------------------------------------------------

  updateStatus(goalId: string, status: GoalStatus, reason?: string): Goal {
    const goal = this.requireGoal(goalId)
    const now = new Date().toISOString()

    goal.status = status
    goal.updatedAt = now

    if (status === 'complete') {
      goal.progress = 100
      goal.completedAt = now
      goal.history.push({ timestamp: now, type: 'completed', message: '目标已完成' })
    } else if (status === 'blocked') {
      goal.blockedReason = reason ?? '未说明'
      goal.history.push({ timestamp: now, type: 'blocked', message: `目标被阻塞: ${goal.blockedReason}` })
    } else if (status === 'paused') {
      goal.history.push({ timestamp: now, type: 'paused', message: '目标已暂停' })
    } else if (status === 'active') {
      // Resuming
      goal.blockedReason = undefined
      goal.history.push({ timestamp: now, type: 'resumed', message: '目标已恢复' })
    }

    this.save(goal)
    return goal
  }

  updateProgress(goalId: string, progress: number): Goal {
    const goal = this.requireGoal(goalId)
    const now = new Date().toISOString()
    const clamped = Math.max(0, Math.min(100, progress))

    goal.progress = clamped
    goal.updatedAt = now
    goal.history.push({
      timestamp: now,
      type: 'progress',
      message: `进度更新: ${clamped}%`,
    })

    this.save(goal)
    return goal
  }

  completeMilestone(goalId: string, milestoneId: string): Goal {
    const goal = this.requireGoal(goalId)
    const now = new Date().toISOString()

    const milestone = goal.milestones.find((m) => m.id === milestoneId)
    if (!milestone) {
      throw new Error(`里程碑不存在: ${milestoneId}`)
    }

    milestone.completed = true
    milestone.completedAt = now
    goal.updatedAt = now

    // Auto-calculate progress based on completed milestones
    const completed = goal.milestones.filter((m) => m.completed).length
    goal.progress = Math.round((completed / goal.milestones.length) * 100)

    goal.history.push({
      timestamp: now,
      type: 'milestone',
      message: `里程碑完成: ${milestone.description}`,
    })

    // Auto-complete if all milestones done
    if (goal.milestones.every((m) => m.completed)) {
      goal.status = 'complete'
      goal.completedAt = now
      goal.progress = 100
      goal.history.push({ timestamp: now, type: 'completed', message: '所有里程碑已完成，目标自动完成' })
    }

    this.save(goal)
    return goal
  }

  addEvent(goalId: string, type: GoalEvent['type'], message: string): Goal {
    const goal = this.requireGoal(goalId)
    const now = new Date().toISOString()

    goal.history.push({ timestamp: now, type, message })
    goal.updatedAt = now

    this.save(goal)
    return goal
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  static generateMilestones(objective: string): Milestone[] {
    // Generate sensible default milestones from a writing objective
    const defaults: string[] = []

    // Detect common patterns in the objective
    const lower = objective.toLowerCase()

    if (lower.includes('章') || lower.includes('chapter') || lower.includes('节')) {
      defaults.push('完成大纲规划')
      defaults.push('完成初稿写作')
      defaults.push('审校与修订')
    } else if (lower.includes('卷') || lower.includes('volume')) {
      defaults.push('确定本卷主线')
      defaults.push('完成分章大纲')
      defaults.push('完成各章初稿')
      defaults.push('统稿与修订')
    } else if (lower.includes('人物') || lower.includes('character') || lower.includes('角色')) {
      defaults.push('梳理人物背景')
      defaults.push('确定人物弧光')
      defaults.push('融入剧情线')
    } else {
      // Generic milestones
      defaults.push('明确目标与范围')
      defaults.push('规划执行步骤')
      defaults.push('完成核心工作')
      defaults.push('审校与完善')
    }

    return defaults.map((desc, i) => ({
      id: `ms_${i}`,
      description: desc,
      completed: false,
    }))
  }

  // ------------------------------------------------------------------
  // Private
  // ------------------------------------------------------------------

  private filePath(goalId: string): string {
    return join(this.goalsDir, `${goalId}.json`)
  }

  private save(goal: Goal): void {
    writeFileSync(this.filePath(goal.id), JSON.stringify(goal, null, 2), 'utf-8')
  }

  private requireGoal(goalId: string): Goal {
    const goal = this.get(goalId)
    if (!goal) {
      throw new Error(`目标不存在: ${goalId}`)
    }
    return goal
  }
}
