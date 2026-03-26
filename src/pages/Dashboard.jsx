import { useNavigate } from 'react-router-dom'
import { TrendingUp, Users, Eye, Heart, Calendar, Clock, ArrowRight, Loader2 } from 'lucide-react'
import { formatNumber, formatDateTime } from '@/lib/utils'
import { useDashboardStats, useSocialPosts, useClients, useAggregateAnalytics } from '@/lib/hooks'
import { useAuth } from '@/components/auth/AuthProvider'
import { useProfile } from '@/lib/hooks'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import PlatformIcon from '@/components/ui/PlatformIcon'

// Static monthly trend data — replace with real analytics when available
const REACH_TREND = [
  { month: 'Sep', reach: 89000 },
  { month: 'Oct', reach: 102000 },
  { month: 'Nov', reach: 118000 },
  { month: 'Dec', reach: 131000 },
  { month: 'Jan', reach: 109000 },
  { month: 'Feb', reach: 127000 },
  { month: 'Mar', reach: 142800 },
]

const PLATFORM_COLORS = {
  instagram: '#E1306C', facebook: '#1877F2', tiktok: '#010101',
  linkedin: '#0A66C2', twitter: '#000', pinterest: '#E60023',
  youtube: '#FF0000', google: '#4285F4',
}

const STATUS_LABEL = {
  scheduled: { label: 'Scheduled', cls: 'status-scheduled' },
  published: { label: 'Published', cls: 'status-published' },
  draft: { label: 'Draft', cls: 'status-draft' },
  failed: { label: 'Failed', cls: 'status-failed' },
}

function StatCard({ label, value, sub, icon: Icon, color, bg, loading }) {
  return (
    <div className="stat-card animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
          <Icon size={20} className={color} />
        </div>
      </div>
      {loading ? (
        <div className="h-8 w-20 bg-[#EDE8DC] animate-pulse rounded-lg mb-1" />
      ) : (
        <p className="text-2xl font-bold text-[#092137] mb-0.5">{value}</p>
      )}
      <p className="text-sm text-[#092137]/50">{label}</p>
      {sub && <p className="text-xs text-[#092137]/40 mt-1">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: profile } = useProfile(user?.id)
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: posts, isLoading: postsLoading } = useSocialPosts({ status: 'scheduled' })
  const { data: clients, isLoading: clientsLoading } = useClients()
  const { data: analytics } = useAggregateAnalytics()

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const upcomingPosts = (posts ?? []).slice(0, 5)

  const statCards = [
    {
      label: 'Total Reach This Month',
      value: analytics?.totals?.reach ? formatNumber(analytics.totals.reach) : '—',
      icon: Eye, color: 'text-wom-gold', bg: 'bg-[#FEF8EC]',
    },
    {
      label: 'Total Engagements',
      value: analytics?.totals?.engagement ? formatNumber(analytics.totals.engagement) : '—',
      icon: Heart, color: 'text-pink-500', bg: 'bg-pink-50',
    },
    {
      label: 'Scheduled Posts',
      value: stats?.scheduledPosts ?? '—',
      sub: `${stats?.publishedPosts ?? 0} published total`,
      icon: Calendar, color: 'text-wom-cyan', bg: 'bg-blue-50',
    },
    {
      label: 'Active Clients',
      value: stats?.activeClients ?? '—',
      sub: `${stats?.connectedAccounts ?? 0} connected accounts`,
      icon: Users, color: 'text-wom-teal', bg: 'bg-green-50',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#092137]">Good morning, {firstName} 👋</h2>
          <p className="text-sm text-[#092137]/50 mt-0.5">Here's what's happening across your clients today.</p>
        </div>
        <button onClick={() => navigate('/compose')} className="btn-primary">+ New Post</button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <StatCard key={card.label} {...card} loading={statsLoading} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Reach chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#EDE8DC] p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-[#092137]">Reach Overview</h3>
              <p className="text-xs text-[#092137]/40 mt-0.5">All clients combined — last 7 months</p>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-wom-teal font-medium">
              <TrendingUp size={15} /> Live analytics coming soon
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={REACH_TREND} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F0A629" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#F0A629" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => formatNumber(v)} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #f0f0f0', fontSize: 13 }} formatter={v => [formatNumber(v), 'Reach']} />
              <Area type="monotone" dataKey="reach" stroke="#F0A629" strokeWidth={2.5} fill="url(#reachGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Engagement by platform */}
        <div className="bg-white rounded-xl border border-[#EDE8DC] p-5">
          <h3 className="font-semibold text-[#092137] mb-1">Engagement by Platform</h3>
          <p className="text-xs text-[#092137]/40 mb-5">All time</p>
          {analytics?.byPlatform?.length ? (
            <div className="space-y-4">
              {analytics.byPlatform.map(({ platform, engagement }) => {
                const total = analytics.byPlatform.reduce((s, p) => s + p.engagement, 0)
                const pct = total > 0 ? Math.round((engagement / total) * 100) : 0
                const color = PLATFORM_COLORS[platform] ?? '#F0A629'
                return (
                  <div key={platform}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium text-[#092137]/80 capitalize">{platform}</span>
                      <span className="text-[#092137]/40">{formatNumber(engagement)}</span>
                    </div>
                    <div className="h-2 bg-[#EDE8DC] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-[#092137]/40">
              <p className="text-sm">No analytics data yet.</p>
              <p className="text-xs mt-1">Publish posts to see engagement.</p>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming posts + Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Upcoming scheduled */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#EDE8DC] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#092137]">Upcoming Scheduled Posts</h3>
            <button onClick={() => navigate('/calendar')} className="text-sm text-wom-gold hover:underline flex items-center gap-1">
              View all <ArrowRight size={14} />
            </button>
          </div>

          {postsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-[#F5F1E9] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : upcomingPosts.length === 0 ? (
            <div className="text-center py-12 text-[#092137]/40">
              <Calendar size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No scheduled posts yet.</p>
              <button onClick={() => navigate('/compose')} className="btn-primary mt-4 text-sm">Create a post</button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingPosts.map(post => {
                const { label, cls } = STATUS_LABEL[post.status] ?? {}
                const clientName = post.clients?.client_name ?? '—'
                return (
                  <div key={post.id} className="flex items-start gap-3 p-3 rounded-lg border border-[#EDE8DC] hover:border-wom-gold/30 hover:bg-[#FEF8EC]/50 transition-colors cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-semibold text-[#092137]/60 bg-[#EDE8DC] px-2 py-0.5 rounded-full">{clientName}</span>
                        {cls && <span className={cls}>{label}</span>}
                        <div className="flex items-center gap-1 ml-auto">
                          {(post.platforms ?? []).map(p => <PlatformIcon key={p} platform={p} size={16} />)}
                        </div>
                      </div>
                      <p className="text-sm text-[#092137]/80 line-clamp-2">{post.content}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="flex items-center gap-1 text-xs text-[#092137]/40 whitespace-nowrap">
                        <Clock size={11} />
                        {post.scheduled_at ? formatDateTime(post.scheduled_at) : '—'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Clients */}
        <div className="bg-white rounded-xl border border-[#EDE8DC] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#092137]">Clients</h3>
            <button onClick={() => navigate('/clients')} className="text-sm text-wom-gold hover:underline flex items-center gap-1">
              Manage <ArrowRight size={14} />
            </button>
          </div>
          {clientsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-10 bg-[#F5F1E9] rounded-xl animate-pulse" />)}
            </div>
          ) : !clients?.length ? (
            <p className="text-sm text-[#092137]/40 text-center py-6">No clients yet.</p>
          ) : (
            <div className="space-y-3">
              {clients.filter(c => c.status === 'Active').slice(0, 6).map(client => (
                <div key={client.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-wom-gold flex items-center justify-center text-[#092137] text-sm font-bold flex-shrink-0">
                    {client.client_name?.charAt(0) ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#092137] truncate">{client.client_name}</p>
                    <p className="text-xs text-[#092137]/40">{client.industry ?? '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 pb-2 flex items-center gap-4 flex-wrap" style={{ borderTop: '1px solid #EDE8DC' }}>
        <p className="text-xs" style={{ color: '#092137', opacity: 0.3 }}>
          © {new Date().getFullYear()} WOM Internal App · Word Of Mouth Agency
        </p>
        <a href="/privacy" className="text-xs hover:underline" style={{ color: '#092137', opacity: 0.4 }}>Privacy Policy</a>
        <a href="/terms"   className="text-xs hover:underline" style={{ color: '#092137', opacity: 0.4 }}>Terms of Service</a>
      </div>
    </div>
  )
}
