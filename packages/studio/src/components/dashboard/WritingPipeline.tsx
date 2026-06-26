'use client';

// Writing Pipeline - 写作流水线状态组件
// 显示当前章节的流水线进度

interface PipelineStage {
  id: string;
  name: string;
  nameZh: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  agent?: string;
  duration?: string;
}

export function WritingPipeline() {
  // Placeholder data - will be fetched from API
  const stages: PipelineStage[] = [
    { id: 'context', name: 'Context Assembly', nameZh: '上下文组装', status: 'completed', duration: '2.3s' },
    { id: 'character-intel', name: 'Character Intelligence', nameZh: '角色推理', status: 'completed', agent: '角色智能体', duration: '8.5s' },
    { id: 'writing', name: 'Writing', nameZh: '正文创作', status: 'active', agent: '写作特工', duration: '进行中...' },
    { id: 'observation', name: 'Observation', nameZh: '事件记录', status: 'pending' },
    { id: 'fact-check', name: 'Fact Check', nameZh: '事实核查', status: 'pending' },
    { id: 'continuity', name: 'Continuity', nameZh: '连续性检查', status: 'pending' },
    { id: 'pacing', name: 'Pacing', nameZh: '节奏检查', status: 'pending' },
    { id: 'review', name: 'Review', nameZh: '综合审阅', status: 'pending' },
    { id: 'editing', name: 'Editing', nameZh: '文字润色', status: 'pending' },
    { id: 'de-ai', name: 'De-AI', nameZh: '去AI味', status: 'pending' },
    { id: 'reflector', name: 'Reflector', nameZh: '质量反思', status: 'pending' },
    { id: 'sync', name: 'State Sync', nameZh: '状态同步', status: 'pending' },
  ];

  return (
    <div className="card-editorial">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-serif text-lg">当前创作进度</h3>
          <p className="text-muted text-sm mt-1">第 45 章 - 风云再起</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm">进度</p>
          <p className="font-serif text-2xl">25%</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-border mb-8">
        <div
          className="h-1 bg-foreground transition-all duration-500"
          style={{ width: '25%' }}
        />
      </div>

      {/* Pipeline Stages */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {stages.map((stage, index) => (
          <StageCard key={stage.id} stage={stage} index={index + 1} />
        ))}
      </div>
    </div>
  );
}

function StageCard({ stage, index }: { stage: PipelineStage; index: number }) {
  const statusStyles = {
    pending: 'border-border text-muted',
    active: 'border-foreground bg-foreground/5',
    completed: 'border-foreground bg-foreground text-background',
    error: 'border-red-500 bg-red-500 text-background',
  };

  return (
    <div className={`border p-3 transition-colors ${statusStyles[stage.status]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono text-xs opacity-50">{String(index).padStart(2, '0')}</span>
        <span className="font-sans text-xs">{stage.nameZh}</span>
      </div>
      {stage.agent && (
        <p className="font-mono text-xs opacity-70">{stage.agent}</p>
      )}
      {stage.duration && (
        <p className="font-mono text-xs mt-1 opacity-70">{stage.duration}</p>
      )}
    </div>
  );
}
