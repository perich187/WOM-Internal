import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Link2, CalendarDays,
  PenSquare, BarChart3, Settings, ChevronLeft, ChevronRight,
  Search, TrendingUp, Sparkles, Zap, ClipboardCheck, Globe,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import WorkspaceSwitcher from './WorkspaceSwitcher'
import { useWorkspace } from '@/lib/workspaces'

const SOCIAL_NAV = [
  { to: '/',          label: 'Dashboard',          icon: LayoutDashboard, exact: true },
  { to: '/clients',   label: 'Clients',             icon: Users },
  { to: '/accounts',  label: 'Connected Accounts',  icon: Link2 },
  { to: '/calendar',  label: 'Content Calendar',    icon: CalendarDays },
  { to: '/compose',   label: 'Compose & Schedule',  icon: PenSquare },
  { to: '/analytics', label: 'Analytics',           icon: BarChart3 },
]

const DIGITAL_NAV = [
  { to: '/digital',                label: 'Overview',          icon: Globe,          exact: true },
  { to: '/digital/keywords',       label: 'Keyword Research',  icon: Search },
  { to: '/digital/rank-tracking',  label: 'Rank Tracking',     icon: TrendingUp },
  { to: '/digital/ai-overview',    label: 'AI Overview',       icon: Sparkles },
  { to: '/digital/site-speed',     label: 'Site Speed',        icon: Zap },
  { to: '/digital/site-audit',     label: 'Site Audit',        icon: ClipboardCheck },
]

const BOTTOM_ITEMS = [
  { to: '/settings', label: 'Settings', icon: Settings },
]

function NavItem({ to, label, icon: Icon, exact, collapsed, activeColor }) {
  return (
    <NavLink
      to={to}
      end={exact}
      title={collapsed ? label : undefined}
      className={({ isActive }) => cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
        collapsed ? 'justify-center' : '',
        !isActive && 'hover:bg-white/10'
      )}
      style={({ isActive }) =>
        isActive
          ? { backgroundColor: activeColor, color: '#092137' }
          : { color: 'rgba(245,241,233,0.65)' }
      }
    >
      <Icon size={18} className="flex-shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  )
}

export default function Sidebar({ collapsed, onToggle }) {
  const { workspace } = useWorkspace()

  const navItems = workspace.id === 'social'  ? SOCIAL_NAV
                 : workspace.id === 'digital' ? DIGITAL_NAV
                 : []

  const isComingSoon = navItems.length === 0

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full flex flex-col z-40 transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
      style={{ backgroundColor: '#092137' }}
    >
      {/* Workspace Switcher (replaces logo) */}
      <WorkspaceSwitcher collapsed={collapsed} />

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        {isComingSoon ? (
          !collapsed && (
            <div className="px-4 py-6 text-center">
              <div
                className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
                style={{ backgroundColor: workspace.color + '25' }}
              >
                {workspace.Icon && <workspace.Icon size={20} style={{ color: workspace.color }} />}
              </div>
              <p className="text-xs font-semibold text-[#F5F1E9]/70">{workspace.label} Workspace</p>
              <p className="text-[10px] text-[#F5F1E9]/30 mt-1">Coming soon</p>
            </div>
          )
        ) : (
          <ul className="space-y-0.5 px-2">
            {navItems.map(({ to, label, icon, exact }) => (
              <li key={to}>
                <NavItem
                  to={to}
                  label={label}
                  icon={icon}
                  exact={exact}
                  collapsed={collapsed}
                  activeColor={workspace.color}
                />
              </li>
            ))}
          </ul>
        )}
      </nav>

      {/* Bottom */}
      <div
        className="py-3 px-2 space-y-0.5 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(245,241,233,0.1)' }}
      >
        {BOTTOM_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
              collapsed ? 'justify-center' : ''
            )}
            style={({ isActive }) =>
              isActive
                ? { backgroundColor: workspace.color, color: '#092137' }
                : { color: 'rgba(245,241,233,0.65)' }
            }
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}

        <button
          onClick={onToggle}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 hover:bg-white/10',
            collapsed ? 'justify-center' : ''
          )}
          style={{ color: 'rgba(245,241,233,0.35)' }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <ChevronRight size={18} />
            : <><ChevronLeft size={18} /><span>Collapse</span></>
          }
        </button>
      </div>
    </aside>
  )
}
