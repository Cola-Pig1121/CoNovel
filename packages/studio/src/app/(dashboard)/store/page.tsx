'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { isTauri, tauriInvoke } from '@/lib/tauri';

interface Template {
  name: string;
  description?: string;
  version?: string;
  createdAt?: string;
}

export default function StorePage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [exportForm, setExportForm] = useState({ bookId: '', templateName: '', description: '' });
  const [cloneUrl, setCloneUrl] = useState('');
  const [books, setBooks] = useState<any[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    loadTemplates();
    loadBooks();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      if (isTauri()) {
        const result = await tauriInvoke<Template[]>('list_templates');
        setTemplates(result);
      } else {
        // Fallback: read from config dir via API (not available in web mode)
        setTemplates([]);
      }
    } catch { setTemplates([]); }
    setLoading(false);
  };

  const loadBooks = async () => {
    try {
      const data = await api.get<any>('/api/books');
      setBooks(data.books || []);
    } catch { /* ignore */ }
  };

  const checkTauri = () => { if (!isTauri()) { setStatus('此功能仅在 Tauri 桌面端可用'); return false; } return true; };

  const handleExport = async () => {
    if (!checkTauri() || !exportForm.bookId || !exportForm.templateName) return;
    try { await tauriInvoke('export_template', { book_id: exportForm.bookId, template_name: exportForm.templateName, description: exportForm.description }); setStatus('模板已导出'); setShowExportModal(false); loadTemplates(); } catch (e: any) { setStatus(`导出失败: ${e}`); }
  };

  const handleImport = async (templateName: string) => {
    if (!checkTauri()) return;
    const title = prompt('新项目名称：');
    if (!title) return;
    try { const res = await tauriInvoke<any>('import_template', { template_name: templateName, new_book_id: crypto.randomUUID(), new_book_title: title }); setStatus(`模板已导入到 ${res.bookId}`); window.location.href = `/books/${res.bookId}`; } catch (e: any) { setStatus(`导入失败: ${e}`); }
  };

  const handleClone = async () => {
    if (!checkTauri() || !cloneUrl) return;
    try { await tauriInvoke('clone_template', { repo_url: cloneUrl }); setStatus('模板仓库已拉取'); setShowCloneModal(false); loadTemplates(); } catch (e: any) { setStatus(`拉取失败: ${e}`); }
  };

  const handlePush = async (templateName: string) => {
    if (!checkTauri()) return;
    const url = prompt('GitHub 仓库地址：');
    if (!url) return;
    try { await tauriInvoke('push_template', { template_name: templateName, repo_url: url }); setStatus('已推送到 GitHub'); } catch (e: any) { setStatus(`推送失败: ${e}`); }
  };

  // Official templates
  const officialTemplates = [
    { name: '仙侠·废柴逆袭', repo: 'https://github.com/Cola-Pig1121/conovel-templates', description: '仙侠题材模板：废柴逆袭型主角，修仙世界观，门派体系' },
    { name: '都市·重生复仇', repo: 'https://github.com/Cola-Pig1121/conovel-templates', description: '都市题材模板：重生复仇型主角，商战+感情线' },
    { name: '玄幻·系统流', repo: 'https://github.com/Cola-Pig1121/conovel-templates', description: '玄幻题材模板：系统辅助成长，快节奏' },
  ];

  return (
    <div>
      <header className="mb-8 px-12 pt-6">
        <h2 className="font-serif text-2xl tracking-tight">模板商店</h2>
        <p className="text-muted text-sm mt-1">导出、导入和共享项目配置模板</p>
      </header>

      <div className="px-12 pb-12">
        {status && (
          <div className="mb-4 p-3 border border-border text-sm">{status}</div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mb-8">
          <button onClick={() => setShowExportModal(true)} className="btn-editorial-primary text-xs">导出模板</button>
          <button onClick={() => setShowCloneModal(true)} className="btn-editorial text-xs">从 GitHub 拉取</button>
        </div>

        {/* Local Templates */}
        <section className="mb-12">
          <h3 className="label-editorial text-muted mb-4">我的模板</h3>
          {loading ? (
            <p className="text-muted text-sm">加载中...</p>
          ) : templates.length === 0 ? (
            <div className="card-editorial text-center py-8">
              <p className="text-muted mb-2">暂无本地模板</p>
              <p className="text-xs text-muted">导出项目配置或从 GitHub 拉取模板</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t, i) => (
                <div key={i} className="card-editorial">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-serif">{t.name}</p>
                      {t.description && <p className="text-xs text-muted mt-1">{t.description}</p>}
                    </div>
                    {t.version && <span className="text-xs text-muted font-mono">v{t.version}</span>}
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-border">
                    <button onClick={() => handleImport(t.name)} className="btn-editorial text-xs flex-1">使用此模板</button>
                    <button onClick={() => handlePush(t.name)} className="btn-editorial text-xs">推送到 GitHub</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Official Templates */}
        <section>
          <h3 className="label-editorial text-muted mb-4">官方模板</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {officialTemplates.map((t, i) => (
              <div key={i} className="card-editorial">
                <p className="font-serif mb-2">{t.name}</p>
                <p className="text-xs text-muted mb-3">{t.description}</p>
                <div className="flex gap-2 pt-3 border-t border-border">
                  <button onClick={async () => {
                    if (!checkTauri()) return;
                    try {
                      await tauriInvoke('clone_template', { repo_url: t.repo, template_name: t.name });
                      setStatus(`已拉取: ${t.name}`);
                      loadTemplates();
                    } catch (e: any) { setStatus(`拉取失败: ${e}`); }
                  }} className="btn-editorial-primary text-xs flex-1">拉取</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border w-[32rem] p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-lg">导出模板</h3>
              <button onClick={() => setShowExportModal(false)} className="text-muted hover:text-foreground">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label-editorial block mb-2">选择项目</label>
                <select value={exportForm.bookId} onChange={e => setExportForm({ ...exportForm, bookId: e.target.value })} className="input-editorial">
                  <option value="">选择项目...</option>
                  {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                </select>
              </div>
              <div>
                <label className="label-editorial block mb-2">模板名称</label>
                <input type="text" value={exportForm.templateName} onChange={e => setExportForm({ ...exportForm, templateName: e.target.value })} className="input-editorial" placeholder="如：仙侠·废柴逆袭" />
              </div>
              <div>
                <label className="label-editorial block mb-2">描述</label>
                <textarea value={exportForm.description} onChange={e => setExportForm({ ...exportForm, description: e.target.value })} className="input-editorial" rows={2} placeholder="模板描述..." />
              </div>
              <p className="text-xs text-muted">导出内容：风格配置、约束文件、参考小说。不含章节内容。</p>
            </div>
            <div className="flex gap-4 mt-6 pt-4 border-t border-border">
              <button onClick={() => setShowExportModal(false)} className="btn-editorial flex-1">取消</button>
              <button onClick={handleExport} className="btn-editorial-primary flex-1" disabled={!exportForm.bookId || !exportForm.templateName}>导出</button>
            </div>
          </div>
        </div>
      )}

      {/* Clone Modal */}
      {showCloneModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border w-[32rem] p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-lg">从 GitHub 拉取模板</h3>
              <button onClick={() => setShowCloneModal(false)} className="text-muted hover:text-foreground">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label-editorial block mb-2">仓库地址</label>
                <input type="url" value={cloneUrl} onChange={e => setCloneUrl(e.target.value)} className="input-editorial" placeholder="https://github.com/user/repo" />
              </div>
              <p className="text-xs text-muted">需要本地安装 Git。仓库应包含 style.json、constraints/ 等配置文件。</p>
            </div>
            <div className="flex gap-4 mt-6 pt-4 border-t border-border">
              <button onClick={() => setShowCloneModal(false)} className="btn-editorial flex-1">取消</button>
              <button onClick={handleClone} className="btn-editorial-primary flex-1" disabled={!cloneUrl}>拉取</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
