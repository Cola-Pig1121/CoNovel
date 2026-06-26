'use client';

interface PipelineStage {
  id: string;
  nameZh: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  agent?: string;
  duration?: string;
  score?: number;
}

export default function PipelinePage() {
  const stages: PipelineStage[] = [
    { id: 'context', nameZh: '上下文组装', status: 'completed', duration: '2.3s' },
    { id: 'character-intel', nameZh: '角色推理', status: 'completed', agent: '角色智能体', duration: '8.5s', score: 8.8 },
    { id: 'writing', nameZh: '正文创作', status: 'active', agent: '写作特工', duration: '进行中...' },
    { id: 'observation', nameZh: '事件记录', status: 'pending', agent: '观察者' },
    { id: 'fact-check', nameZh: '事实核查', status: 'pending', agent: '事实核查官' },
    { id: 'continuity', nameZh: '连续性检查', status: 'pending', agent: '连续性检查官' },
    { id: 'pacing', nameZh: '节奏检查', status: 'pending', agent: '节奏控制官' },
    { id: 'review', nameZh: '综合审阅', status: 'pending', agent: '审阅官' },
    { id: 'editing', nameZh: '文字润色', status: 'pending', agent: '编辑' },
    { id: 'de-ai', nameZh: '去AI味', status: 'pending', agent: '去AI味编辑' },
    { id: 'reflector', nameZh: '质量反思', status: 'pending', agent: '反思官' },
    { id: 'sync', nameZh: '状态同步', status: 'pending' },
  ];

  const qualityGate: Record<string, boolean> = {
    l1_memorySync: true, l2_factCheck: false, l3_continuity: false, l4_styleCalibration: false, l5_deAi: false,
  };

  const statusStyles = {
    pending: 'border-border text-muted',
    active: 'border-foreground bg-foreground/5',
    completed: 'border-foreground bg-foreground text-background',
    error: 'border-red-500 bg-red-500 text-background',
  };

  return (
    <div>
      <header className="mb-8 px-12 pt-6">
        <h2 className="font-serif text-2xl tracking-tight">写作流水线</h2>
        <p className="text-muted text-sm mt-1">监控当前章节的创作进度</p>
      </header>

      <div className="px-12 pb-12">
        <div className="card-editorial mb-8">
          <div className="flex items-center justify-between">
            <div><h3 className="font-serif text-lg">当前创作</h3><p className="text-muted text-sm mt-1">第 45 章 - 风云再起</p></div>
            <div className="text-right"><p className="font-mono text-sm">进度</p><p className="font-serif text-3xl">25%</p></div>
          </div>
          <div className="w-full h-1 bg-border mt-4"><div className="h-1 bg-foreground" style={{ width: '25%' }} /></div>
        </div>

        <div className="card-editorial mb-8">
          <h3 className="font-serif text-lg mb-6">流水线阶段</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {stages.map((stage, index) => (
              <div key={stage.id} className={`border p-4 transition-colors ${statusStyles[stage.status]}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-xs opacity-50">{String(index + 1).padStart(2, '0')}</span>
                  <span className="font-sans text-sm">{stage.nameZh}</span>
                </div>
                {stage.agent && <p className="font-mono text-xs opacity-70">{stage.agent}</p>}
                {stage.duration && <p className="font-mono text-xs mt-1 opacity-70">{stage.duration}</p>}
                {stage.score && <p className="font-mono text-xs mt-1 opacity-70">得分: {stage.score}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="card-editorial">
          <h3 className="font-serif text-lg mb-6">质量门禁</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { key: 'l1_memorySync', label: 'L1 记忆同步', labelEn: 'Memory Sync' },
              { key: 'l2_factCheck', label: 'L2 事实核查', labelEn: 'Fact Check' },
              { key: 'l3_continuity', label: 'L3 连续性', labelEn: 'Continuity' },
              { key: 'l4_styleCalibration', label: 'L4 风格校准', labelEn: 'Style' },
              { key: 'l5_deAi', label: 'L5 去AI味', labelEn: 'De-AI' },
            ].map(gate => (
              <div key={gate.key} className="border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-sans text-sm">{gate.label}</span>
                  <span className={`w-3 h-3 rounded-full ${qualityGate[gate.key] ? 'bg-green-500' : 'bg-muted'}`} />
                </div>
                <p className="font-mono text-xs text-muted">{gate.labelEn}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
