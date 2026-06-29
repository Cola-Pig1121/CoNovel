'use client';

import { useState, useEffect } from 'react';
import { isTauri, tauriInvoke } from '@/lib/tauri';

interface ToolStatus {
  installed: boolean;
  version: string;
}

interface EnvStatus {
  allReady: boolean;
  python: ToolStatus;
  node: ToolStatus;
  pnpm: ToolStatus;
  litellm: ToolStatus;
  git: ToolStatus;
}

/**
 * StartupCheck - Displays on first launch
 * Shows environment status and guides user to fix issues
 */
export function StartupCheck({ onDismiss }: { onDismiss: () => void }) {
  const [env, setEnv] = useState<EnvStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isTauri()) {
      tauriInvoke<EnvStatus>('check_environment').then(setEnv).catch(() => setEnv(null)).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleInstallLitellm = async () => {
    setInstalling(true);
    setMessage('Installing litellm...');
    try {
      const result = await tauriInvoke<any>('install_python_dep', { dep: 'litellm' });
      setMessage(result.message || 'litellm installed');
      // Re-check
      const newEnv = await tauriInvoke<EnvStatus>('check_environment');
      setEnv(newEnv);
    } catch (e: any) {
      setMessage(`Install failed: ${e}`);
    }
    setInstalling(false);
  };

  if (loading) return null;
  if (!isTauri()) return null;

  // If all ready, auto-dismiss
  useEffect(() => {
    if (env?.allReady) {
      const timer = setTimeout(onDismiss, 1500);
      return () => clearTimeout(timer);
    }
  }, [env, onDismiss]);

  if (!env) return null;

  const tools = [
    { name: 'Python', status: env.python, installHint: 'https://www.python.org/downloads/' },
    { name: 'Node.js', status: env.node, installHint: 'https://nodejs.org/' },
    { name: 'pnpm', status: env.pnpm, installHint: 'npm install -g pnpm' },
    { name: 'litellm', status: env.litellm, installHint: 'pip install litellm', canInstall: env.python.installed },
    { name: 'Git', status: env.git, installHint: 'https://git-scm.com/' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-background border border-border w-[32rem] p-6 max-h-[80vh] overflow-y-auto">
        <h3 className="font-serif text-lg mb-1">环境检测</h3>
        <p className="text-xs text-muted mb-6">CoNovel 需要以下工具才能正常运行</p>

        <div className="space-y-3">
          {tools.map(tool => (
            <div key={tool.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${tool.status.installed ? 'bg-green-500' : 'bg-red-500'}`} />
                <div>
                  <p className="font-sans text-sm">{tool.name}</p>
                  {tool.status.installed ? (
                    <p className="text-xs text-muted">{tool.status.version}</p>
                  ) : (
                    <p className="text-xs text-red-600">未安装</p>
                  )}
                </div>
              </div>
              {!tool.status.installed && (
                tool.canInstall ? (
                  <button onClick={handleInstallLitellm} disabled={installing} className="btn-editorial text-xs">
                    {installing ? '安装中...' : '安装'}
                  </button>
                ) : (
                  <button onClick={() => tauriInvoke('open_url', { url: tool.installHint }).catch(() => {})} className="btn-editorial text-xs">
                    下载
                  </button>
                )
              )}
            </div>
          ))}
        </div>

        {message && (
          <div className="mt-4 p-3 border border-border text-sm text-muted">{message}</div>
        )}

        <div className="mt-6 flex justify-end">
          {env.allReady ? (
            <p className="text-sm text-green-600">环境就绪，正在进入...</p>
          ) : (
            <button onClick={onDismiss} className="btn-editorial text-xs">跳过，稍后配置</button>
          )}
        </div>
      </div>
    </div>
  );
}
