import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TrendingUp, Eye, Heart, FileText, Download, Loader2 } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useClients, useSocialPosts, useAggregateAnalytics } from '@/lib/hooks'
import { formatNumber, cn } from '@/lib/utils'
import PlatformIcon from '@/components/ui/PlatformIcon'

const DATE_RANGES = ['Last 7 days', 'Last 30 days', 'Last 90 days', 'Last 12 months']

const PLATFORM_COLORS = {
  instagram: '#E1306C', facebook: '#1877F2', tiktok: '#010101',
  linkedin: '#0A66C2', twitter: '#000', pinterest: '#E60023',
  youtube: '#FF0000', google: '#4285F4',
}

const POST_TYPE_DATA = [
  { name: 'Image', value: 48, color: '#F0A629' },
  { name: 'Video', value: 32, color: '#0693e3' },
  { name: 'Carousel', value: 14, color: '#00d084' },
  { name: 'Text', value: 6, color: '#f97316' },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-medium">{formatNumber(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function Analytics() {
  const [searchParams] = useSearchParams()
  const [dateRange, setDateRange] = useState('Last 30 days')
  const [clientFilter, setClientFilter] = useState(searchParams.get('client') ?? 'all')

  const { data: clients } = useClients()
  const { data: posts, isLoading: postsLoading } = useSocialPosts({ clientId: clientFilter !== 'all' ? clientFilter : undefined })
  const { data: analytics, isLoading: analyticsLoading } = useAggregateAnalytics(clientFilter !== 'all' ? clientFilter : undefined)

  const publishedPosts = (posts ?? []).filter(p => p.status === 'published')
  const scheduledPosts = (posts ?? []).filter(p => p.status === 'scheduled')
  const totalPosts = (posts ?? []).length

  // Per-client post counts for the performance table
  const clientPostCounts = {}
  ;(posts ?? []).forEach(p => {
    if (!clientPostCounts[p.client_id]) clientPostCounts[p.client_id] = { posts: 0, name: p.clients?.client_name ?? '—' }
    clientPostCounts[p.client_id].posts++
  })
  const clientPerf = Object.entries(clientPostCounts).map(([id, v]) => ({ id, ...v }))

  const statCards = [
    { label: 'Total Reach', value: analytics?.totals?.reach ? formatNumber(analytics.totals.reach) : '—', icon: Eye, color: 'text-wom-purple', bg: 'bg-[#FEF8EC]' },
    { label: 'Total Engagements', value: analytics?.totals?.engagement ? formatNumber(analytics.totals.engagement) : '—', icon: Heart, color: 'text-pink-500', bg: 'bg-pink-50' },
    { label: 'Avg. Engagement Rate', value: analytics?.totals?.reach && analytics.totals.engagement ? `${((analytics.totals.engagement / analytics.totals.reach) * 100).toFixed(1)}%` : '—', icon: TrendingUp, color: 'text-wom-teal', bg: 'bg-green-50' },
    { label: 'Total Posts', value: totalPosts || '—', sub: `${publishedPosts.length} published · ${scheduledPosts.length} scheduled`, icon: FileText, color: 'text-wom-cyan', bg: 'bg-blue-50' },
  ]

  const isLoading = postsLoading || analyticsLoading

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={clientFilter}
          onChange={e => setClientFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-full px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-wom-purple/30"
        >
          <option value="all">All Clients</option>
          {(clients ?? []).map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
        </select>

        <div className="flex bg-gray-100 rounded-full p-0.5 gap-0.5">
          {DATE_RANGES.map(r => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={cn('px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                dateRange === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {r}
            </button>
          ))}
        </div>

        <button className="btn-secondary ml-auto text-sm"><Download size={15} /> Export Report</button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', bg)}>
              <Icon size={20} className={color} />
            </div>
            {isLoading ? <div className="h-7 w-16 bg-gray-100 animate-pulse rounded mb-1" /> : <p className="text-2xl font-bold text-gray-900 mb-0.5">{value}</p>}
            <p className="text-sm text-gray-500">{label}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
          <Loader2 size={20} className="animate-spin" /> Loading analytics...
        </div>
      ) : (
        <>
          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Platform engagement bar chart */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-1">Engagements by Platform</h3>
              <p className="text-xs text-gray-400 mb-5">All time — from published posts</p>
              {analytics?.byPlatform?.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={analytics.byPlatform} margin={{ top: 0, right: 0, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="platform" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={formatNumber} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="engagement" name="Engagements" radius={[6, 6, 0, 0]}>
                      {analytics.byPlatform.map((entry, idx) => (
                        <Cell key={idx} fill={PLATFORM_COLORS[entry.platform] ?? '#F0A629'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-gray-400">
                  <div className="text-center">
                    <p className="text-sm">No analytics data yet.</p>
                    <p className="text-xs mt-1">Publish posts to see engagement by platform.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Post type pie */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-1">Content Types</h3>
              <p className="text-xs text-gray-400 mb-4">By post format (estimated)</p>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={POST_TYPE_DATA} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {POST_TYPE_DATA.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={v => [`${v}%`, 'Share']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {POST_TYPE_DATA.map(({ name, value, color }) => (
                  <div key={name} className="flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-gray-600 flex-1">{name}</span>
                    <span className="font-semibold text-gray-900">{value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Posts & client performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Client post performance */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-1">Posts by Client</h3>
              <p className="text-xs text-gray-400 mb-4">All time</p>
              {clientPerf.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">No posts yet.</p>
              ) : (
                <div className="space-y-3">
                  {clientPerf.sort((a, b) => b.posts - a.posts).map(client => (
                    <div key={client.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-wom-purple flex items-center justify-center text-[#092137] text-xs font-bold flex-shrink-0">
                        {client.name?.charAt(0) ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-700 truncate">{client.name}</p>
                          <span className="text-xs text-gray-400 ml-2">{client.posts} posts</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-wom-purple"
                            style={{ width: `${(client.posts / Math.max(...clientPerf.map(c => c.posts))) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent published posts */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-1">Recently Published</h3>
              <p className="text-xs text-gray-400 mb-4">Latest posts across all clients</p>
              {publishedPosts.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">No published posts yet.</p>
              ) : (
                <div className="space-y-3">
                  {publishedPosts.slice(0, 5).map(post => (
                    <div key={post.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100">
                      <div className="flex gap-1 flex-shrink-0 pt-0.5">
                        {(post.platforms ?? []).slice(0, 2).map(p => <PlatformIcon key={p} platform={p} size={16} />)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 mb-0.5">{post.clients?.client_name ?? '—'}</p>
                        <p className="text-sm text-gray-700 line-clamp-2">{post.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
