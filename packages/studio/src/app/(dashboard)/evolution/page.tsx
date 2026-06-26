'use client';

import { useState } from 'react';

interface EvolutionRecord {
  chapterNumber: number;
  agentRole: string;
  score: number;
  issues: string[];
  timestamp: string;
}

interface StyleMetric {
  name: string;
  nameEn: string;
  values: number[];
  labels: string[];
}

export default function EvolutionPage() {
  const [activeTab, setActiveTab] = useState<'performance' | 'style' | 'learning'>('performance');

  const performanceData: EvolutionRecord[] = [
    { chapterNumber: 45, agentRole: 'writer', score: 8.5, issues: [], timestamp: '2024-05-15' },
    { chapterNumber: 44, agentRole: 'writer', score: 7.8, issues: ['节奏略慢'], timestamp: '2024-05-14' },
    { chapterNumber: 43, agentRole: 'writer', score: 8.2, issues: ['对话不够自然'], timestamp: '2024-05-13' },
    { chapterNumber: 42, agentRole: 'writer', score: 7.5, issues: ['描写过于冗长'], timestamp: '2024-05-12' },
    { chapterNumber: 41, agentRole: 'writer', score: 8.0, issues: [], timestamp: '2024-05-11' },
  ];

  const styleMetrics: StyleMetric[] = [
    { name: '平均句长', nameEn: 'Avg Sentence Length', values: [25.2, 26.1, 27.3, 28.0, 28.5], labels: ['41章', '42章', '43章', '44章', '45章'] },
    { name: '对话比例', nameEn: 'Dialogue Ratio', values: [0.35, 0.38, 0.40, 0.41, 0.42], labels: ['41章', '42章', '43章', '44章', '45章'] },
    { name: 'AI痕迹分数', nameEn: 'AI Pattern Score', values: [0.22, 0.19, 0.16, 0.14, 0.12], labels: ['41章', '42章', '43章', '44章', '45章'] },
  ];

  const learningRecords = [
    { type: 'prompt_refinement', description: '增加对话自然度约束', trigger: '连续3章对话评分低于7', impact: 0.4, applied: true, date: '2024-05-10' },
    { type: 'technique_adoption', description: '引入三维编织法', trigger: '场景描写评分提升需求', impact: 0.3, applied: true, date: '2024-05-08' },
    { type: 'error_avoidance', description: '优化AI词汇检测', trigger: 'AI痕迹分数偏高', impact: 0.2, applied: true, date: '2024-05-05' },
  ];

  return (
    <div>
      <header className="mb-8 px-12 pt-6">
        <h2 className="font-serif text-2xl tracking-tight">进化追踪</h2>
        <p className="text-muted text-sm mt-1">追踪Agent性能和风格进化</p>
      </header>

      <div className="px-12 pb-12">
        <div className="flex gap-1 mb-8 border-b border-border">
          {[
            { id: 'performance', label: '性能追踪', labelEn: 'Performance' },
            { id: 'style', label: '风格进化', labelEn: 'Style Evolution' },
            { id: 'learning', label: '学习记录', labelEn: 'Learning' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={`px-6 py-3 text-sm transition-colors ${activeTab === tab.id ? 'border-b-2 border-foreground' : 'text-muted hover:text-foreground'}`}>
              <span className="font-sans">{tab.label}</span>
              <span className="block text-xs text-muted font-mono">{tab.labelEn}</span>
            </button>
          ))}
        </div>

        {activeTab === 'performance' && (
          <div className="space-y-8">
            <div className="card-editorial">
              <h3 className="font-serif text-lg mb-6">性能趋势</h3>
              <div className="h-64 border border-border p-4">
                <div className="flex items-end justify-between h-full">
                  {[...performanceData].reverse().map((record, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div className="w-12 bg-foreground" style={{ height: `${record.score * 10}%` }} />
                      <span className="text-xs text-muted mt-2">{record.chapterNumber}章</span>
                      <span className="font-mono text-xs">{record.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="card-editorial">
              <h3 className="font-serif text-lg mb-6">最近记录</h3>
              <div className="space-y-4">
                {performanceData.map((record, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <p className="font-sans text-sm">第{record.chapterNumber}章 - 写作特工</p>
                      <p className="text-xs text-muted mt-1">{record.issues.length > 0 ? record.issues.join(', ') : '无问题'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-lg">{record.score}</p>
                      <p className="text-xs text-muted">{record.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'style' && (
          <div className="space-y-8">
            {styleMetrics.map((metric, index) => (
              <div key={index} className="card-editorial">
                <div className="flex items-center justify-between mb-6">
                  <div><h3 className="font-serif text-lg">{metric.name}</h3><p className="font-mono text-xs text-muted">{metric.nameEn}</p></div>
                  <div className="text-right">
                    <p className="font-mono text-2xl">{metric.values[metric.values.length - 1]}</p>
                    <p className={`text-xs ${metric.nameEn === 'AI Pattern Score' ? 'text-green-600' : 'text-green-600'}`}>
                      {metric.nameEn === 'AI Pattern Score' ? '持续下降 ✓' : '持续上升 ↑'}
                    </p>
                  </div>
                </div>
                <div className="h-32 flex items-end justify-between">
                  {metric.values.map((value, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="w-16 bg-foreground" style={{ height: `${(value / Math.max(...metric.values)) * 100}%` }} />
                      <span className="text-xs text-muted mt-2">{metric.labels[i]}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'learning' && (
          <div className="space-y-8">
            <div className="card-editorial">
              <h3 className="font-serif text-lg mb-6">学习记录</h3>
              <div className="space-y-4">
                {learningRecords.map((record, index) => (
                  <div key={index} className="py-4 border-b border-border last:border-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 text-xs ${record.type === 'prompt_refinement' ? 'bg-blue-100 text-blue-800' : record.type === 'technique_adoption' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {record.type === 'prompt_refinement' ? '提示词优化' : record.type === 'technique_adoption' ? '技术采用' : '错误规避'}
                          </span>
                          {record.applied && <span className="px-2 py-1 text-xs bg-green-100 text-green-800">已应用</span>}
                        </div>
                        <p className="font-sans text-sm">{record.description}</p>
                        <p className="text-xs text-muted mt-1">触发原因: {record.trigger}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-lg text-green-600">+{(record.impact * 100).toFixed(0)}%</p>
                        <p className="text-xs text-muted">{record.date}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
