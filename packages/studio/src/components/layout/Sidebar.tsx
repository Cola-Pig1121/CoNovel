'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: '仪表盘', labelEn: 'Dashboard' },
  { href: '/books', label: '小说管理', labelEn: 'Books' },
  { href: '/agents', label: 'Agent 监控', labelEn: 'Agents' },
  { href: '/pipeline', label: '写作流水线', labelEn: 'Pipeline' },
  { href: '/evolution', label: '进化追踪', labelEn: 'Evolution' },
  { href: '/settings', label: '系统设置', labelEn: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 border-r border-border bg-background">
      {/* Logo */}
      <div className="px-6 py-8 border-b border-border">
        <h1 className="font-serif text-xl tracking-tight">CoNovel</h1>
        <p className="text-muted text-xs mt-1 font-sans tracking-[0.1em]">
          NOVEL WRITING SYSTEM
        </p>
      </div>

      {/* Navigation */}
      <nav className="px-4 py-6">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    block px-4 py-3 text-sm transition-colors
                    ${isActive
                      ? 'bg-foreground text-background'
                      : 'text-foreground hover:bg-foreground/5'
                    }
                  `}
                >
                  <span className="font-sans">{item.label}</span>
                  <span className="block text-xs text-muted mt-0.5 font-mono">
                    {item.labelEn}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="absolute bottom-0 left-0 right-0 px-6 py-6 border-t border-border">
        <div className="text-xs text-muted">
          <p className="font-sans">CoNovel v0.1.0</p>
          <p className="font-mono mt-1">Powered by Vercel Eve</p>
        </div>
      </div>
    </aside>
  );
}
