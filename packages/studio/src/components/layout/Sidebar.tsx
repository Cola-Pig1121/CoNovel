'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { IconBookshelf, IconNovel, IconAgent, IconStore, IconSettings, IconChevronLeft, IconChevronRight } from '@/components/icons';

const navItems = [
  { href: '/', icon: IconBookshelf, label: '项目中心' },
  { href: '/books', icon: IconNovel, label: '小说管理' },
  { href: '/agents', icon: IconAgent, label: 'Agent' },
  { href: '/store', icon: IconStore, label: '商店' },
  { href: '/settings', icon: IconSettings, label: '设置' },
];

export function Sidebar({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const width = expanded ? 'w-44' : 'w-14';

  return (
    <aside className={`fixed left-0 top-0 bottom-0 ${width} border-r border-border bg-background flex flex-col z-50 transition-all duration-200`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-border min-h-[56px]">
        {expanded && <span className="font-serif text-base tracking-tight truncate">CoNovel</span>}
        {!expanded && <span className="font-serif text-base mx-auto">C</span>}
        <button
          onClick={onToggle}
          className="text-muted hover:text-foreground transition-colors p-1 -mr-1"
          title={expanded ? '收起' : '展开'}
        >
          {expanded ? <IconChevronLeft size={14} /> : <IconChevronRight size={14} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors rounded-sm ${
                isActive
                  ? 'bg-foreground/10 text-foreground'
                  : 'text-muted hover:text-foreground hover:bg-foreground/5'
              }`}
            >
              <Icon size={18} className="flex-shrink-0" />
              {expanded && <span className="text-xs whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-border">
        {expanded && <p className="text-[10px] text-muted/40 text-center">v0.1.0</p>}
      </div>
    </aside>
  );
}
