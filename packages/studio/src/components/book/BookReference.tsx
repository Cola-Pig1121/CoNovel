'use client';

import { api } from '@/lib/api';
import { isTauri, tauriInvoke } from '@/lib/tauri';
import { useState, useEffect, useRef, useCallback } from 'react';

interface RefFile {
  name: string;
  size: number;
}

interface RefMeta {
  books: Array<{
    id: string;
    title: string;
    author: string;
    addedAt: string;
    styleExtracted: boolean;
    styleProfile?: any;
  }>;
  techniques: string[];
  customNotes: string;
}

export function BookReference({ bookId, book }: { bookId: string; book: any }) {
  const [files, setFiles] = useState<RefFile[]>([]);
  const [meta, setMeta] = useState<RefMeta>({ books: [], techniques: [], customNotes: '' });
  const [loading, setLoading] = useState(true);
  const [showAddBook, setShowAddBook] = useState(false);
  const [newBook, setNewBook] = useState({ title: '', author: '' });
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get(`/api/books/${bookId}/reference`).then((data: any) => {
      setFiles(data.files || []);
      setMeta(data.meta || { books: [], techniques: [], customNotes: '' });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [bookId]);

  // File upload handler
  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    try {
      if (isTauri()) {
        // Tauri: read file as bytes and send to Rust command
        const buffer = await file.arrayBuffer();
        const bytes = Array.from(new Uint8Array(buffer));
        await tauriInvoke('upload_reference_file', {
          book_id: bookId,
          file_name: file.name,
          file_content: bytes,
        });
      } else {
        // Web: upload via FormData
        const formData = new FormData();
        formData.append('file', file);
        await fetch(`/api/books/${bookId}/reference/upload`, {
          method: 'POST',
          body: formData,
        });
      }
      // Reload file list
      const data: any = await api.get(`/api/books/${bookId}/reference`);
      setFiles(data.files || []);
    } catch (e) {
      console.error('Upload failed:', e);
      alert(`上传失败: ${e}`);
    }
    setUploading(false);
  }, [bookId]);

  // Handle file input change
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;
    for (let i = 0; i < selectedFiles.length; i++) {
      uploadFile(selectedFiles[i]);
    }
    e.target.value = '';
  }, [uploadFile]);

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = e.dataTransfer.files;
    for (let i = 0; i < droppedFiles.length; i++) {
      uploadFile(droppedFiles[i]);
    }
  }, [uploadFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleAddBook = async () => {
    if (!newBook.title) return;
    await api.post(`/api/books/${bookId}/reference`, { action: 'add_book', ...newBook });
    setMeta({ ...meta, books: [...meta.books, { id: crypto.randomUUID(), ...newBook, addedAt: new Date().toISOString(), styleExtracted: false }] });
    setShowAddBook(false);
    setNewBook({ title: '', author: '' });
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    const data = await api.post(`/api/books/${bookId}/reference`, { action: 'analyze_references' });
    setMeta(data.meta || meta);
    setAnalyzing(false);
  };

  const handleDeleteFile = async (fileName: string) => {
    if (!confirm(`确定删除 ${fileName}？`)) return;
    try {
      if (isTauri()) {
        await tauriInvoke('delete_reference_file', { book_id: bookId, file_name: fileName });
      } else {
        await api.del(`/api/books/${bookId}/reference`, { fileName });
      }
      setFiles(files.filter(f => f.name !== fileName));
    } catch {}
  };

  const handleDeleteBook = async (bid: string) => {
    await api.del(`/api/books/${bookId}/reference`, { bookId: bid });
    setMeta({ ...meta, books: meta.books.filter(b => b.id !== bid) });
  };

  const formatSize = (bytes: number) => {
    if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  if (loading) return <div className="text-muted text-sm">加载中...</div>;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg">参考小说</h3>
          <p className="text-xs text-muted mt-1">上传参考小说文件，系统会自动分析其文风并调整写作设定</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAnalyze} disabled={analyzing || files.length === 0} className="btn-editorial text-xs">
            {analyzing ? '分析中...' : '分析文风'}
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="btn-editorial-primary text-xs" disabled={uploading}>
            {uploading ? '上传中...' : '上传文件'}
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".txt,.md,.epub"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Drag and Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
          dragOver ? 'border-foreground bg-foreground/5' : 'border-border hover:border-foreground/50'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="text-muted">
          {uploading ? (
            <p>正在上传...</p>
          ) : (
            <>
              <p className="font-sans text-sm mb-1">拖拽文件到此处，或点击选择</p>
              <p className="text-xs">支持 .txt .md .epub 格式，最大 50MB</p>
            </>
          )}
        </div>
      </div>

      {/* Uploaded Files */}
      {files.length > 0 && (
        <div className="card-editorial">
          <p className="label-editorial text-muted mb-3">已上传文件 ({files.length})</p>
          <div className="space-y-2">
            {files.map(f => (
              <div key={f.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="font-mono text-sm">{f.name}</p>
                  <p className="text-xs text-muted">{formatSize(f.size)}</p>
                </div>
                <button onClick={() => handleDeleteFile(f.name)} className="text-xs text-muted hover:text-red-600">删除</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reference Books */}
      {meta.books.length > 0 && (
        <div className="card-editorial">
          <div className="flex items-center justify-between mb-3">
            <p className="label-editorial text-muted">参考书籍元数据</p>
            <button onClick={() => setShowAddBook(true)} className="btn-editorial text-xs">+ 添加</button>
          </div>
          <div className="space-y-2">
            {meta.books.map((ref) => (
              <div key={ref.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm">{ref.title} <span className="text-muted">· {ref.author}</span></p>
                  <p className="text-xs text-muted">{ref.addedAt.split('T')[0]}</p>
                </div>
                <div className="flex items-center gap-3">
                  {ref.styleExtracted ? (
                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800">已分析</span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs bg-muted/20 text-muted">待分析</span>
                  )}
                  <button onClick={() => handleDeleteBook(ref.id)} className="text-xs text-muted hover:text-red-600">删除</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {meta.books.length === 0 && files.length === 0 && (
        <div className="card-editorial text-center py-12">
          <p className="text-muted mb-3">暂无参考材料</p>
          <p className="text-xs text-muted">上传参考小说文件后，系统会分析其文风特征并融入写作设定</p>
        </div>
      )}

      {/* Custom Notes */}
      <div className="card-editorial">
        <h4 className="font-serif text-sm mb-3">参考笔记</h4>
        <textarea
          value={meta.customNotes}
          onChange={(e) => setMeta({ ...meta, customNotes: e.target.value })}
          className="input-editorial"
          rows={4}
          placeholder="记录从参考小说中学到的写作技巧、要模仿的风格特点等..."
        />
        <button
          onClick={async () => {
            await api.post(`/api/books/${bookId}/reference`, { action: 'update_notes', notes: meta.customNotes });
          }}
          className="btn-editorial text-xs mt-3"
        >
          保存笔记
        </button>
      </div>

      {/* Add Book Metadata Modal */}
      {showAddBook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border w-96 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-lg">添加参考书籍信息</h3>
              <button onClick={() => setShowAddBook(false)} className="text-muted hover:text-foreground">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label-editorial block mb-2">书名</label>
                <input type="text" value={newBook.title} onChange={e => setNewBook({ ...newBook, title: e.target.value })} className="input-editorial" placeholder="参考小说书名" />
              </div>
              <div>
                <label className="label-editorial block mb-2">作者</label>
                <input type="text" value={newBook.author} onChange={e => setNewBook({ ...newBook, author: e.target.value })} className="input-editorial" placeholder="作者名" />
              </div>
              <p className="text-xs text-muted">此信息用于记录，实际文件通过上方上传。</p>
            </div>
            <div className="flex gap-4 mt-6 pt-4 border-t border-border">
              <button onClick={() => setShowAddBook(false)} className="btn-editorial flex-1">取消</button>
              <button onClick={handleAddBook} className="btn-editorial-primary flex-1" disabled={!newBook.title}>添加</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
