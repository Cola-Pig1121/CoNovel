'use client';

import { api } from '@/lib/api';

import { useState } from 'react';

export function BookForeshadowing({ bookId, book }: { bookId: string; book: any }) {
  const [items, setItems] = useState(book.foreshadowing || []);
  const [showAdd, setShowAdd] = useState(false);
  const [newFs, setNewFs] = useState({ description: '', type: 'plot', urgency: 'medium', plantedIn: book.currentChapter || 1, maxDelay: 20 });

  const statusColors: Record<string, string> = {
    planted: 'bg-blue-100 text-blue-800',
    hinted: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
  };
  const typeLabels: Record<string, string> = { plot: '情节', character: '角色', world: '世界', emotion: '情感' };
  const urgencyLabels: Record<string, string> = { low: '低', medium: '中', high: '高', critical: '紧急' };

  const handleAdd = async () => {
    try {
      const item = await api.post(`/api/books/${bookId}/foreshadowing`, newFs);
      setItems([...items, item]);
      setShowAdd(false);
      setNewFs({ description: '', type: 'plot', urgency: 'medium', plantedIn: book.currentChapter || 1, maxDelay: 20 });
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="label-editorial text-muted">伏笔列表 ({items.length})</p>
        <button onClick={() => setShowAdd(true)} className="btn-editorial-primary text-xs">植入伏笔</button>
      </div>

      {items.length === 0 ? (
        <div className="card-editorial text-center py-12"><p className="text-muted">暂无伏笔</p></div>
      ) : (
        <div className="space-y-3">
          {items.map((fs: any) => (
            <div key={fs.id} className="card-editorial flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm">{fs.description}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs text-muted">第{fs.plantedIn}章植入</span>
                  <span className="text-xs text-muted">·</span>
                  <span className="text-xs text-muted">{typeLabels[fs.type] || fs.type}</span>
                  <span className="text-xs text-muted">·</span>
                  <span className="text-xs text-muted">紧迫度: {urgencyLabels[fs.urgency] || fs.urgency}</span>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs ${statusColors[fs.status] || 'bg-muted/20'}`}>{fs.status}</span>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border w-96 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-lg">植入伏笔</h3>
              <button onClick={() => setShowAdd(false)} className="text-muted hover:text-foreground">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label-editorial block mb-2">伏笔描述</label>
                <textarea value={newFs.description} onChange={e => setNewFs({ ...newFs, description: e.target.value })} className="input-editorial" rows={3} placeholder="描述这个伏笔的内容..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-editorial block mb-2">类型</label>
                  <select value={newFs.type} onChange={e => setNewFs({ ...newFs, type: e.target.value })} className="input-editorial">
                    {Object.entries(typeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-editorial block mb-2">紧迫度</label>
                  <select value={newFs.urgency} onChange={e => setNewFs({ ...newFs, urgency: e.target.value })} className="input-editorial">
                    {Object.entries(urgencyLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-editorial block mb-2">植入章节</label>
                  <input type="number" value={newFs.plantedIn} onChange={e => setNewFs({ ...newFs, plantedIn: Number(e.target.value) })} className="input-editorial" />
                </div>
                <div>
                  <label className="label-editorial block mb-2">最长延迟章节</label>
                  <input type="number" value={newFs.maxDelay} onChange={e => setNewFs({ ...newFs, maxDelay: Number(e.target.value) })} className="input-editorial" />
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-6 pt-4 border-t border-border">
              <button onClick={() => setShowAdd(false)} className="btn-editorial flex-1">取消</button>
              <button onClick={handleAdd} className="btn-editorial-primary flex-1" disabled={!newFs.description}>植入</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
