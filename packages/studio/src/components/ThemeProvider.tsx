'use client';

import { useEffect, useState } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('conovel-theme') as 'light' | 'dark' | null;
    const theme = saved || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    setMounted(true);
  }, []);

  // Avoid flash of wrong theme
  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}

export function setTheme(theme: 'light' | 'dark') {
  localStorage.setItem('conovel-theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
}

export function getTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return (localStorage.getItem('conovel-theme') as 'light' | 'dark') || 'light';
}
