import { create } from 'zustand'
import type { PipelineState } from '@/lib/types'
import { pipelineApi } from '@/lib/api'

// Agent 配置现在由 agentConfigStore 管理（读写后端 JSON 文件）
// 这个 store 只负责 Pipeline 状态

interface AgentStore {
  pipelineState: PipelineState | null
  pipelineRunning: boolean

  startPipeline: (bookId: string, chapterNum: number) => Promise<void>
  fetchPipelineStatus: (bookId: string) => Promise<void>
  cancelPipeline: (bookId: string) => Promise<void>
}

export const useAgentStore = create<AgentStore>((set) => ({
  pipelineState: null,
  pipelineRunning: false,

  startPipeline: async (bookId, chapterNum) => {
    set({ pipelineRunning: true })
    try {
      const state = await pipelineApi.start(bookId, chapterNum)
      set({ pipelineState: state })
    } catch {
      set({ pipelineRunning: false })
    }
  },

  fetchPipelineStatus: async (bookId) => {
    try {
      const state = await pipelineApi.status(bookId)
      set({
        pipelineState: state,
        pipelineRunning: state.activeStage !== null,
      })
    } catch {
      // silent
    }
  },

  cancelPipeline: async (bookId) => {
    await pipelineApi.cancel(bookId)
    set({ pipelineRunning: false, pipelineState: null })
  },
}))
