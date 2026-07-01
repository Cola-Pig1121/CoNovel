'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { SetupScreen } from '@/components/SetupScreen';
import { CommandPalette } from '@/components/CommandPalette';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [setupDone, setSetupDone] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const done = sessionStorage.getItem('conovel-setup-done');
    if (done) {
      setSetupDone(true);
    }
    setChecking(false);
  }, []);

  const handleSetupComplete = () => {
    sessionStorage.setItem('conovel-setup-done', '1');
    setSetupDone(true);
  };

  return (
    <div className="flex min-h-screen">
      {!checking && !setupDone && <SetupScreen onComplete={handleSetupComplete} />}
      <CommandPalette />
      <Sidebar />
      <main className="flex-1 ml-14 transition-all duration-200 group-hover:ml-48">
        {children}
      </main>
    </div>
  );
}
