'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { CommandPalette } from '@/components/CommandPalette';
import { isTauri, tauriInvoke, waitForTauri } from '@/lib/tauri';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const done = sessionStorage.getItem('conovel-setup-done');
    if (done) {
      setChecking(false);
      return;
    }

    // First launch: check environment in background, then dismiss
    if (isTauri()) {
      waitForTauri(5000).then(ready => {
        if (ready) {
          tauriInvoke<{ allReady: boolean }>('check_environment')
            .then(result => {
              sessionStorage.setItem('conovel-setup-done', '1');
            })
            .catch(() => {})
            .finally(() => setChecking(false));
        } else {
          sessionStorage.setItem('conovel-setup-done', '1');
          setChecking(false);
        }
      });
    } else {
      sessionStorage.setItem('conovel-setup-done', '1');
      setChecking(false);
    }
  }, []);

  return (
    <div className="flex min-h-screen">
      <CommandPalette />
      <Sidebar />
      <main className="flex-1 ml-14 transition-all duration-200 group-hover:ml-48">
        {checking ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-sm text-muted">正在初始化...</p>
          </div>
        ) : children}
      </main>
    </div>
  );
}
