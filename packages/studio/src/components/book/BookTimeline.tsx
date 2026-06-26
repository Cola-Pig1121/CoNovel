'use client';

import { useState } from 'react';

export function BookTimeline({ bookId, book }: { bookId: string; book: any }) {
  const [events, setEvents] = useState(book.timeline || []);
  const [showAdd, setShowAdd] = useState(false);
  const [newEvent, setNewEvent] = useState({ description: '', chapterNumber: book.currentChapter || 1, location: '', significance: 'moderate', characters: '' });

  const sigColors: Record<string, string> = { minor: 'bg-muted/20', moderate: 'bg-blue-100 text-blue-800', major: 'bg-yellow-100 text-yellow-800', critical: 'bg-red-100 text-red-800' };
  const sigLabels: Record<string, string> = { minor: '次要', moderate: '一般', major: '重要', critical: '关键' };

  const handleAdd = async () => {
    const res = await fetch(`/api/books/${bookId}/timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newEvent,
        characters: newEvent.characters.split(/[,，、]/).map(s => s.trim()).filter(Boolean),
      }),
    });
    if (res.ok) {
      const event = await res.json();
      setEvents([...events, event].sort((a: any, b: any) => a.chapterNumber - b.chapterNumber));
      setShowAdd(false);
      setNewEvent({ description: '', chapterNumber: book.currentChapter || 1, location: '', significance: 'moderate', characters: '' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="label-editorial text-muted">时间线 ({events.length})</p>
        <button onClick={() => setShowAdd(true)} className="btn-editorial-primary text-xs">添加事件</button>
      </div>

      {events.length === 0 ? (
        <div className="card-editorial text-center py-12"><p className="text-muted">暂无事件</p></div>
      ) : (
        <div className="relative pl-8 border-l-2 border-border space-y-6">
          {events.map((ev: any) => (
            <div key={ev.id} className="relative">
              <div className="absolute -left-[1.3rem] w-3 h-3 bg-foreground rounded-full" />
              <div className="card-editorial">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-muted">第{ev.chapterNumber}章</span>
                  <span className={`px-2 py-0.5 text-xs ${sigColors[ev.significance] || ''}`}>{sigLabels[ev.significance] || ev.significance}</span>
                </div>
                <p className="text-sm">{ev.description}</p>
                {ev.location && <p className="text-xs text-muted mt-1">📍 {ev.location}</p>}
                {ev.characters?.length > 0 && <p className="text-xs text-muted mt-1">👥 {ev.characters.join('、')}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border w-96 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-lg">添加事件</h3>
              <button onClick={() => setShowAdd(false)} className="text-muted hover:text-foreground">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label-editorial block mb-2">事件描述</label>
                <textarea value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} className="input-editorial" rows={3} placeholder="发生了什么..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-editorial block mb-2">章节</label>
                  <input type="number" value={newEvent.chapterNumber} onChange={e => setNewEvent({ ...newEvent, chapterNumber: Number(e.target.value) })} className="input-editorial" />
                </div>
                <div>
                  <label className="label-editorial block mb-2">重要性</label>
                  <select value={newEvent.significance} onChange={e => setNewEvent({ ...newEvent, significance: e.target.value })} className="input-editorial">
                    {Object.entries(sigLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label-editorial block mb-2">地点</label>
                <input type="text" value={newEvent.location} onChange={e => setNewEvent({ ...newEvent, location: e.target.value })} className="input-editorial" placeholder="事件发生地点" />
              </div>
              <div>
                <label className="label-editorial block mb-2">参与角色（逗号分隔）</label>
                <input type="text" value={newEvent.characters} onChange={e => setNewEvent({ ...newEvent, characters: e.target.value })} className="input-editorial" placeholder="角色名1、角色名2" />
              </div>
            </div>
            <div className="flex gap-4 mt-6 pt-4 border-t border-border">
              <button onClick={() => setShowAdd(false)} className="btn-editorial flex-1">取消</button>
              <button onClick={handleAdd} className="btn-editorial-primary flex-1" disabled={!newEvent.description}>添加</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
