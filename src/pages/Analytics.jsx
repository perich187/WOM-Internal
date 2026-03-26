import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  TrendingUp, Eye, Heart, FileText, Download, Loader2, RefreshCw,
  Users, MessageCircle, Share2, AlertCircle, ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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

const META_PLATFORMS = {
  facebook:  { label: 'Facebook',  color: '#1877F2', bg: '#EBF3FF', emoji: '📘' },
  instagram: { label: 'Instagram', color: '#E1306C', bg: '#FDE8F0', emoji: '📸' },
}

// ── Platform widget ───────────────────────────────────────────────────────────

function StatPill({ label, value, sub }) {
  return (
    <div className="bg-[#F5F1E9] rounded-xl p-4 text-center">
      <p className="text-xs font-semibold text-[#092137]/50 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-[#092137]">{value ?? '—'}</p>
      {sub && <p className="text-xs text-[#092137]/40 mt-0.5">{sub}</p>}
    </div>
  )
}

function PlatformWidget({ platform, data, onReconnect }) {
  const p = META_PLATFORMS[platform]
  if (!p) return null

  if (data?.reconnect_required || data?.error) {
    return (
      <div className="bg-white rounded-xl border border-amber-200 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: p.bg }}>
            {p.emoji}
          </div>
          <h3 className="font-bold text-[#092137]">{p.label}</h3>
        </div>
        <div className="flex items-start gap-3 bg-amber-50 rounded-xl p-4">
          <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              {data.reconnect_required ? 'Token expired — reconnect required' : 'Could not fetch data'}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">{data.error}</p>
            {data.reconnect_required && (
              <button onClick={onReconnect} className="mt-2 text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1">
                Go to Accounts <ArrowRight size={11} />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const metrics = [
    { label: 'Reach',        value: formatNumber(data.reach) },
    { label: 'Impressions',  value: formatNumber(data.impressions) },
    { label: 'Engagements',  value: formatNumber(data.engagement) },
    { label: 'Posts',        value: String(data.posts ?? 0) },
    { label: 'Followers',    value: formatNumber(data.followers), sub: data.newFollowers > 0 ? `+${formatNumber(data.newFollowers)} new` : null },
  ].filter(m => m.value && m.value !== '0')

  return (
    <div className="bg-white rounded-xl border border-[#EDE8DC] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: p.bg }}>
            {p.emoji}
          </div>
          <div>
            <h3 className="font-bold text-[#092137]">{p.label} Performance</h3>
            <div className="w-10 h-0.5 rounded-full mt-1" style={{ backgroundColor: p.color }} />
          </div>
        </div>
        {data.followers > 0 && (
          <div className="text-right">
            <p className="text-xs text-[#092137]/40">Followers</p>
            <p className="font-bold text-[#092137]">{formatNumber(data.followers)}</p>
            {data.newFollowers > 0 && (
              <p className="text-xs text-green-600">+{formatNumber(data.newFollowers)} this period</p>
            )}
          </div>
        )}
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatPill label="Reach"       value={formatNumber(data.reach)} />
        <StatPill label="Impressions" value={formatNumber(data.impressions)} />
        <StatPill label="Engagements" value={formatNumber(data.engagement)} />
        <StatPill label="Posts"       value={String(data.posts ?? 0)} />
      </div>

      {/* Breakdown row */}
      {(data.likes > 0 || data.comments > 0 || data.shares > 0) && (
        <div className="flex items-center gap-5 mt-4 pt-4 border-t border-[#EDE8DC] text-sm text-[#092137]/60">
          {data.likes    > 0 && <span className="flex items-center gap-1.5"><Heart     size={14} className="text-pink-400" /> {formatNumber(data.likes)} likes</span>}
          {data.comments > 0 && <span className="flex items-center gap-1.5"><MessageCircle size={14} className="text-blue-400" /> {formatNumber(data.comments)} comments</span>}
          {data.shares   > 0 && <span className="flex items-center gap-1.5"><Share2    size={14} className="text-green-400" /> {formatNumber(data.shares)} shares</span>}
        </div>
      )}
    </div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function PlatformSkeleton({ label, emoji }) {
  return (
    <div className="bg-white rounded-xl border border-[#EDE8DC] p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-[#EDE8DC] flex items-center justify-center text-lg">{emoji}</div>
        <div>
          <div className="h-4 w-28 bg-[#EDE8DC] rounded mb-1" />
          <div className="h-0.5 w-10 bg-[#EDE8DC] rounded" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[0,1,2,3].map(i => <div key={i} className="bg-[#F5F1E9] rounded-xl p-4"><div className="h-6 bg-[#EDE8DC] rounded mx-auto w-16 mt-3" /></div>)}
      </div>
    </div>
  )
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-[#EDE8DC] rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="font-semibold text-[#092137]/80 mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-[#092137]/50">{p.name}:</span>
          <span className="font-medium">{formatNumber(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Analytics() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [dateRange, setDateRange]   = useState('Last 30 days')
  const [clientFilter, setClientFilter] = useState(searchParams.get('client') ?? 'all')
  const [metaData, setMetaData]     = useState(null)
  const [metaLoading, setMetaLoading] = useState(false)

  const { data: clients }    = useClients()
  const { data: posts, isLoading: postsLoading } = useSocialPosts({
    clientId: clientFilter !== 'all' ? clientFilter : undefined,
  })
  const { data: analytics }  = useAggregateAnalytics(clientFilter !== 'all' ? clientFilter : undefined)

  function getDateBounds() {
    const to   = new Date()
    const from = new Date()
    if (dateRange === 'Last 7 days')    from.setDate(to.getDate() - 7)
    if (dateRange === 'Last 30 days')   from.setDate(to.getDate() - 30)
    if (dateRange === 'Last 90 days')   from.setDate(to.getDate() - 90)
    if (dateRange === 'Last 12 months') from.setFullYear(to.getFullYear() - 1)
    return { dateFrom: from.toISOString().slice(0, 10), dateTo: to.toISOString().slice(0, 10) }
  }

  // Auto-fetch Meta data whenever client or date range changes
  useEffect(() => {
    if (clientFilter === 'all') { setMetaData(null); return }
    fetchMeta()
  }, [clientFilter, dateRange])

  async function fetchMeta(showToast = false) {
    setMetaLoading(true)
    const { dateFrom, dateTo } = getDateBounds()
    try {
      const res  = await fetch(`/api/meta-insights?clientId=${clientFilter}&dateFrom=${dateFrom}&dateTo=${dateTo}`)
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Could not fetch Meta data')
        setMetaData(null)
        return
      }
      setMetaData(data)
      const reconnectNeeded = Object.entries(data).filter(([, v]) => v.reconnect_required).map(([k]) => k)
      if (reconnectNeeded.length > 0) {
        toast.error(`${reconnectNeeded.join(' & ')} token expired`, {
          action: { label: 'Reconnect', onClick: () => navigate('/accounts') },
          duration: 8000,
        })
      }
      if (showToast) {
        const synced = Object.keys(data).filter(k => !data[k].error)
        if (synced.length > 0) toast.success(`Synced ${synced.join(' & ')} data!`)
      }
    } catch {
      toast.error('Failed to reach Meta')
      setMetaData(null)
    } finally {
      setMetaLoading(false)
    }
  }

  const publishedPosts   = (posts ?? []).filter(p => p.status === 'published')
  const scheduledPosts   = (posts ?? []).filter(p => p.status === 'scheduled')

  const clientPostCounts = {}
  ;(posts ?? []).forEach(p => {
    if (!clientPostCounts[p.client_id])
      clientPostCounts[p.client_id] = { posts: 0, name: p.clients?.client_name ?? '—' }
    clientPostCounts[p.client_id].posts++
  })
  const clientPerf = Object.entries(clientPostCounts).map(([id, v]) => ({ id, ...v }))

  const hasMetaData = metaData && Object.keys(metaData).length > 0
  const clientSelected = clientFilter !== 'all'

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={clientFilter}
          onChange={e => setClientFilter(e.target.value)}
          className="text-sm border border-[#EDE8DC] rounded-full px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-wom-gold/30"
        >
          <option value="all">All Clients</option>
          {(clients ?? []).map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
        </select>

        <div className="flex bg-[#EDE8DC] rounded-full p-0.5 gap-0.5">
          {DATE_RANGES.map(r => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={cn('px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                dateRange === r ? 'bg-white text-[#092137] shadow-sm' : 'text-[#092137]/50 hover:text-[#092137]/80'
              )}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {clientSelected && (
            <button
              onClick={() => fetchMeta(true)}
              disabled={metaLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-blue-200 bg-blue-50 text-blue-600 text-sm font-medium hover:bg-blue-100 transition-colors disabled:opacity-40"
            >
              {metaLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {metaLoading ? 'Loading…' : 'Refresh'}
            </button>
          )}
          <button className="btn-secondary text-sm"><Download size={15} /> Export</button>
        </div>
      </div>

      {/* ── Single client view — Meta platform widgets ── */}
      {clientSelected && (
        <>
          {metaLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <PlatformSkeleton label="Facebook" emoji="📘" />
              <PlatformSkeleton label="Instagram" emoji="📸" />
            </div>
          ) : hasMetaData ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {metaData.facebook && (
                <PlatformWidget
                  platform="facebook"
                  data={metaData.facebook}
                  onReconnect={() => navigate('/accounts')}
                />
              )}
              {metaData.instagram && (
                <PlatformWidget
                  platform="instagram"
                  data={metaData.instagram}
                  onReconnect={() => navigate('/accounts')}
                />
              )}
              {!metaData.facebook && !metaData.instagram && (
                <div className="lg:col-span-2 bg-white rounded-xl border border-[#EDE8DC] p-10 text-center">
                  <p className="text-sm text-[#092137]/50">No Facebook or Instagram accounts connected for this client.</p>
                  <button onClick={() => navigate('/accounts')} className="mt-3 text-sm text-blue-600 hover:underline flex items-center gap-1 mx-auto">
                    Connect accounts <ArrowRight size={13} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-[#EDE8DC] p-10 text-center">
              <p className="text-sm text-[#092137]/40">No Meta accounts connected for this client.</p>
              <button onClick={() => navigate('/accounts')} className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                Connect Facebook or Instagram <ArrowRight size={13} />
              </button>
            </div>
          )}

          {/* Post activity for selected client */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-[#EDE8DC] p-5">
              <h3 className="font-semibold text-[#092137] mb-1">Post Activity</h3>
              <p className="text-xs text-[#092137]/40 mb-4">All posts for this client</p>
              <div className="grid grid-cols-3 gap-3">
                <StatPill label="Total"     value={String((posts ?? []).length)} />
                <StatPill label="Published" value={String(publishedPosts.length)} />
                <StatPill label="Scheduled" value={String(scheduledPosts.length)} />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#EDE8DC] p-5">
              <h3 className="font-semibold text-[#092137] mb-1">Recent Posts</h3>
              <p className="text-xs text-[#092137]/40 mb-4">Latest published content</p>
              {publishedPosts.length === 0 ? (
                <p className="text-sm text-[#092137]/40 py-6 text-center">No published posts yet.</p>
              ) : (
                <div className="space-y-3">
                  {publishedPosts.slice(0, 4).map(post => (
                    <div key={post.id} className="flex items-start gap-3 p-3 rounded-xl border border-[#EDE8DC]">
                      <div className="flex gap-1 flex-shrink-0 pt-0.5">
                        {(post.platforms ?? []).slice(0, 2).map(p => <PlatformIcon key={p} platform={p} size={16} />)}
                      </div>
                      <p className="text-sm text-[#092137]/70 line-clamp-2">{post.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── All clients view ── */}
      {!clientSelected && (
        <>
          {/* Prompt */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4 flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={16} className="text-blue-600" />
            </div>
            <p className="text-sm text-blue-700 flex-1">
              Select a client above to see their live <strong>Facebook & Instagram</strong> analytics pulled directly from Meta.
            </p>
          </div>

          {/* Aggregate stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Reach',       value: analytics?.totals?.reach      ? formatNumber(analytics.totals.reach)      : '—', icon: Eye,       color: 'text-wom-gold',   bg: 'bg-[#FEF8EC]' },
              { label: 'Total Engagements', value: analytics?.totals?.engagement  ? formatNumber(analytics.totals.engagement) : '—', icon: Heart,     color: 'text-pink-500',   bg: 'bg-pink-50' },
              { label: 'Engagement Rate',   value: analytics?.totals?.reach && analytics.totals.engagement ? `${((analytics.totals.engagement / analytics.totals.reach) * 100).toFixed(1)}%` : '—', icon: TrendingUp, color: 'text-wom-teal', bg: 'bg-green-50' },
              { label: 'Total Posts',       value: (posts ?? []).length || '—', sub: `${publishedPosts.length} published · ${scheduledPosts.length} scheduled`, icon: FileText, color: 'text-wom-cyan', bg: 'bg-blue-50' },
            ].map(({ label, value, sub, icon: Icon, color, bg }) => (
              <div key={label} className="stat-card">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', bg)}>
                  <Icon size={20} className={color} />
                </div>
                <p className="text-2xl font-bold text-[#092137] mb-0.5">{value}</p>
                <p className="text-sm text-[#092137]/50">{label}</p>
                {sub && <p className="text-xs text-[#092137]/40 mt-1">{sub}</p>}
              </div>
            ))}
          </div>

          {/* Platform engagement + posts by client */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-white rounded-xl border border-[#EDE8DC] p-5">
              <h3 className="font-semibold text-[#092137] mb-1">Engagements by Platform</h3>
              <p className="text-xs text-[#092137]/40 mb-5">From posts with tracked analytics</p>
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
                <div className="flex items-center justify-center h-48 text-[#092137]/30 text-sm text-center">
                  <div>
                    <p>No analytics data yet.</p>
                    <p className="text-xs mt-1">Select a client to see live Meta data.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-[#EDE8DC] p-5">
              <h3 className="font-semibold text-[#092137] mb-1">Posts by Client</h3>
              <p className="text-xs text-[#092137]/40 mb-4">All time</p>
              {clientPerf.length === 0 ? (
                <p className="text-sm text-[#092137]/40 py-8 text-center">No posts yet.</p>
              ) : (
                <div className="space-y-3">
                  {clientPerf.sort((a, b) => b.posts - a.posts).map(client => (
                    <div key={client.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-wom-gold flex items-center justify-center text-[#092137] text-xs font-bold flex-shrink-0">
                        {client.name?.charAt(0) ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-[#092137]/80 truncate">{client.name}</p>
                          <span className="text-xs text-[#092137]/40 ml-2">{client.posts} posts</span>
                        </div>
                        <div className="h-1.5 bg-[#EDE8DC] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-wom-gold"
                            style={{ width: `${(client.posts / Math.max(...clientPerf.map(c => c.posts))) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent published */}
          <div className="bg-white rounded-xl border border-[#EDE8DC] p-5">
            <h3 className="font-semibold text-[#092137] mb-1">Recently Published</h3>
            <p className="text-xs text-[#092137]/40 mb-4">Latest posts across all clients</p>
            {postsLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 size={18} className="animate-spin text-[#092137]/30" /></div>
            ) : publishedPosts.length === 0 ? (
              <p className="text-sm text-[#092137]/40 py-8 text-center">No published posts yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {publishedPosts.slice(0, 6).map(post => (
                  <div key={post.id} className="flex items-start gap-3 p-3 rounded-xl border border-[#EDE8DC]">
                    <div className="flex gap-1 flex-shrink-0 pt-0.5">
                      {(post.platforms ?? []).slice(0, 2).map(p => <PlatformIcon key={p} platform={p} size={16} />)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#092137]/50 mb-0.5">{post.clients?.client_name ?? '—'}</p>
                      <p className="text-sm text-[#092137]/80 line-clamp-2">{post.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
