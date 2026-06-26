'use client';

// Style Evolution - 风格进化图表组件
// 显示写作风格的进化轨迹

interface StyleMetric {
  name: string;
  nameEn: string;
  current: number;
  previous: number;
  target?: number;
  unit: string;
}

export function StyleEvolution() {
  // Placeholder data - will be fetched from API
  const metrics: StyleMetric[] = [
    { name: '平均句长', nameEn: 'Avg Sentence Length', current: 28.5, previous: 25.2, unit: '字' },
    { name: '对话比例', nameEn: 'Dialogue Ratio', current: 0.42, previous: 0.38, unit: '' },
    { name: '段落长度', nameEn: 'Paragraph Length', current: 156, previous: 142, unit: '字' },
    { name: '可读性分数', nameEn: 'Readability', current: 78, previous: 75, unit: '分' },
    { name: 'AI痕迹分数', nameEn: 'AI Pattern Score', current: 0.12, previous: 0.18, unit: '' },
    { name: '情感强度', nameEn: 'Emotion Intensity', current: 7.2, previous: 6.8, unit: '/10' },
  ];

  const recentExperiments = [
    { chapter: 42, technique: '增加短句比例', impact: 0.3 },
    { chapter: 43, technique: '减少叙述性解释', impact: 0.5 },
    { chapter: 44, technique: '强化对话动作描写', impact: 0.2 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Metrics Panel */}
      <div className="card-editorial">
        <h3 className="font-serif text-lg mb-6">风格指标</h3>
        <div className="space-y-4">
          {metrics.map((metric) => (
            <MetricRow key={metric.nameEn} metric={metric} />
          ))}
        </div>
      </div>

      {/* Experiments Panel */}
      <div className="card-editorial">
        <h3 className="font-serif text-lg mb-6">成功实验</h3>
        <div className="space-y-4">
          {recentExperiments.map((exp) => (
            <div key={exp.chapter} className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div>
                <p className="font-sans text-sm">{exp.technique}</p>
                <p className="font-mono text-xs text-muted mt-1">第{exp.chapter}章</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm text-green-600">
                  +{(exp.impact * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-muted mt-1">提升</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs text-muted">
            风格锚点已校准于第40章后
          </p>
          <p className="font-mono text-xs text-muted mt-1">
            Last calibrated: 2 hours ago
          </p>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ metric }: { metric: StyleMetric }) {
  const change = metric.current - metric.previous;
  const changePercent = metric.previous !== 0
    ? ((change / metric.previous) * 100).toFixed(1)
    : '0';

  const isPositive = metric.nameEn === 'AI Pattern Score'
    ? change < 0  // For AI score, lower is better
    : change > 0;

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1">
        <p className="font-sans text-sm">{metric.name}</p>
        <p className="font-mono text-xs text-muted">{metric.nameEn}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-mono text-sm">
            {metric.current}{metric.unit}
          </p>
          <p className="font-mono text-xs text-muted">
            {metric.previous}{metric.unit}
          </p>
        </div>
        <div className={`font-mono text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {change > 0 ? '+' : ''}{changePercent}%
        </div>
      </div>
    </div>
  );
}
