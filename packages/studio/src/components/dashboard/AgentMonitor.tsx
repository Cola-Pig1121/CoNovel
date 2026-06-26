'use client';

// Agent Monitor - Agent状态监控组件
// 显示15个Agent的状态和性能指标

interface AgentStatus {
  role: string;
  name: string;
  nameZh: string;
  status: 'active' | 'idle' | 'error';
  avgScore: number;
  trend: 'improving' | 'stable' | 'declining';
  lastActive: string;
}

export function AgentMonitor() {
  // Placeholder data - will be fetched from API
  const agents: AgentStatus[] = [
    { role: 'architect', name: 'Architect', nameZh: '故事架构师', status: 'idle', avgScore: 8.2, trend: 'improving', lastActive: '2分钟前' },
    { role: 'writer', name: 'Writer', nameZh: '写作特工', status: 'active', avgScore: 7.5, trend: 'stable', lastActive: '当前' },
    { role: 'character-intelligence', name: 'Character Intelligence', nameZh: '角色智能体', status: 'active', avgScore: 8.8, trend: 'improving', lastActive: '当前' },
    { role: 'reviewer', name: 'Reviewer', nameZh: '审阅官', status: 'idle', avgScore: 7.9, trend: 'stable', lastActive: '5分钟前' },
    { role: 'editor', name: 'Editor', nameZh: '编辑', status: 'idle', avgScore: 8.1, trend: 'improving', lastActive: '5分钟前' },
    { role: 'observer', name: 'Observer', nameZh: '观察者', status: 'active', avgScore: 7.0, trend: 'stable', lastActive: '当前' },
    { role: 'character-designer', name: 'Character Designer', nameZh: '角色设计师', status: 'idle', avgScore: 8.5, trend: 'stable', lastActive: '10分钟前' },
    { role: 'style-analyzer', name: 'Style Analyzer', nameZh: '风格分析师', status: 'idle', avgScore: 7.7, trend: 'improving', lastActive: '10分钟前' },
    { role: 'fact-checker', name: 'Fact Checker', nameZh: '事实核查官', status: 'idle', avgScore: 8.3, trend: 'stable', lastActive: '15分钟前' },
    { role: 'continuity', name: 'Continuity', nameZh: '连续性检查官', status: 'idle', avgScore: 8.0, trend: 'stable', lastActive: '15分钟前' },
    { role: 'pacing-controller', name: 'Pacing Controller', nameZh: '节奏控制官', status: 'idle', avgScore: 7.6, trend: 'declining', lastActive: '15分钟前' },
    { role: 'foreshadowing', name: 'Foreshadowing', nameZh: '伏笔管理官', status: 'idle', avgScore: 8.4, trend: 'improving', lastActive: '20分钟前' },
    { role: 'de-ai-editor', name: 'De-AI Editor', nameZh: '去AI味编辑', status: 'idle', avgScore: 7.8, trend: 'stable', lastActive: '20分钟前' },
    { role: 'radar', name: 'Radar', nameZh: '趋势雷达', status: 'idle', avgScore: 7.2, trend: 'stable', lastActive: '30分钟前' },
    { role: 'reflector', name: 'Reflector', nameZh: '反思官', status: 'idle', avgScore: 7.9, trend: 'improving', lastActive: '30分钟前' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {agents.map((agent) => (
        <AgentCard key={agent.role} agent={agent} />
      ))}
    </div>
  );
}

function AgentCard({ agent }: { agent: AgentStatus }) {
  const statusColors = {
    active: 'bg-green-500',
    idle: 'bg-muted',
    error: 'bg-red-500',
  };

  const trendIcons = {
    improving: '↑',
    stable: '→',
    declining: '↓',
  };

  const trendColors = {
    improving: 'text-green-600',
    stable: 'text-muted',
    declining: 'text-red-600',
  };

  return (
    <div className="card-editorial p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-sans text-sm font-medium">{agent.nameZh}</p>
          <p className="font-mono text-xs text-muted">{agent.name}</p>
        </div>
        <div className={`w-2 h-2 rounded-full ${statusColors[agent.status]}`} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">质量分</span>
          <span className="font-mono text-sm">{agent.avgScore.toFixed(1)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">趋势</span>
          <span className={`font-mono text-sm ${trendColors[agent.trend]}`}>
            {trendIcons[agent.trend]} {agent.trend === 'improving' ? '上升' : agent.trend === 'declining' ? '下降' : '稳定'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">最后活跃</span>
          <span className="font-mono text-xs text-muted">{agent.lastActive}</span>
        </div>
      </div>
    </div>
  );
}
