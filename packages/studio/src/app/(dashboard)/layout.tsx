'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { SetupScreen } from '@/components/SetupScreen';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [setupDone, setSetupDone] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if setup was already completed in this session
    const done = sessionStorage.getItem('conovel-setup-done');
    if (done) {
      setSetupDone(true);
      setChecking(false);
    } else {
      setChecking(false);
    }
  }, []);

  const handleSetupComplete = () => {
    sessionStorage.setItem('conovel-setup-done', '1');
    setSetupDone(true);
  };

  return (
    <div className="flex min-h-screen">
      {!checking && !setupDone && <SetupScreen onComplete={handleSetupComplete} />}
      <Sidebar />
      <main className="flex-1 ml-64">
        {children}
      </main>
    </div>
  );
}
