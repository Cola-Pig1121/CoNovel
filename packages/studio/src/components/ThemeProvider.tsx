'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

/**
 * Resolves the effective theme: if user chose 'system', follow OS preference.
 */
function resolveTheme(preference: Theme): 'light' | 'dark' {
  if (preference === 'system') {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return preference;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem('conovel-theme') as Theme) || 'system';
    const resolved = resolveTheme(saved);
    document.documentElement.setAttribute('data-theme', resolved);

    // Listen for OS theme changes when in 'system' mode
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const current = (localStorage.getItem('conovel-theme') as Theme) || 'system';
      if (current === 'system') {
        const resolved = resolveTheme('system');
        document.documentElement.setAttribute('data-theme', resolved);
      }
    };
    mq.addEventListener('change', handleChange);

    setMounted(true);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  if (!mounted) return <>{children}</>;
  return <>{children}</>;
}

/** Set theme preference: 'light', 'dark', or 'system' (auto-detect). */
export function setTheme(theme: Theme) {
  localStorage.setItem('conovel-theme', theme);
  const resolved = resolveTheme(theme);
  document.documentElement.setAttribute('data-theme', resolved);
}

/** Get current theme preference. */
export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  return (localStorage.getItem('conovel-theme') as Theme) || 'system';
}
