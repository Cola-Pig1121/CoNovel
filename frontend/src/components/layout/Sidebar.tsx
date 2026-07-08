import { Link, useLocation } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'

// ---------------------------------------------------------------------------
// Navigation items
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { path: '/', label: '仪表盘', icon: '□' },
  { path: '/editor', label: '编辑器', icon: '▤' },
  { path: '/pipeline', label: '流水线', icon: '▷' },
  { path: '/workflow', label: '工作流', icon: '⬡' },
  { path: '/agents', label: '智能体', icon: '◎' },
  { path: '/store', label: '商店', icon: '◫' },
  { path: '/settings', label: '设置', icon: '⚙' },
  { path: '/evolution', label: '演化', icon: '⟡' },
] as const

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export default function Sidebar() {
  const location = useLocation()
  const { sidebarExpanded, toggleSidebar } = useUIStore()

  return (
    <aside
      className={`shrink-0 border-r border-border flex flex-col bg-background transition-all duration-200 ${
        sidebarExpanded ? 'w-56' : 'w-14'
      }`}
    >
      {/* Brand + Toggle */}
      <button
        onClick={toggleSidebar}
        className="border-b border-border flex items-center gap-3 hover:bg-foreground/[0.02] transition-colors cursor-pointer"
        title={sidebarExpanded ? '收起侧边栏' : '展开侧边栏'}
      >
        <div className={`py-4 flex items-center gap-3 ${sidebarExpanded ? 'px-4 w-full' : 'w-full justify-center'}`}>
          <img src="/favicon.svg" alt="CoNovel" className="w-6 h-6 shrink-0" />
          {sidebarExpanded && (
            <span className="font-serif text-lg tracking-tight">CoNovel</span>
          )}
        </div>
      </button>

      {/* Navigation */}
      <nav className="flex-1 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path)

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2.5 text-xs transition-colors border-l-2 ${
                isActive
                  ? 'border-foreground text-foreground bg-foreground/[0.03]'
                  : 'border-transparent text-muted hover:text-foreground hover:bg-foreground/[0.02]'
              } ${sidebarExpanded ? '' : 'justify-center px-0'}`}
              title={item.label}
            >
              <span className="text-sm shrink-0">{item.icon}</span>
              {sidebarExpanded && (
                <span className="text-[10px] uppercase tracking-[0.2em]">
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      {sidebarExpanded && (
        <div className="px-4 py-3 border-t border-border">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted">
            多智能体叙事
          </p>
        </div>
      )}
    </aside>
  )
}
