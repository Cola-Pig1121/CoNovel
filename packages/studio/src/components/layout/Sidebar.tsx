'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconBookshelf, IconNovel, IconAgent, IconStore, IconSettings } from '@/components/icons';

const navItems = [
  { href: '/', icon: IconBookshelf, label: '项目中心' },
  { href: '/books', icon: IconNovel, label: '小说管理' },
  { href: '/agents', icon: IconAgent, label: 'Agent' },
  { href: '/store', icon: IconStore, label: '商店' },
  { href: '/settings', icon: IconSettings, label: '设置' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-14 border-r border-border bg-background flex flex-col items-center py-4 z-50 group hover:w-48 transition-all duration-200">
      {/* Logo */}
      <div className="mb-6 px-2 flex items-center justify-center w-full overflow-hidden">
        <span className="font-serif text-lg tracking-tight whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">CoNovel</span>
        <span className="font-serif text-lg group-hover:hidden">C</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 w-full px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors rounded-sm overflow-hidden whitespace-nowrap ${
                isActive
                  ? 'bg-foreground/10 text-foreground'
                  : 'text-muted hover:text-foreground hover:bg-foreground/5'
              }`}
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-2 w-full overflow-hidden">
        <p className="text-[10px] text-muted/40 text-center whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">v0.1.0</p>
      </div>
    </aside>
  );
}
