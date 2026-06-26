'use client';

import { useState } from 'react';

interface NameResult {
  name: string;
  explanation: string;
}

export function BookNaming({ bookId, book }: { bookId: string; book: any }) {
  const [type, setType] = useState('character');
  const [gender, setGender] = useState('male');
  const [count, setCount] = useState(10);
  const [avoidInput, setAvoidInput] = useState('');
  const [avoidList, setAvoidList] = useState<string[]>([]);
  const [results, setResults] = useState<NameResult[]>([]);
  const [loading, setLoading] = useState(false);

  const typeLabels: Record<string, string> = { character: '角色名', place: '地名', item: '物品名', faction: '势力名' };
  const genderLabels: Record<string, string> = { male: '男性', female: '女性', neutral: '中性' };

  const handleGenerate = async () => {
    setLoading(true);
    const res = await fetch('/api/naming', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        genre: book.genre || 'xianxia',
        gender: type === 'character' ? gender : undefined,
        count,
        avoidNames: avoidList,
      }),
    });
    const data = await res.json();
    setResults(data.names || []);
    setLoading(false);
  };

  const addAvoidName = () => {
    if (avoidInput && !avoidList.includes(avoidInput)) {
      setAvoidList([...avoidList, avoidInput]);
      setAvoidInput('');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h3 className="font-serif text-lg">取名工具</h3>
        <p className="text-xs text-muted mt-1">自动生成名称，自动排除常见同质化名称（龙傲天、萧炎、叶凡等）。可手动添加需要避免的名称。</p>
      </div>

      {/* Config */}
      <div className="card-editorial">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="label-editorial block mb-2">类型</label>
            <select value={type} onChange={e => setType(e.target.value)} className="input-editorial text-sm">
              {Object.entries(typeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {type === 'character' && (
            <div>
              <label className="label-editorial block mb-2">性别</label>
              <select value={gender} onChange={e => setGender(e.target.value)} className="input-editorial text-sm">
                {Object.entries(genderLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label-editorial block mb-2">数量</label>
            <input type="number" value={count} onChange={e => setCount(Number(e.target.value))} className="input-editorial text-sm" min={1} max={30} />
          </div>
          <div className="flex items-end">
            <button onClick={handleGenerate} disabled={loading} className="btn-editorial-primary text-sm w-full">
              {loading ? '生成中...' : '生成'}
            </button>
          </div>
        </div>

        {/* Avoid List */}
        <div>
          <label className="label-editorial block mb-2">避免的名称</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {avoidList.map(name => (
              <span key={name} className="flex items-center gap-1 px-2 py-1 text-xs border border-border">
                {name}
                <button onClick={() => setAvoidList(avoidList.filter(n => n !== name))} className="text-muted hover:text-red-600">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={avoidInput} onChange={e => setAvoidInput(e.target.value)} className="input-editorial flex-1 text-sm" placeholder="输入要避免的名称..." onKeyDown={e => e.key === 'Enter' && addAvoidName()} />
            <button onClick={addAvoidName} className="btn-editorial text-xs" disabled={!avoidInput}>添加</button>
          </div>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <p className="label-editorial text-muted">生成结果 ({results.length})</p>
          {results.map((r, i) => (
            <div key={i} className="card-editorial flex items-center gap-4">
              <span className="font-serif text-lg w-20">{r.name}</span>
              <span className="text-xs text-muted flex-1">{r.explanation}</span>
              <button
                onClick={() => navigator.clipboard.writeText(r.name)}
                className="btn-editorial text-xs"
              >
                复制
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      <div className="card-editorial">
        <h4 className="font-serif text-sm mb-3">取名技巧</h4>
        <div className="text-xs text-muted space-y-2">
          <p>• <strong>身份反差法</strong>：角色名暗示表面身份，与隐藏能力形成反差</p>
          <p>• <strong>细节记忆点</strong>：给角色设计标志性口头禅或随身物品</p>
          <p>• <strong>避免同质化</strong>：不要使用"龙傲天""萧炎""叶凡"等泛滥名称</p>
          <p>• <strong>符合世界观</strong>：仙侠用古风名，都市用现代名，科幻可用代号</p>
          <p>• <strong>易读易记</strong>：名字2-4个字为佳，避免生僻字</p>
        </div>
      </div>
    </div>
  );
}
