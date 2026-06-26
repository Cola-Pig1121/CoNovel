'use client';

import { useState, useEffect } from 'react';

interface ConstraintFile {
  name: string;
  size: number;
  preview: string;
}

export function BookConstraints({ bookId }: { bookId: string }) {
  const [files, setFiles] = useState<ConstraintFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load file list
  useEffect(() => {
    fetch(`/api/books/${bookId}/constraints`).then(r => r.json()).then(data => {
      setFiles(data.files || []);
      if (data.files?.length > 0 && !selectedFile) {
        setSelectedFile(data.files[0].name);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [bookId]);

  // Load file content when selected
  useEffect(() => {
    if (!selectedFile) return;
    fetch(`/api/books/${bookId}/constraints?file=${selectedFile}`)
      .then(r => r.json())
      .then(data => {
        setContent(data.content || '');
        setSaved(false);
      });
  }, [selectedFile, bookId]);

  const handleSave = async (file?: string, data?: string) => {
    const saveFile = file || selectedFile;
    const saveContent = data !== undefined ? data : content;
    if (!saveFile) return;
    setSaving(true);
    await fetch(`/api/books/${bookId}/constraints`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: saveFile, content: saveContent }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!selectedFile || !content) return;
    const timer = setInterval(() => {
      handleSave(selectedFile, content);
    }, 30000);
    return () => clearInterval(timer);
  }, [selectedFile, content]);

  const handleCreateFile = async () => {
    const name = prompt('约束文件名称（英文，如 character-rules）');
    if (!name) return;
    await fetch(`/api/books/${bookId}/constraints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, content: '' }),
    });
    const res = await fetch(`/api/books/${bookId}/constraints`);
    const data = await res.json();
    setFiles(data.files || []);
    setSelectedFile(name.replace(/[^a-zA-Z0-9_-]/g, '_') + '.md');
  };

  const handleDeleteFile = async (fileName: string) => {
    if (!confirm(`确定删除 ${fileName}？`)) return;
    await fetch(`/api/books/${bookId}/constraints`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: fileName }),
    });
    const res = await fetch(`/api/books/${bookId}/constraints`);
    const data = await res.json();
    setFiles(data.files || []);
    if (selectedFile === fileName) {
      setSelectedFile(data.files?.[0]?.name || null);
    }
  };

  if (loading) return <div className="text-muted text-sm">加载中...</div>;

  const fileLabels: Record<string, string> = {
    'style-constraints.md': '风格约束',
    'genre-constraints.md': '题材约束',
    'character-rules.md': '角色规则',
    'plot-constraints.md': '剧情约束',
    'banned-words.md': '禁词列表',
    'writing-guide.md': '写作指南',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg">约束文件</h3>
          <p className="text-xs text-muted mt-1">编辑写作约束，Agent会读取这些文件来指导创作</p>
        </div>
        <button onClick={handleCreateFile} className="btn-editorial-primary text-xs">新建约束文件</button>
      </div>

      <div className="flex gap-6">
        {/* File List */}
        <div className="w-56 flex-shrink-0 space-y-1">
          {files.map(f => (
            <button
              key={f.name}
              onClick={() => setSelectedFile(f.name)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                selectedFile === f.name
                  ? 'bg-foreground text-background'
                  : 'hover:bg-foreground/5'
              }`}
            >
              <span className="truncate">{fileLabels[f.name] || f.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteFile(f.name); }}
                className="text-xs opacity-50 hover:opacity-100"
              >
                ✕
              </button>
            </button>
          ))}
        </div>

        {/* Editor */}
        {selectedFile ? (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-sm text-muted">{selectedFile}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted">{content.length} 字符</span>
                <button onClick={() => handleSave()} disabled={saving} className={`btn-editorial-primary text-xs ${saving ? 'opacity-50' : ''}`}>
                  {saving ? '保存中...' : saved ? '已保存 ✓' : '保存'}
                </button>
              </div>
            </div>
            <textarea
              value={content}
              onChange={e => { setContent(e.target.value); setSaved(false); }}
              className="flex-1 w-full p-4 font-mono text-sm leading-relaxed border border-border focus:outline-none focus:border-foreground resize-none bg-background"
              placeholder="在此编辑约束内容..."
              spellCheck={false}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted text-sm border border-border">
            选择左侧文件进行编辑
          </div>
        )}
      </div>
    </div>
  );
}
