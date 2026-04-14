import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Link2, CalendarDays,
  PenSquare, BarChart3, Settings, ChevronLeft, ChevronRight,
  Search, TrendingUp, Sparkles, Zap, ClipboardCheck, Globe,
  FileBarChart, ChevronDown, Star, UserPlus, Megaphone, ScanSearch, Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import WorkspaceSwitcher from './WorkspaceSwitcher'
import { useWorkspace } from '@/lib/workspaces'

// ── Social nav ────────────────────────────────────────────────────────────────

const SOCIAL_NAV = [
  { to: '/',                       label: 'Dashboard',          icon: LayoutDashboard, exact: true },
  { to: '/accounts',               label: 'Connected Accounts', icon: Link2 },
  { to: '/calendar',               label: 'Content Calendar',   icon: CalendarDays },
  { to: '/compose',                label: 'Compose & Schedule', icon: PenSquare },
  { to: '/analytics',              label: 'Analytics',          icon: BarChart3 },
  { to: '/influencers',            label: 'Influencers',        icon: Star, exact: true },
  { to: '/influencers/discover',   label: 'Find Influencers',   icon: UserPlus },
  { to: '/influencers/campaigns',  label: 'Campaigns',          icon: Megaphone },
  { to: '/heartbeat',             label: 'Heartbeat Monitor',  icon: Activity },
]

// ── Digital nav ───────────────────────────────────────────────────────────────

const DIGITAL_NAV = [
  { to: '/digital',                label: 'Overview',         icon: Globe,          exact: true },
  { to: '/digital/keywords',       label: 'Keyword Research', icon: Search },
  { to: '/digital/rank-tracker',   label: 'Rank Tracker',     icon: TrendingUp },
  { to: '/digital/rank-tracking',  label: 'Search Console',   icon: BarChart3 },
  { to: '/digital/ai-overview',    label: 'AI Overview',      icon: Sparkles },
  { to: '/digital/site-speed',     label: 'Site Speed',       icon: Zap },
  { to: '/digital/site-audit',     label: 'Site Audit',       icon: ClipboardCheck },
  { to: '/digital/on-page',        label: 'On-Page',          icon: ScanSearch },
]

// ── Reporting grouped nav ─────────────────────────────────────────────────────

// Platform colour dots for sub-items
const PLATFORM_DOT = {
  facebook:          '#1877F2',
  instagram:         '#E1306C',
  tiktok:            '#161616',
  linkedin:          '#0A66C2',
  'google-analytics':'#E37400',
  'search-console':  '#4285F4',
  'google-ads':      '#34A853',
  'meta-ads':        '#1877F2',
  'tiktok-ads':      '#EE1D52',
}

const REPORTING_GROUPS = [
  {
    label: 'Reports',
    items: [
      { to: '/reporting', label: 'All Reports', icon: FileBarChart, exact: true },
    ],
  },
  {
    label: 'Social',
    items: [
      { to: '/reporting/live-data/facebook',  label: 'Facebook',  dot: '#1877F2' },
      { to: '/reporting/live-data/instagram', label: 'Instagram', dot: '#E1306C' },
      { to: '/reporting/live-data/tiktok',    label: 'TikTok',    dot: '#161616' },
      { to: '/reporting/live-data/linkedin',  label: 'LinkedIn',  dot: '#0A66C2' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/reporting/live-data/google-analytics', label: 'Google Analytics', dot: '#E37400' },
      { to: '/reporting/live-data/search-console',   label: 'Search Console',   dot: '#4285F4' },
    ],
  },
  {
    label: 'Paid Ads',
    items: [
      { to: '/reporting/live-data/google-ads', label: 'Google Ads', dot: '#34A853' },
      { to: '/reporting/live-data/meta-ads',   label: 'Meta Ads',   dot: '#1877F2' },
      { to: '/reporting/live-data/tiktok-ads', label: 'TikTok Ads', dot: '#EE1D52' },
    ],
  },
  {
    label: 'SEO',
    items: [
      { to: '/reporting/live-data/rank-tracker', label: 'Rank Tracker', dot: '#0EA5E9' },
    ],
  },
]

// ── Nav components ────────────────────────────────────────────────────────────

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

function ReportingNavGroup({ group, collapsed, activeColor, defaultOpen = true }) {
  const location = useLocation()
  const [open, setOpen] = useState(defaultOpen)

  // Auto-open if any child is active
  const anyActive = group.items.some(item =>
    item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to)
  )

  if (collapsed) {
    // In collapsed mode, just show dots
    return (
      <div className="space-y-0.5">
        {group.items.map(item => {
          if (item.icon) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                title={item.label}
                className={({ isActive }) => cn(
                  'flex items-center justify-center w-full py-2.5 rounded-lg transition-all duration-150',
                  !isActive && 'hover:bg-white/10'
                )}
                style={({ isActive }) =>
                  isActive ? { backgroundColor: activeColor, color: '#092137' } : { color: 'rgba(245,241,233,0.65)' }
                }
              >
                <item.icon size={18} />
              </NavLink>
            )
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              className={({ isActive }) => cn(
                'flex items-center justify-center w-full py-2 rounded-lg transition-all duration-150',
                !isActive && 'hover:bg-white/10'
              )}
            >
              {({ isActive }) => (
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: isActive ? activeColor : item.dot ?? '#666' }}
                />
              )}
            </NavLink>
          )
        })}
      </div>
    )
  }

  return (
    <div>
      {/* Group header — only show toggle for non-Reports groups */}
      {group.label !== 'Reports' && (
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-1.5 mb-0.5 rounded-lg hover:bg-white/5 transition-colors"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(245,241,233,0.35)' }}>
            {group.label}
          </span>
          <ChevronDown
            size={12}
            style={{ color: 'rgba(245,241,233,0.3)' }}
            className={cn('transition-transform duration-150', open ? '' : '-rotate-90')}
          />
        </button>
      )}

      {/* Items */}
      {(open || group.label === 'Reports') && (
        <ul className="space-y-0.5">
          {group.items.map(item => (
            <li key={item.to}>
              {item.icon ? (
                // Top-level item with icon (e.g. All Reports)
                <NavLink
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                    !isActive && 'hover:bg-white/10'
                  )}
                  style={({ isActive }) =>
                    isActive
                      ? { backgroundColor: activeColor, color: '#092137' }
                      : { color: 'rgba(245,241,233,0.65)' }
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon size={18} className="flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              ) : (
                // Sub-item with coloured dot
                <NavLink
                  to={item.to}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 pl-4 pr-3 py-2 rounded-lg text-sm transition-all duration-150',
                    !isActive && 'hover:bg-white/10'
                  )}
                  style={({ isActive }) =>
                    isActive
                      ? { color: '#F5F1E9', fontWeight: 600 }
                      : { color: 'rgba(245,241,233,0.55)' }
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: isActive ? item.dot : (item.dot + '80') }}
                      />
                      <span className="truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const BOTTOM_ITEMS = [
  { to: '/clients',  label: 'Clients',  icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
]

// ── Sidebar ───────────────────────────────────────────────────────────────────

export default function Sidebar({ collapsed, onToggle }) {
  const { workspace } = useWorkspace()

  const isReporting = workspace.id === 'reporting'
  const navItems    = workspace.id === 'social'  ? SOCIAL_NAV
                    : workspace.id === 'digital' ? DIGITAL_NAV
                    : []

  const isComingSoon = !isReporting && navItems.length === 0

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full flex flex-col z-40 transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
      style={{ backgroundColor: '#092137' }}
    >
      <WorkspaceSwitcher collapsed={collapsed} />

      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        {isReporting ? (
          // ── Reporting: grouped expandable nav ──
          <div className={cn('space-y-3', collapsed ? 'px-1' : 'px-2')}>
            {REPORTING_GROUPS.map(group => (
              <ReportingNavGroup
                key={group.label}
                group={group}
                collapsed={collapsed}
                activeColor={workspace.color}
              />
            ))}
          </div>
        ) : isComingSoon ? (
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
