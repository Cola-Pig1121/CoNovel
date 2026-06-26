'use client';

import { useState } from 'react';

export default function EvolutionPage() {
  const [activeTab, setActiveTab] = useState<'performance' | 'style' | 'learning'>('performance');

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
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-6 py-3 text-sm transition-colors ${activeTab === tab.id ? 'border-b-2 border-foreground' : 'text-muted hover:text-foreground'}`}
            >
              <span className="font-sans">{tab.label}</span>
              <span className="block text-xs text-muted font-mono">{tab.labelEn}</span>
            </button>
          ))}
        </div>

        {activeTab === 'performance' && (
          <div className="card-editorial text-center py-16">
            <p className="text-muted mb-2">性能数据将在创作过程中自动记录</p>
            <p className="text-xs text-muted">每章审阅后会记录各Agent得分，追踪改进趋势。在书籍详情页的「写作」Tab发起创作后，数据会自动积累。</p>
          </div>
        )}

        {activeTab === 'style' && (
          <div className="card-editorial text-center py-16">
            <p className="text-muted mb-2">风格进化数据将在创作过程中自动生成</p>
            <p className="text-xs text-muted">每章完成后会提取风格指纹（句长、对话比例、词汇偏好等），逐步建立风格基准。</p>
          </div>
        )}

        {activeTab === 'learning' && (
          <div className="card-editorial text-center py-16">
            <p className="text-muted mb-2">学习记录将在Agent交互过程中积累</p>
            <p className="text-xs text-muted">系统会自动记录有效的写作模式、提示词优化和技术采用。</p>
          </div>
        )}
      </div>
    </div>
  );
}
