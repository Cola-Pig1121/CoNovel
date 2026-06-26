'use client';

import { useState } from 'react';
import Link from 'next/link';

interface AgentStatus {
  role: string;
  name: string;
  nameZh: string;
  category: string;
  status: 'active' | 'idle' | 'error';
  avgScore: number;
  totalTasks: number;
  trend: 'improving' | 'stable' | 'declining';
  lastActive: string;
  model: string;
}

export default function AgentsPage() {
  const [agents] = useState<AgentStatus[]>([
    { role: 'architect', name: 'Architect', nameZh: '故事架构师', category: '核心创作', status: 'idle', avgScore: 8.2, totalTasks: 150, trend: 'improving', lastActive: '5分钟前', model: 'Opus 4' },
    { role: 'writer', name: 'Writer', nameZh: '写作特工', category: '核心创作', status: 'active', avgScore: 7.8, totalTasks: 150, trend: 'stable', lastActive: '当前', model: 'Sonnet 4' },
    { role: 'character-intelligence', name: 'Character Intelligence', nameZh: '角色智能体', category: '核心创作', status: 'active', avgScore: 8.5, totalTasks: 150, trend: 'improving', lastActive: '当前', model: 'Opus 4' },
    { role: 'reviewer', name: 'Reviewer', nameZh: '审阅官', category: '质量控制', status: 'idle', avgScore: 7.9, totalTasks: 150, trend: 'stable', lastActive: '10分钟前', model: 'Sonnet 4' },
    { role: 'editor', name: 'Editor', nameZh: '编辑', category: '质量控制', status: 'idle', avgScore: 8.0, totalTasks: 150, trend: 'improving', lastActive: '10分钟前', model: 'Sonnet 4' },
    { role: 'de-ai-editor', name: 'De-AI Editor', nameZh: '去AI味编辑', category: '质量控制', status: 'idle', avgScore: 7.6, totalTasks: 150, trend: 'stable', lastActive: '15分钟前', model: 'Sonnet 4' },
    { role: 'fact-checker', name: 'Fact Checker', nameZh: '事实核查官', category: '质量控制', status: 'idle', avgScore: 8.3, totalTasks: 150, trend: 'stable', lastActive: '15分钟前', model: 'Haiku 4' },
    { role: 'continuity', name: 'Continuity', nameZh: '连续性检查官', category: '质量控制', status: 'idle', avgScore: 8.1, totalTasks: 150, trend: 'stable', lastActive: '15分钟前', model: 'Haiku 4' },
    { role: 'pacing-controller', name: 'Pacing Controller', nameZh: '节奏控制官', category: '质量控制', status: 'idle', avgScore: 7.5, totalTasks: 150, trend: 'declining', lastActive: '15分钟前', model: 'Sonnet 4' },
    { role: 'style-analyzer', name: 'Style Analyzer', nameZh: '风格分析师', category: '辅助', status: 'idle', avgScore: 7.8, totalTasks: 150, trend: 'improving', lastActive: '20分钟前', model: 'Sonnet 4' },
    { role: 'observer', name: 'Observer', nameZh: '观察者', category: '辅助', status: 'active', avgScore: 7.2, totalTasks: 150, trend: 'stable', lastActive: '当前', model: 'Haiku 4' },
    { role: 'character-designer', name: 'Character Designer', nameZh: '角色设计师', category: '辅助', status: 'idle', avgScore: 8.4, totalTasks: 150, trend: 'stable', lastActive: '20分钟前', model: 'Sonnet 4' },
    { role: 'foreshadowing', name: 'Foreshadowing', nameZh: '伏笔管理官', category: '辅助', status: 'idle', avgScore: 8.2, totalTasks: 150, trend: 'improving', lastActive: '25分钟前', model: 'Haiku 4' },
    { role: 'radar', name: 'Radar', nameZh: '趋势雷达', category: '辅助', status: 'idle', avgScore: 7.0, totalTasks: 150, trend: 'stable', lastActive: '30分钟前', model: 'Haiku 4' },
    { role: 'reflector', name: 'Reflector', nameZh: '反思官', category: '辅助', status: 'idle', avgScore: 7.9, totalTasks: 150, trend: 'improving', lastActive: '30分钟前', model: 'Sonnet 4' },
  ]);

  const categories = [...new Set(agents.map(a => a.category))];
  const statusColors = { active: 'bg-green-500', idle: 'bg-muted', error: 'bg-red-500' };
  const trendIcons = { improving: '↑', stable: '→', declining: '↓' };
  const trendColors = { improving: 'text-green-600', stable: 'text-muted', declining: 'text-red-600' };

  return (
    <div>
      <header className="mb-8 px-12 pt-6">
        <h2 className="font-serif text-2xl tracking-tight">Agent 监控</h2>
        <p className="text-muted text-sm mt-1">监控所有Agent的状态和性能</p>
      </header>

      <div className="px-12 pb-12">
        <div className="grid grid-cols-4 gap-6 mb-12">
          <div className="card-editorial"><p className="label-editorial text-muted">总Agent数</p><p className="font-serif text-3xl mt-2">{agents.length}</p></div>
          <div className="card-editorial"><p className="label-editorial text-muted">活跃中</p><p className="font-serif text-3xl mt-2">{agents.filter(a => a.status === 'active').length}</p></div>
          <div className="card-editorial"><p className="label-editorial text-muted">平均质量分</p><p className="font-serif text-3xl mt-2">{(agents.reduce((a, b) => a + b.avgScore, 0) / agents.length).toFixed(1)}</p></div>
          <div className="card-editorial"><p className="label-editorial text-muted">总任务数</p><p className="font-serif text-3xl mt-2">{agents.reduce((a, b) => a + b.totalTasks, 0).toLocaleString()}</p></div>
        </div>

        {categories.map(category => (
          <section key={category} className="mb-12">
            <h3 className="label-editorial text-muted mb-4">{category}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {agents.filter(a => a.category === category).map(agent => (
                <Link key={agent.role} href={`/agents/${agent.role}`} className="card-editorial block hover:border-foreground">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-sans text-sm font-medium">{agent.nameZh}</p>
                      <p className="font-mono text-xs text-muted">{agent.name}</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${statusColors[agent.status]}`} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between"><span className="text-xs text-muted">质量分</span><span className="font-mono text-sm">{agent.avgScore.toFixed(1)}</span></div>
                    <div className="flex items-center justify-between"><span className="text-xs text-muted">任务数</span><span className="font-mono text-sm">{agent.totalTasks}</span></div>
                    <div className="flex items-center justify-between"><span className="text-xs text-muted">趋势</span><span className={`font-mono text-sm ${trendColors[agent.trend]}`}>{trendIcons[agent.trend]} {agent.trend === 'improving' ? '上升' : agent.trend === 'declining' ? '下降' : '稳定'}</span></div>
                    <div className="flex items-center justify-between"><span className="text-xs text-muted">模型</span><span className="font-mono text-xs text-muted truncate ml-2">{agent.model}</span></div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
