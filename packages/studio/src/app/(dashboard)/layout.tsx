'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { StartupCheck } from '@/components/StartupCheck';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showCheck, setShowCheck] = useState(true);

  return (
    <div className="flex min-h-screen">
      {showCheck && <StartupCheck onDismiss={() => setShowCheck(false)} />}
      <Sidebar />
      <main className="flex-1 ml-64">
        {children}
      </main>
    </div>
  );
}
