'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

export default function ChapterEditorPage({ params }: { params: Promise<{ id: string; num: string }> }) {
  const { id, num } = use(params);
  const chapterNum = parseInt(num, 10);

  const [chapter, setChapter] = useState<any>(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/books/${id}/chapters/${chapterNum}`).then(r => r.json()).then(data => {
      setChapter(data);
      setContent(data.content || '');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, chapterNum]);

  // Word count (Chinese chars + English words)
  const wordCount = (content.match(/[\u4e00-\u9fff]/g) || []).length +
    (content.match(/[a-zA-Z]+/g) || []).length;
  const targetWords = chapter?.wordTarget || 3000;

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/books/${id}/chapters/${chapterNum}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!content) return;
    const timer = setInterval(() => {
      fetch(`/api/books/${id}/chapters/${chapterNum}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
    }, 30000);
    return () => clearInterval(timer);
  }, [content, id, chapterNum]);

  if (loading) return <div className="p-12 text-muted">加载中...</div>;
  if (!chapter) return <div className="p-12 text-muted">章节不存在</div>;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href={`/books/${id}`} className="text-muted hover:text-foreground text-sm">← 返回</Link>
          <div>
            <h1 className="font-serif text-lg">{chapter.title || `第${chapterNum}章`}</h1>
            <p className="text-xs text-muted">{chapter.status || 'draft'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm text-muted">{wordCount.toLocaleString()} 字</span>
          <button onClick={handleSave} disabled={saving} className={`btn-editorial-primary text-xs ${saving ? 'opacity-50' : ''}`}>
            {saving ? '保存中...' : saved ? '已保存 ✓' : '保存'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Plain Text Editor */}
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-2 border-b border-border">
            <span className="text-xs text-muted">纯文本编辑 — 章节内容不包含任何 Markdown 格式</span>
          </div>
          <textarea
            value={content}
            onChange={e => { setContent(e.target.value); setSaved(false); }}
            className="flex-1 w-full p-6 font-sans text-base leading-relaxed resize-none focus:outline-none bg-background text-foreground"
            placeholder="在此输入章节内容...&#10;&#10;这里是纯文本编辑器，不支持 Markdown 语法。&#10;所有内容将以纯文本形式保存。"
            spellCheck={false}
          />
        </div>

        {/* Info Panel */}
        <div className="w-72 border-l border-border overflow-y-auto flex-shrink-0">
          {/* Chapter Info */}
          <div className="p-4 border-b border-border">
            <p className="label-editorial text-muted mb-3">章节信息</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">当前字数</span>
                <span className="font-mono">{wordCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">目标字数</span>
                <span className="font-mono">{targetWords.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">完成度</span>
                <span className="font-mono">{Math.min(100, Math.round((wordCount / targetWords) * 100))}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">状态</span>
                <span>{chapter.status || 'draft'}</span>
              </div>
            </div>
          </div>

          {/* Outline */}
          <div className="p-4 border-b border-border">
            <p className="label-editorial text-muted mb-3">章节大纲</p>
            <p className="text-sm text-muted leading-relaxed">
              {chapter.outline || '暂无大纲。可以在「大纲」Tab中添加，或通过Agent对话生成。'}
            </p>
          </div>

          {/* Agent Outputs */}
          <div className="p-4">
            <p className="label-editorial text-muted mb-3">Agent 输出</p>
            {chapter.agentOutputs && Object.keys(chapter.agentOutputs).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(chapter.agentOutputs).map(([agent, output]: [string, any]) => (
                  <div key={agent} className="p-2 border border-border text-xs">
                    <p className="font-medium mb-1">{agent}</p>
                    <p className="text-muted whitespace-pre-wrap">{typeof output === 'string' ? output.substring(0, 200) : JSON.stringify(output).substring(0, 200)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted">创作完成后，Agent的推理结果、审阅反馈、去AI味建议会显示在这里。</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
