import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Link2, CalendarDays,
  PenSquare, BarChart3, Settings, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import WOMLogoMark from '@/components/ui/WOMLogoMark'

const NAV_ITEMS = [
  { to: '/',          label: 'Dashboard',          icon: LayoutDashboard, exact: true },
  { to: '/clients',   label: 'Clients',             icon: Users },
  { to: '/accounts',  label: 'Connected Accounts',  icon: Link2 },
  { to: '/calendar',  label: 'Content Calendar',    icon: CalendarDays },
  { to: '/compose',   label: 'Compose & Schedule',  icon: PenSquare },
  { to: '/analytics', label: 'Analytics',           icon: BarChart3 },
]

const BOTTOM_ITEMS = [
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ collapsed, onToggle }) {
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full flex flex-col z-40 transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
      style={{ backgroundColor: '#092137' }}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center h-16 px-4 flex-shrink-0',
          collapsed ? 'justify-center' : 'gap-3'
        )}
        style={{ borderBottom: '1px solid rgba(245,241,233,0.1)' }}
      >
        {collapsed
          ? <WOMLogoMark variant="icon"  height={32} white />
          : <WOMLogoMark variant="full"  height={30} white />
        }
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        <ul className="space-y-0.5 px-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={exact}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                    collapsed ? 'justify-center' : '',
                    isActive
                      ? 'text-[#092137]'   /* navy text on gold */
                      : 'hover:bg-white/10'
                  )
                }
                style={({ isActive }) =>
                  isActive
                    ? { backgroundColor: '#F0A629', color: '#092137' }
                    : { color: 'rgba(245,241,233,0.65)' }
                }
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
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
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                collapsed ? 'justify-center' : ''
              )
            }
            style={({ isActive }) =>
              isActive
                ? { backgroundColor: '#F0A629', color: '#092137' }
                : { color: 'rgba(245,241,233,0.65)' }
            }
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}

        {/* Collapse toggle */}
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
