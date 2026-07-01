'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Command {
  id: string;
  label: string;
  description?: string;
  action: () => void;
  category: string;
}

/**
 * CommandPalette — Obsidian-style global command palette (Ctrl+K).
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const commands: Command[] = [
    { id: 'new-project', label: '新建项目', description: '创建新的小说项目', action: () => router.push('/books'), category: '项目' },
    { id: 'go-dashboard', label: '项目中心', description: '返回项目中心', action: () => router.push('/'), category: '导航' },
    { id: 'go-books', label: '小说管理', description: '管理所有小说', action: () => router.push('/books'), category: '导航' },
    { id: 'go-agents', label: 'Agent 监控', description: '查看 Agent 状态', action: () => router.push('/agents'), category: '导航' },
    { id: 'go-store', label: '模板商店', description: '浏览模板', action: () => router.push('/store'), category: '导航' },
    { id: 'go-settings', label: '系统设置', description: '配置服务商和 Agent', action: () => router.push('/settings'), category: '导航' },
    { id: 'toggle-theme', label: '切换主题', description: '切换亮色/暗色模式', action: () => {
      const current = localStorage.getItem('conovel-theme') || 'light';
      const next = current === 'light' ? 'dark' : 'light';
      localStorage.setItem('conovel-theme', next);
      document.documentElement.setAttribute('data-theme', next);
    }, category: '工具' },
  ];

  const filtered = query
    ? commands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.description?.toLowerCase().includes(query.toLowerCase()),
      )
    : commands;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery('');
        setSelectedIndex(0);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    },
    [],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const executeCommand = (cmd: Command) => {
    cmd.action();
    setOpen(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      executeCommand(filtered[selectedIndex]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-black/30" />
      <div
        className="relative w-[32rem] bg-background border border-border shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            className="w-full px-4 py-3 bg-transparent text-sm focus:outline-none placeholder:text-muted"
            placeholder="输入命令或搜索..."
          />
        </div>
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">没有匹配的命令</p>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={() => executeCommand(cmd)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                  i === selectedIndex ? 'bg-foreground/5' : 'hover:bg-foreground/5'
                }`}
              >
                <div>
                  <span className="text-sm">{cmd.label}</span>
                  {cmd.description && (
                    <span className="text-xs text-muted ml-2">{cmd.description}</span>
                  )}
                </div>
                <span className="text-[10px] text-muted font-mono">{cmd.category}</span>
              </button>
            ))
          )}
        </div>
        <div className="border-t border-border px-4 py-2 flex items-center justify-between">
          <span className="text-[10px] text-muted">
            <kbd className="px-1 py-0.5 border border-border text-[10px]">↑↓</kbd> 导航
            <span className="mx-1">·</span>
            <kbd className="px-1 py-0.5 border border-border text-[10px]">Enter</kbd> 执行
          </span>
          <span className="text-[10px] text-muted">
            <kbd className="px-1 py-0.5 border border-border text-[10px]">Ctrl+K</kbd> 打开
          </span>
        </div>
      </div>
    </div>
  );
}
