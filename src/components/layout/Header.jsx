import { Bell, ChevronDown, LogOut } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { useProfile } from '@/lib/hooks'

const PAGE_TITLES = {
  '/':                        'Dashboard',
  '/clients':                 'Clients',
  '/accounts':                'Connected Accounts',
  '/calendar':                'Content Calendar',
  '/compose':                 'Compose & Schedule',
  '/analytics':               'Analytics',
  '/settings':                'Settings',
  '/digital':                 'Digital Overview',
  '/digital/keywords':        'Keyword Research',
  '/digital/rank-tracker':    'Rank Tracker',
  '/digital/rank-tracking':   'Rank Tracking',
  '/digital/ai-overview':     'AI Overview',
  '/digital/site-speed':      'Site Speed',
  '/digital/site-audit':      'Site Audit',
  '/digital/on-page':         'On-Page Optimisation',
  '/digital/search-console':  'Search Console',
  '/influencers':             'Influencers',
  '/influencers/discover':    'Find Influencers',
  '/influencers/campaigns':   'Campaigns',
}

function UserMenu({ user, profile }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const displayName = profile?.full_name ?? user?.email?.split('@')[0] ?? 'User'
  const initials    = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const shortName   = displayName.split(' ')[0]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-full transition-colors"
        style={{ backgroundColor: '#EDE8DC', border: '2px solid #092137' }}
      >
        {/* Gold avatar */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: '#F0A629', color: '#092137' }}
        >
          {initials}
        </div>
        <span className="text-sm font-medium hidden md:block" style={{ color: '#092137' }}>{shortName}</span>
        <ChevronDown size={14} className="hidden md:block" style={{ color: '#092137' }} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-52 rounded-xl shadow-lg py-1.5 z-50 animate-fade-in"
          style={{ backgroundColor: '#fff', border: '1px solid #EDE8DC' }}
        >
          <div className="px-3.5 py-2.5 mb-1" style={{ borderBottom: '1px solid #EDE8DC' }}>
            <p className="text-sm font-semibold truncate" style={{ color: '#092137' }}>{displayName}</p>
            <p className="text-xs truncate" style={{ color: '#092137', opacity: 0.5 }}>{user?.email}</p>
            {profile?.role && (
              <span
                className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: '#F0A629', color: '#092137' }}
              >
                {profile.role}
              </span>
            )}
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export default function Header({ sidebarWidth }) {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const { data: profile } = useProfile(user?.id)
  // Match exact path first, then check prefix for nested routes (e.g. campaigns/:id)
  const title = PAGE_TITLES[location.pathname]
    ?? Object.entries(PAGE_TITLES).find(([k]) => location.pathname.startsWith(k + '/'))?.[1]
    ?? 'WOM'

  return (
    <header
      className="fixed top-0 right-0 h-16 flex items-center justify-between px-6 z-30 transition-all duration-200"
      style={{
        left: sidebarWidth,
        backgroundColor: '#fff',
        borderBottom: '1px solid #EDE8DC',
      }}
    >
      {/* Page title */}
      <h1
        className="text-lg font-semibold"
        style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#092137' }}
      >
        {title}
      </h1>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button
          className="relative w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
          style={{ backgroundColor: '#F5F1E9', border: '2px solid #EDE8DC', color: '#092137' }}
        >
          <Bell size={17} />
          {/* Gold dot */}
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ backgroundColor: '#F0A629' }}
          />
        </button>

        <UserMenu user={user} profile={profile} />
      </div>
    </header>
  )
}
