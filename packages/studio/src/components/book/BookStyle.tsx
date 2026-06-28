'use client';

import { api } from '@/lib/api';

import { useState, useEffect } from 'react';

export function BookStyle({ bookId }: { bookId: string }) {
  const [style, setStyle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newWord, setNewWord] = useState('');

  useEffect(() => {
    api.get(`/api/books/${bookId}/style`).then(data => {
      setStyle(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [bookId]);

  const saveStyle = async (updates: any) => {
    const updated = { ...style, ...updates };
    setStyle(updated);
    await api.put(`/api/books/${bookId}/style`, updated);
  };

  const addBannedWord = () => {
    if (!newWord || style.bannedWords.includes(newWord)) return;
    saveStyle({ bannedWords: [...style.bannedWords, newWord] });
    setNewWord('');
  };

  const removeBannedWord = (word: string) => {
    saveStyle({ bannedWords: style.bannedWords.filter((w: string) => w !== word) });
  };

  if (loading || !style) return <div className="text-muted text-sm">加载中...</div>;

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Narrative Settings */}
      <div className="card-editorial">
        <p className="label-editorial text-muted mb-4">叙事设定</p>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted block mb-1">叙事视角</label>
            <select value={style.narrativePerspective} onChange={e => saveStyle({ narrativePerspective: e.target.value })} className="input-editorial">
              <option>第三人称有限视角</option>
              <option>第三人称全知视角</option>
              <option>第一人称</option>
              <option>第二人称</option>
              <option>多视角轮转</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-muted block mb-1">句式风格</label>
            <input type="text" value={style.sentenceStyle} onChange={e => saveStyle({ sentenceStyle: e.target.value })} className="input-editorial" />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1">词汇水平</label>
            <input type="text" value={style.vocabularyLevel} onChange={e => saveStyle({ vocabularyLevel: e.target.value })} className="input-editorial" />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1">对话风格</label>
            <input type="text" value={style.dialogueStyle} onChange={e => saveStyle({ dialogueStyle: e.target.value })} className="input-editorial" />
          </div>
        </div>
      </div>

      {/* Banned Words */}
      <div className="card-editorial">
        <p className="label-editorial text-muted mb-4">禁词列表 ({style.bannedWords?.length || 0})</p>
        <p className="text-xs text-muted mb-3">以下词汇在AI生成时会被自动检测和替换</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {(style.bannedWords || []).map((word: string) => (
            <span key={word} className="flex items-center gap-1 px-2 py-1 text-xs border border-border">
              {word}
              <button onClick={() => removeBannedWord(word)} className="text-muted hover:text-red-600 ml-1">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" value={newWord} onChange={e => setNewWord(e.target.value)} className="input-editorial flex-1" placeholder="添加禁词..." onKeyDown={e => e.key === 'Enter' && addBannedWord()} />
          <button onClick={addBannedWord} className="btn-editorial text-xs" disabled={!newWord}>添加</button>
        </div>
      </div>

      {/* Banned Patterns */}
      <div className="card-editorial">
        <p className="label-editorial text-muted mb-4">禁用模式</p>
        <div className="space-y-2">
          {(style.bannedPatterns || []).map((pattern: string, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm flex-1">{pattern}</span>
              <button onClick={() => saveStyle({ bannedPatterns: style.bannedPatterns.filter((_: string, j: number) => j !== i) })} className="text-xs text-muted hover:text-red-600">删除</button>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Rules */}
      <div className="card-editorial">
        <p className="label-editorial text-muted mb-4">自定义规则</p>
        <textarea
          value={style.customRules || ''}
          onChange={e => saveStyle({ customRules: e.target.value })}
          className="input-editorial"
          rows={6}
          placeholder="在这里编写自定义的写作约束规则，这些规则会注入到Agent的system prompt中..."
        />
      </div>
    </div>
  );
}
