import { NavLink, Outlet } from 'react-router-dom'
import { Star, UserPlus, Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/influencers',            label: 'Influencers',      icon: Star,      end: true },
  { to: '/influencers/discover',   label: 'Find Influencers', icon: UserPlus },
  { to: '/influencers/campaigns',  label: 'Campaigns',        icon: Megaphone },
]

export default function InfluencersLayout() {
  return (
    <div className="max-w-7xl mx-auto">
      {/* Sub-tab bar */}
      <div className="flex items-center gap-1 mb-6 border-b border-[#EDE8DC]">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative -mb-px border-b-2',
                isActive
                  ? 'text-[#092137] border-wom-gold'
                  : 'text-[#092137]/50 border-transparent hover:text-[#092137]'
              )
            }
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  )
}
