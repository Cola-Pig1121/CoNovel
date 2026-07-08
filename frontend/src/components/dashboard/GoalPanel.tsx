import { useState, useEffect, useCallback } from 'react'
import { goalApi } from '@/lib/api'
import type { Goal, GoalEvent } from '@/lib/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GoalPanelProps {
  bookId: string
}

// ---------------------------------------------------------------------------
// GoalPanel
// ---------------------------------------------------------------------------

export default function GoalPanel({ bookId }: GoalPanelProps) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newObjective, setNewObjective] = useState('')
  const [newMilestones, setNewMilestones] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const activeGoal = goals.find((g) => g.status === 'active' || g.status === 'paused' || g.status === 'blocked')

  const fetchGoals = useCallback(async () => {
    try {
      const data = await goalApi.list(bookId)
      setGoals(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [bookId])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  // -- Actions --

  async function handleCreate() {
    if (!newObjective.trim()) return
    setSubmitting(true)
    try {
      const milestones = newMilestones
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
      const goal = await goalApi.create(bookId, newObjective.trim(), milestones.length > 0 ? milestones : undefined)
      setGoals((prev) => [goal, ...prev])
      setShowNew(false)
      setNewObjective('')
      setNewMilestones('')
    } catch (err) {
      console.error('Failed to create goal:', err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePauseResume() {
    if (!activeGoal) return
    const newStatus = activeGoal.status === 'paused' ? 'active' : 'paused'
    try {
      const updated = await goalApi.updateStatus(bookId, activeGoal.id, newStatus)
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))
    } catch (err) {
      console.error('Failed to update goal status:', err)
    }
  }

  async function handleComplete() {
    if (!activeGoal) return
    try {
      const updated = await goalApi.updateStatus(bookId, activeGoal.id, 'complete')
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))
    } catch (err) {
      console.error('Failed to complete goal:', err)
    }
  }

  async function handleDelete() {
    if (!activeGoal) return
    try {
      await goalApi.delete(bookId, activeGoal.id)
      setGoals((prev) => prev.filter((g) => g.id !== activeGoal.id))
    } catch (err) {
      console.error('Failed to delete goal:', err)
    }
  }

  async function handleProgressUpdate(progress: number) {
    if (!activeGoal) return
    try {
      const updated = await goalApi.updateProgress(bookId, activeGoal.id, progress)
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))
    } catch (err) {
      console.error('Failed to update progress:', err)
    }
  }

  async function handleMilestoneComplete(milestoneId: string) {
    if (!activeGoal) return
    try {
      const updated = await goalApi.completeMilestone(bookId, activeGoal.id, milestoneId)
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))
    } catch (err) {
      console.error('Failed to complete milestone:', err)
    }
  }

  async function handleSyncProgress() {
    setSyncing(true)
    try {
      await goalApi.autoUpdate(bookId)
      // Refresh goals to get updated data
      const data = await goalApi.list(bookId)
      setGoals(data)
    } catch (err) {
      console.error('Failed to sync goal progress:', err)
    } finally {
      setSyncing(false)
    }
  }

  // -- Render --

  if (loading) {
    return (
      <div className="border border-border p-6 rounded-none">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted">加载目标中...</div>
      </div>
    )
  }

  return (
    <div className="border border-border rounded-none">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-baseline justify-between">
        <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted">
          写作目标
        </h2>
        {!activeGoal && !showNew && (
          <button
            onClick={() => setShowNew(true)}
            className="text-[10px] uppercase tracking-widest border border-foreground px-3 py-1 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none"
          >
            新建目标
          </button>
        )}
      </div>

      {/* New Goal Form */}
      {showNew && (
        <div className="p-6 border-b border-border">
          <label className="block mb-4">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
              目标
            </span>
            <textarea
              value={newObjective}
              onChange={(e) => setNewObjective(e.target.value)}
              placeholder="例如：完成第一幕初稿"
              rows={2}
              className="w-full border border-border bg-transparent px-4 py-3 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors placeholder:text-muted resize-none"
            />
          </label>
          <label className="block mb-4">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted block mb-2">
              里程碑（每行一个）
            </span>
            <textarea
              value={newMilestones}
              onChange={(e) => setNewMilestones(e.target.value)}
              placeholder="撰写第一幕大纲&#10;写作第1-3章&#10;修改润色"
              rows={3}
              className="w-full border border-border bg-transparent px-4 py-3 text-sm font-sans rounded-none shadow-none outline-none focus:border-foreground transition-colors placeholder:text-muted resize-none"
            />
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowNew(false); setNewObjective(''); setNewMilestones('') }}
              className="text-xs uppercase tracking-widest border border-border px-4 py-2 hover:border-foreground transition-colors rounded-none shadow-none text-muted"
            >
              取消
            </button>
            <button
              onClick={handleCreate}
              disabled={submitting || !newObjective.trim()}
              className="text-xs uppercase tracking-widest border border-foreground px-4 py-2 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? '创建中...' : '创建目标'}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!activeGoal && !showNew && (
        <div className="p-12 text-center">
          <p className="font-serif text-xl tracking-tight mb-2">暂无活跃目标</p>
          <p className="text-sm text-muted">
            设置写作目标以追踪你的进度。
          </p>
        </div>
      )}

      {/* Active Goal */}
      {activeGoal && (
        <div className="p-6">
          {/* Objective */}
          <p className="font-serif text-xl leading-relaxed mb-6">
            {activeGoal.objective}
          </p>

          {/* Status badge */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] uppercase tracking-widest bg-foreground text-background px-2 py-0.5">
              {activeGoal.status}
            </span>
            {activeGoal.status === 'paused' && activeGoal.blockedReason && (
              <span className="text-xs text-muted">{activeGoal.blockedReason}</span>
            )}
            {activeGoal.status === 'blocked' && activeGoal.blockedReason && (
              <span className="text-xs text-muted">{activeGoal.blockedReason}</span>
            )}
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
                进度
              </span>
              <span className="text-xs font-sans tabular-nums">
                {activeGoal.progress}%
              </span>
            </div>
            <div className="w-full h-px bg-border">
              <div
                className="h-px bg-foreground transition-all"
                style={{ width: `${Math.min(activeGoal.progress, 100)}%` }}
              />
            </div>
            {/* Quick progress buttons */}
            <div className="flex gap-2 mt-2">
              {[25, 50, 75, 100].map((p) => (
                <button
                  key={p}
                  onClick={() => handleProgressUpdate(p)}
                  disabled={activeGoal.progress === p}
                  className="text-[10px] uppercase tracking-widest border border-border px-2 py-0.5 hover:border-foreground transition-colors rounded-none shadow-none disabled:opacity-40"
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>

          {/* Milestones */}
          {activeGoal.milestones.length > 0 && (
            <div className="mb-6">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted mb-3">
                里程碑
              </h3>
              <ul className="space-y-0">
                {activeGoal.milestones.map((ms) => (
                  <li
                    key={ms.id}
                    className="flex items-start gap-3 border-b border-border last:border-b-0 py-3"
                  >
                    <button
                      onClick={() => !ms.completed && handleMilestoneComplete(ms.id)}
                      className={`mt-0.5 w-3.5 h-3.5 border shrink-0 flex items-center justify-center transition-colors ${
                        ms.completed
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border hover:border-foreground'
                      }`}
                    >
                      {ms.completed && (
                        <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2 6l3 3 5-5" />
                        </svg>
                      )}
                    </button>
                    <div className="flex-1">
                      <span className={`text-sm ${ms.completed ? 'line-through text-muted' : ''}`}>
                        {ms.description}
                      </span>
                      {ms.completedAt && (
                        <span className="text-[10px] text-muted ml-2">
                          {new Date(ms.completedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* History timeline */}
          {activeGoal.history.length > 0 && (
            <div className="mb-6">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted mb-3">
                历史
              </h3>
              <div className="space-y-0">
                {activeGoal.history.map((ev: GoalEvent, i: number) => (
                  <div
                    key={i}
                    className="flex gap-3 border-b border-border last:border-b-0 py-2"
                  >
                    <span className="text-[10px] text-muted tabular-nums shrink-0 mt-0.5 w-20">
                      {new Date(ev.timestamp).toLocaleDateString()}
                    </span>
                    <div>
                      <span className="text-[10px] uppercase tracking-widest bg-foreground/10 text-foreground px-1.5 py-0.5 inline-block mb-0.5">
                        {ev.type}
                      </span>
                      <p className="text-xs text-muted">{ev.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-border">
            <button
              onClick={handleSyncProgress}
              disabled={syncing}
              className="text-xs uppercase tracking-widest border border-foreground px-4 py-2 hover:bg-foreground hover:text-background transition-colors rounded-none shadow-none disabled:opacity-40"
            >
              {syncing ? '同步中...' : '同步进度'}
            </button>
            <button
              onClick={handlePauseResume}
              className="text-xs uppercase tracking-widest border border-border px-4 py-2 hover:border-foreground transition-colors rounded-none shadow-none text-muted"
            >
              {activeGoal.status === 'paused' ? '恢复' : '暂停'}
            </button>
            <button
              onClick={handleComplete}
              className="text-xs uppercase tracking-widest border border-border px-4 py-2 hover:border-foreground transition-colors rounded-none shadow-none text-muted"
            >
              清除
            </button>
            <button
              onClick={handleDelete}
              className="text-xs uppercase tracking-widest border border-border px-4 py-2 hover:border-red-500 hover:text-red-500 transition-colors rounded-none shadow-none text-muted"
            >
              删除
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
