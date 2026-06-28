'use client';

import { api } from '@/lib/api';

import { useState, useEffect } from 'react';

interface TokenUsage {
  totalPrompt: number;
  totalCompletion: number;
  totalTokens: number;
  perAgent: Record<string, { prompt: number; completion: number }>;
}

export function TokenStatusBar({ bookId }: { bookId: string }) {
  const [tokens, setTokens] = useState<TokenUsage | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [breakpoint, setBreakpoint] = useState<{ at: string; reason: string } | null>(null);

  useEffect(() => {
    const poll = () => {
      api.get(`/api/books/${bookId}/pipeline-control`)
        .then(data => {
          setTokens(data.tokenUsage || null);
          setStatus(data.status || 'idle');
          if (data.status === 'breakpoint') {
            setBreakpoint({ at: data.breakpointAt, reason: data.breakpointReason });
          } else {
            setBreakpoint(null);
          }
        })
        .catch(() => {});
    };

    poll();
    const interval = setInterval(poll, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [bookId]);

  const statusLabels: Record<string, string> = {
    idle: '空闲',
    running: '运行中',
    breakpoint: '等待人工输入',
    paused: '已暂停',
    completed: '已完成',
    error: '错误',
  };

  const statusColors: Record<string, string> = {
    idle: 'text-muted',
    running: 'text-green-600',
    breakpoint: 'text-yellow-600',
    paused: 'text-yellow-600',
    completed: 'text-foreground',
    error: 'text-red-600',
  };

  return (
    <div className="flex items-center gap-4 text-xs">
      {/* Status */}
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${status === 'running' ? 'bg-green-500 animate-pulse' : status === 'breakpoint' ? 'bg-yellow-500' : 'bg-muted'}`} />
        <span className={`font-mono ${statusColors[status]}`}>{statusLabels[status]}</span>
      </div>

      {/* Breakpoint Alert */}
      {breakpoint && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-50 border border-yellow-200 text-yellow-800">
          <span>⏸</span>
          <span>{breakpoint.at}: {breakpoint.reason}</span>
        </div>
      )}

      {/* Token Usage */}
      {tokens && tokens.totalTokens > 0 && (
        <div className="flex items-center gap-3 text-muted">
          <span>Token: {tokens.totalTokens.toLocaleString()}</span>
          <span>P: {tokens.totalPrompt.toLocaleString()}</span>
          <span>C: {tokens.totalCompletion.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
