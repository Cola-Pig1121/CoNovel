'use client';

import { api } from '@/lib/api';

import { useState, useEffect } from 'react';

interface HooksData {
  summary: { total: number; planted: number; hinted: number; overdue: number; resolved: number };
  hooks: {
    planted: any[];
    hinted: any[];
    overdue: any[];
    resolved: any[];
  };
  alerts: {
    burstDetected: boolean;
    burstCount: number;
    noAdvanceCount: number;
    overdueCount: number;
  };
  recommendations: string[];
}

export function BookHooks({ bookId }: { bookId: string }) {
  const [data, setData] = useState<HooksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'planted' | 'hinted' | 'overdue' | 'resolved'>('overview');

  useEffect(() => {
    api.get(`/api/books/${bookId}/hooks`).then(d => {
      setData(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [bookId]);

  if (loading) return <div className="text-muted text-sm">加载中...</div>;
  if (!data) return <div className="text-muted text-sm">加载失败</div>;

  const statusColors: Record<string, string> = {
    planted: 'bg-blue-100 text-blue-800',
    hinted: 'bg-yellow-100 text-yellow-800',
    overdue: 'bg-red-100 text-red-800',
    resolved: 'bg-green-100 text-green-800',
  };
  const statusLabels: Record<string, string> = { planted: '已植入', hinted: '已推进', overdue: '逾期', resolved: '已回收' };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h3 className="font-serif text-lg">伏笔治理</h3>
        <p className="text-xs text-muted mt-1">追踪伏笔健康状态，检测逾期、爆发、无推进</p>
      </div>

      {/* Alerts */}
      {(data.alerts.overdueCount > 0 || data.alerts.burstDetected || data.alerts.noAdvanceCount > 0) && (
        <div className="border border-red-300 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800 mb-2">⚠ 警告</p>
          <div className="space-y-1 text-sm text-red-700">
            {data.alerts.overdueCount > 0 && <p>• {data.alerts.overdueCount} 个伏笔已逾期未收</p>}
            {data.alerts.burstDetected && <p>• 最近3章植入了 {data.alerts.burstCount} 个伏笔，密度过高</p>}
            {data.alerts.noAdvanceCount > 0 && <p>• {data.alerts.noAdvanceCount} 个伏笔超过5章未推进</p>}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: '总计', value: data.summary.total, color: 'text-foreground' },
          { label: '已植入', value: data.summary.planted, color: 'text-blue-600' },
          { label: '已推进', value: data.summary.hinted, color: 'text-yellow-600' },
          { label: '逾期', value: data.summary.overdue, color: 'text-red-600' },
          { label: '已回收', value: data.summary.resolved, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="card-editorial text-center">
            <p className={`font-serif text-2xl ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['overview', 'planted', 'hinted', 'overdue', 'resolved'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs transition-colors ${activeTab === tab ? 'border-b-2 border-foreground' : 'text-muted hover:text-foreground'}`}>
            {tab === 'overview' ? '总览' : statusLabels[tab]}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' ? (
        <div className="card-editorial">
          <p className="label-editorial text-muted mb-3">建议</p>
          {data.recommendations.length === 0 ? (
            <p className="text-sm text-muted">伏笔状态良好</p>
          ) : (
            <div className="space-y-2">
              {data.recommendations.map((rec, i) => (
                <p key={i} className="text-sm">• {rec}</p>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {data.hooks[activeTab]?.length === 0 ? (
            <div className="card-editorial text-center py-8"><p className="text-muted">暂无数据</p></div>
          ) : (
            data.hooks[activeTab]?.map((h: any) => (
              <div key={h.id} className="card-editorial flex items-center gap-4">
                <span className={`px-2 py-0.5 text-xs ${statusColors[h.status] || ''}`}>{statusLabels[h.status]}</span>
                <div className="flex-1">
                  <p className="text-sm">{h.description}</p>
                  <div className="flex gap-3 mt-1 text-xs text-muted">
                    <span>第{h.plantedIn}章植入</span>
                    <span>·</span>
                    <span>年龄 {h.age} 章</span>
                    <span>·</span>
                    <span>紧迫度: {h.urgency}</span>
                    {h.health && <span>· 状态: {h.health === 'healthy' ? '健康' : h.health === 'warning' ? '注意' : '逾期'}</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
