'use client';

import { api } from '@/lib/api';

import { useState, useEffect } from 'react';

interface AgentStatus {
  role: string;
  name: string;
  nameZh: string;
  status: 'active' | 'idle' | 'error';
  avgScore: number;
  totalTasks: number;
  trend: 'improving' | 'stable' | 'declining';
  lastActive: string;
  model: string;
  enabled: boolean;
}

const AGENT_META: Record<string, { name: string; nameZh: string; category: string }> = {
  architect: { name: 'Architect', nameZh: '故事架构师', category: '核心创作' },
  writer: { name: 'Writer', nameZh: '写作特工', category: '核心创作' },
  'character-intelligence': { name: 'Character Intelligence', nameZh: '角色智能体', category: '核心创作' },
  reviewer: { name: 'Reviewer', nameZh: '审阅官', category: '质量控制' },
  editor: { name: 'Editor', nameZh: '编辑', category: '质量控制' },
  'de-ai-editor': { name: 'De-AI Editor', nameZh: '去AI味编辑', category: '质量控制' },
  'fact-checker': { name: 'Fact Checker', nameZh: '事实核查官', category: '质量控制' },
  continuity: { name: 'Continuity', nameZh: '连续性检查官', category: '质量控制' },
  'pacing-controller': { name: 'Pacing Controller', nameZh: '节奏控制官', category: '质量控制' },
  'style-analyzer': { name: 'Style Analyzer', nameZh: '风格分析师', category: '辅助' },
  observer: { name: 'Observer', nameZh: '观察者', category: '辅助' },
  'character-designer': { name: 'Character Designer', nameZh: '角色设计师', category: '辅助' },
  foreshadowing: { name: 'Foreshadowing', nameZh: '伏笔管理官', category: '辅助' },
  radar: { name: 'Radar', nameZh: '趋势雷达', category: '辅助' },
  reflector: { name: 'Reflector', nameZh: '反思官', category: '辅助' },
};

export function AgentMonitor() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch agent configs from API
    api.get('/api/config?type=agents')
      .then(data => {
        const configs = data.agents || [];
        const agentList: AgentStatus[] = configs.map((c: any) => {
          const meta = AGENT_META[c.role] || { name: c.name, nameZh: c.nameZh, category: '其他' };
          return {
            role: c.role,
            name: meta.name,
            nameZh: meta.nameZh,
            status: 'idle' as const,
            avgScore: 0,
            totalTasks: 0,
            trend: 'stable' as const,
            lastActive: '未使用',
            model: c.modelId || '未配置',
            enabled: c.enabled !== false,
          };
        });
        setAgents(agentList);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="card-editorial animate-pulse p-4">
            <div className="h-4 bg-muted/20 rounded w-24 mb-3" />
            <div className="h-3 bg-muted/20 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  const categories = [...new Set(agents.map(a => {
    const meta = AGENT_META[a.role];
    return meta?.category || '其他';
  }))];

  return (
    <div className="space-y-6">
      {categories.map(cat => (
        <div key={cat}>
          <p className="label-editorial text-muted mb-3">{cat}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {agents.filter(a => (AGENT_META[a.role]?.category || '其他') === cat).map(agent => (
              <AgentCard key={agent.role} agent={agent} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AgentCard({ agent }: { agent: AgentStatus }) {
  const statusColors: Record<string, string> = {
    active: 'bg-green-500',
    idle: agent.enabled ? 'bg-muted' : 'bg-muted/30',
    error: 'bg-red-500',
  };

  const trendIcons: Record<string, string> = {
    improving: '↑',
    stable: '→',
    declining: '↓',
  };

  const trendColors: Record<string, string> = {
    improving: 'text-green-600',
    stable: 'text-muted',
    declining: 'text-red-600',
  };

  return (
    <div className={`card-editorial p-4 ${!agent.enabled ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-sans text-sm font-medium">{agent.nameZh}</p>
          <p className="font-mono text-xs text-muted">{agent.name}</p>
        </div>
        <div className={`w-2 h-2 rounded-full ${statusColors[agent.status]}`} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">模型</span>
          <span className="font-mono text-xs text-muted truncate max-w-[120px]">{agent.model}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">状态</span>
          <span className={`text-xs ${agent.enabled ? 'text-foreground' : 'text-muted'}`}>
            {agent.enabled ? '已启用' : '已禁用'}
          </span>
        </div>
      </div>
    </div>
  );
}
