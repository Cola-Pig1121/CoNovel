import { useAgentStore } from '@/stores/agentStore'
import { useAgentConfigStore } from '@/stores/agentConfigStore'

export default function AgentStatusBar() {
  const pipelineRunning = useAgentStore((s) => s.pipelineRunning)
  const agents = useAgentConfigStore((s) => s.agents)
  const enabledCount = agents.filter((a) => a.enabled).length

  return (
    <div className="flex items-center gap-4 text-[10px] font-mono text-muted uppercase tracking-widest">
      <span className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            pipelineRunning ? 'bg-foreground animate-pulse' : 'bg-foreground/30'
          }`}
        />
        AGENTS: {enabledCount} ACTIVE
      </span>
      {pipelineRunning && (
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
          PIPELINE RUNNING
        </span>
      )}
    </div>
  )
}
