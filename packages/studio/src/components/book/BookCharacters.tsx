'use client';

import { useState, useEffect } from 'react';

interface Character {
  id: string;
  name: string;
  role: string;
  personality: string[];
  background: string;
  goals: string[];
  relationships: Record<string, string>;
  arcStage?: string;
  lastAppearance?: number;
}

export function BookCharacters({ bookId, book }: { bookId: string; book: any }) {
  const [characters, setCharacters] = useState<Character[]>(book.characters || []);
  const [showAdd, setShowAdd] = useState(false);
  const [view, setView] = useState<'cards' | 'graph'>('cards');
  const [newChar, setNewChar] = useState({ name: '', role: 'supporting', personality: '', background: '', goals: '' });

  const roleLabels: Record<string, string> = { protagonist: '主角', antagonist: '反派', supporting: '配角', minor: '路人' };

  const handleAdd = async () => {
    const res = await fetch(`/api/books/${bookId}/characters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newChar,
        personality: newChar.personality.split(/[,，、]/).map(s => s.trim()).filter(Boolean),
        goals: newChar.goals.split(/[,，、]/).map(s => s.trim()).filter(Boolean),
        relationships: {},
      }),
    });
    if (res.ok) {
      const char = await res.json();
      setCharacters([...characters, char]);
      setShowAdd(false);
      setNewChar({ name: '', role: 'supporting', personality: '', background: '', goals: '' });
    }
  };

  const handleDelete = async (cid: string) => {
    await fetch(`/api/books/${bookId}/characters/${cid}`, { method: 'DELETE' });
    setCharacters(characters.filter(c => c.id !== cid));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="label-editorial text-muted">角色列表 ({characters.length})</p>
        <div className="flex gap-2">
          <button onClick={() => setView(view === 'cards' ? 'graph' : 'cards')} className="btn-editorial text-xs">{view === 'cards' ? '关系图谱' : '卡片视图'}</button>
          <button onClick={() => setShowAdd(true)} className="btn-editorial-primary text-xs">添加角色</button>
        </div>
      </div>

      {view === 'cards' ? (
        characters.length === 0 ? (
          <div className="card-editorial text-center py-12"><p className="text-muted">暂无角色</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {characters.map(char => (
              <div key={char.id} className="card-editorial">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-serif text-lg">{char.name}</p>
                    <span className="text-xs text-muted">{roleLabels[char.role] || char.role}</span>
                  </div>
                  <button onClick={() => handleDelete(char.id)} className="text-xs text-muted hover:text-red-600">删除</button>
                </div>
                {char.personality?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {char.personality.map((p, i) => <span key={i} className="px-2 py-0.5 text-xs border border-border">{p}</span>)}
                  </div>
                )}
                {char.background && <p className="text-xs text-muted mb-2 line-clamp-2">{char.background}</p>}
                {char.goals?.length > 0 && (
                  <div className="text-xs text-muted">目标: {char.goals.join('、')}</div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="card-editorial py-12 text-center">
          <p className="text-muted mb-2">关系图谱</p>
          <p className="text-xs text-muted">需要安装 react-force-graph-2d 后启用</p>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border w-[32rem] p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-lg">添加角色</h3>
              <button onClick={() => setShowAdd(false)} className="text-muted hover:text-foreground">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label-editorial block mb-2">姓名</label>
                <input type="text" value={newChar.name} onChange={e => setNewChar({ ...newChar, name: e.target.value })} className="input-editorial" placeholder="角色姓名" />
              </div>
              <div>
                <label className="label-editorial block mb-2">角色类型</label>
                <select value={newChar.role} onChange={e => setNewChar({ ...newChar, role: e.target.value })} className="input-editorial">
                  {Object.entries(roleLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="label-editorial block mb-2">性格特征（逗号分隔）</label>
                <input type="text" value={newChar.personality} onChange={e => setNewChar({ ...newChar, personality: e.target.value })} className="input-editorial" placeholder="坚韧、隐忍、重情重义" />
              </div>
              <div>
                <label className="label-editorial block mb-2">背景故事</label>
                <textarea value={newChar.background} onChange={e => setNewChar({ ...newChar, background: e.target.value })} className="input-editorial" rows={3} placeholder="角色的背景经历..." />
              </div>
              <div>
                <label className="label-editorial block mb-2">目标（逗号分隔）</label>
                <input type="text" value={newChar.goals} onChange={e => setNewChar({ ...newChar, goals: e.target.value })} className="input-editorial" placeholder="复仇、变强、查明真相" />
              </div>
            </div>
            <div className="flex gap-4 mt-6 pt-4 border-t border-border">
              <button onClick={() => setShowAdd(false)} className="btn-editorial flex-1">取消</button>
              <button onClick={handleAdd} className="btn-editorial-primary flex-1" disabled={!newChar.name}>添加</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
