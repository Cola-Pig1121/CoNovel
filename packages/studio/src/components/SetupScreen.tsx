'use client';

import { useState, useEffect, useCallback } from 'react';
import { isTauri, tauriInvoke, waitForTauri } from '@/lib/tauri';

interface ToolStatus { installed: boolean; version: string; }
interface EnvStatus { allReady: boolean; python: ToolStatus; node: ToolStatus; pnpm: ToolStatus; git: ToolStatus; }

/**
 * SetupScreen - First-launch environment check in Tauri mode.
 * Checks Python, Node.js, pnpm, Git. (litellm removed — using AI SDK now)
 */
export function SetupScreen({ onComplete }: { onComplete: () => void }) {
  const [env, setEnv] = useState<EnvStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => setLog(prev => [...prev, msg]), []);

  const checkEnv = useCallback(async () => {
    setLoading(true);
    try {
      const ready = await waitForTauri(5000);
      if (ready) {
        const result = await tauriInvoke<EnvStatus>('check_environment');
        setEnv(result);
        if (result.allReady) {
          addLog('所有依赖已就绪');
        } else {
          const missing = [];
          if (!result.python?.installed) missing.push('Python');
          if (!result.node?.installed) missing.push('Node.js');
          if (!result.git?.installed) missing.push('Git');
          addLog(`缺少: ${missing.join(', ')}`);
        }
      } else {
        addLog('未检测到 Tauri 环境');
      }
    } catch (e: unknown) {
      addLog(`检测失败: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoading(false);
  }, [addLog]);

  useEffect(() => { checkEnv(); }, [checkEnv]);

  const handleOpenUrl = async (url: string) => {
    try { await tauriInvoke('open_url', { url }); } catch { /* ignore */ }
    addLog(`已打开: ${url}`);
  };

  const tools = env ? [
    { key: 'python' as const, name: 'Python', desc: '运行 AI 模型调用', url: 'https://www.python.org/downloads/' },
    { key: 'node' as const, name: 'Node.js', desc: '运行前端开发服务器', url: 'https://nodejs.org/' },
    { key: 'git' as const, name: 'Git', desc: '版本控制和模板管理', url: 'https://git-scm.com/' },
  ] : [];

  if (!isTauri()) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
      <div className="w-[28rem] max-h-[85vh] overflow-y-auto">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl tracking-tight mb-2">CoNovel</h1>
          <p className="text-sm text-muted">自进化多Agent小说写作系统</p>
        </div>

        <div className="border border-border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg">环境检测</h2>
            {loading && <span className="text-xs text-muted animate-pulse">检测中...</span>}
          </div>

          {env && (
            <div className="space-y-3">
              {tools.map(tool => {
                const status = env[tool.key];
                return (
                  <div key={tool.key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 ${status?.installed ? 'bg-foreground' : 'border border-foreground'}`} />
                      <div>
                        <p className="text-sm font-medium">{tool.name}</p>
                        <p className="text-xs text-muted">{tool.desc}</p>
                        {status?.installed ? (
                          <p className="text-xs text-muted mt-0.5">{status.version}</p>
                        ) : (
                          <p className="text-xs mt-0.5 text-foreground/60">未安装</p>
                        )}
                      </div>
                    </div>
                    {!status?.installed && (
                      <button
                        onClick={() => handleOpenUrl(tool.url)}
                        className="px-4 py-2 text-xs border border-border hover:border-foreground transition-colors"
                      >
                        下载
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {log.length > 0 && (
          <div className="border border-border p-4 mb-6">
            <div className="space-y-1">
              {log.map((msg, i) => (
                <p key={i} className="text-xs text-muted font-mono">{msg}</p>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {env?.allReady ? (
            <button
              onClick={onComplete}
              className="w-full py-3 text-sm bg-foreground text-background border border-foreground transition-colors hover:bg-transparent hover:text-foreground"
            >
              环境就绪，进入 CoNovel
            </button>
          ) : (
            <>
              <button
                onClick={checkEnv}
                disabled={loading}
                className="w-full py-3 text-sm border border-border hover:border-foreground transition-colors"
              >
                重新检测
              </button>
              <button
                onClick={onComplete}
                className="w-full py-3 text-xs text-muted hover:text-foreground transition-colors"
              >
                跳过，稍后配置
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
