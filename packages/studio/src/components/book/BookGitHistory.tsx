'use client';

import { useState, useEffect } from 'react';
import { isTauri, tauriInvoke } from '@/lib/tauri';

interface GitCommit {
  hash: string;
  message: string;
  date: string;
}

interface GitTag {
  name: string;
  date: string;
}

export function BookGitHistory({ bookId }: { bookId: string }) {
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [tags, setTags] = useState<GitTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [gitAvailable, setGitAvailable] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [tagName, setTagName] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!isTauri()) {
      setLoading(false);
      return;
    }
    loadGitData();
  }, [bookId]);

  const loadGitData = async () => {
    setLoading(true);
    try {
      await tauriInvoke('git_init', { book_id: bookId });
      setGitAvailable(true);

      const [logResult, tagsResult] = await Promise.all([
        tauriInvoke<GitCommit[]>('git_log', { book_id: bookId, count: 20 }),
        tauriInvoke<GitTag[]>('git_tags', { book_id: bookId }),
      ]);
      setCommits(logResult);
      setTags(tagsResult);
    } catch {
      setGitAvailable(false);
    }
    setLoading(false);
  };

  const handleCommit = async () => {
    const message = commitMessage || `自动保存 ${new Date().toLocaleString()}`;
    try {
      await tauriInvoke('git_commit', { book_id: bookId, message });
      setStatus('已提交');
      setCommitMessage('');
      loadGitData();
    } catch (e: any) { setStatus(`提交失败: ${e}`); }
  };

  const handleTag = async () => {
    if (!tagName) return;
    try {
      await tauriInvoke('git_tag', { book_id: bookId, tag_name: tagName });
      setStatus(`标签 ${tagName} 已创建`);
      setTagName('');
      loadGitData();
    } catch (e: any) { setStatus(`标签失败: ${e}`); }
  };

  const handleRestore = async (hash: string) => {
    if (!confirm(`确定回退到 ${hash.substring(0, 8)}？当前状态会自动保存。`)) return;
    try {
      const result = await tauriInvoke<any>('git_restore', { book_id: bookId, commit_hash: hash });
      setStatus(result.message || '已回退');
      loadGitData();
      window.location.reload();
    } catch (e: any) { setStatus(`回退失败: ${e}`); }
  };

  if (loading) return <div className="text-muted text-sm">加载中...</div>;

  if (!gitAvailable) {
    return (
      <div className="card-editorial text-center py-12">
        <p className="text-muted mb-2">Git 版本控制未初始化</p>
        <p className="text-xs text-muted">需要安装 Git 并在 Tauri 桌面端使用</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h3 className="font-serif text-lg">版本控制</h3>
        <p className="text-xs text-muted mt-1">Git worktree 管理项目历史，支持回退和备份</p>
      </div>

      {status && (
        <div className="p-3 border border-border text-sm">{status}
          <button onClick={() => setStatus('')} className="ml-2 text-muted">✕</button>
        </div>
      )}

      {/* Quick Commit */}
      <div className="card-editorial">
        <p className="label-editorial text-muted mb-3">提交快照</p>
        <div className="flex gap-2">
          <input type="text" value={commitMessage} onChange={e => setCommitMessage(e.target.value)} className="input-editorial flex-1" placeholder="提交说明（可选）" onKeyDown={e => e.key === 'Enter' && handleCommit()} />
          <button onClick={handleCommit} className="btn-editorial-primary text-xs">提交</button>
        </div>
      </div>

      {/* Create Tag */}
      <div className="card-editorial">
        <p className="label-editorial text-muted mb-3">创建备份标签</p>
        <div className="flex gap-2">
          <input type="text" value={tagName} onChange={e => setTagName(e.target.value)} className="input-editorial flex-1" placeholder="标签名称（如：v1.0-大纲完成）" onKeyDown={e => e.key === 'Enter' && handleTag()} />
          <button onClick={handleTag} className="btn-editorial text-xs" disabled={!tagName}>创建标签</button>
        </div>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="card-editorial">
          <p className="label-editorial text-muted mb-3">备份标签 ({tags.length})</p>
          <div className="space-y-2">
            {tags.map((tag, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="font-mono text-sm">{tag.name}</p>
                  <p className="text-xs text-muted">{tag.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commit History */}
      <div className="card-editorial">
        <p className="label-editorial text-muted mb-3">提交历史 ({commits.length})</p>
        {commits.length === 0 ? (
          <p className="text-sm text-muted">暂无提交记录</p>
        ) : (
          <div className="space-y-2">
            {commits.map((c, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex-1">
                  <p className="text-sm">{c.message}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="font-mono text-xs text-muted">{c.hash.substring(0, 8)}</span>
                    <span className="text-xs text-muted">{c.date}</span>
                  </div>
                </div>
                <button onClick={() => handleRestore(c.hash)} className="btn-editorial text-xs" title="回退到此版本">
                  回退
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
