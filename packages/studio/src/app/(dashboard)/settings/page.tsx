'use client';

import { useState } from 'react';
import { AgentModelConfig } from '@/components/settings/AgentModelConfig';
import { ProviderManager } from '@/components/settings/ProviderManager';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'providers' | 'agents'>('providers');

  return (
    <div>
      <header className="mb-8 px-12 pt-6">
        <h2 className="font-serif text-2xl tracking-tight">系统设置</h2>
        <p className="text-muted text-sm mt-1">配置模型供应商和Agent模型映射</p>
      </header>

      <div className="px-12 pb-12">
        {/* Tab Navigation */}
        <div className="flex gap-1 mb-8 border-b border-border">
          <button onClick={() => setActiveTab('providers')} className={`px-6 py-3 text-sm transition-colors ${activeTab === 'providers' ? 'border-b-2 border-foreground' : 'text-muted hover:text-foreground'}`}>
            <span className="font-sans">模型供应商</span>
            <span className="block text-xs text-muted font-mono">Providers</span>
          </button>
          <button onClick={() => setActiveTab('agents')} className={`px-6 py-3 text-sm transition-colors ${activeTab === 'agents' ? 'border-b-2 border-foreground' : 'text-muted hover:text-foreground'}`}>
            <span className="font-sans">Agent 模型配置</span>
            <span className="block text-xs text-muted font-mono">Agent Config</span>
          </button>
        </div>

        {activeTab === 'providers' && <ProviderManager />}
        {activeTab === 'agents' && <AgentModelConfig />}
      </div>
    </div>
  );
}
