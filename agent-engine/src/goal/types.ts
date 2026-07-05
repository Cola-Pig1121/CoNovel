// ============================================================================
// Goal System Types
// ============================================================================

export type GoalStatus = 'active' | 'paused' | 'blocked' | 'complete'

export interface Goal {
  id: string
  bookId: string
  objective: string
  status: GoalStatus
  progress: number // 0-100
  milestones: Milestone[]
  createdAt: string
  updatedAt: string
  completedAt?: string
  blockedReason?: string
  history: GoalEvent[]
}

export interface Milestone {
  id: string
  description: string
  completed: boolean
  completedAt?: string
}

export interface GoalEvent {
  timestamp: string
  type: 'created' | 'progress' | 'milestone' | 'blocked' | 'paused' | 'resumed' | 'completed'
  message: string
}
