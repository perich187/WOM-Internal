import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  RefreshCw, Loader2, AlertCircle, ArrowRight, Plug,
  Heart, MessageCircle, Share2, Eye, Users, MousePointer,
  TrendingUp, TrendingDown, Film, Clock, Globe, Activity,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { toast } from 'sonner'
import { useReportingClient } from '@/lib/reportingClient'
import { formatNumber, cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

const DATE_RANGES = ['Last 7 days', 'Last 30 days', 'Last 90 days', 'Last 12 months']

// ── Platform config ───────────────────────────────────────────────────────────

const PLATFORMS = {
  facebook:           { label: 'Facebook',         emoji: '📘', color: '#1877F2', bg: '#EBF3FF', group: 'Social',    live: true  },
  instagram:          { label: 'Instagram',        emoji: '📸', color: '#E1306C', bg: '#FDE8F0', group: 'Social',    live: true  },
  tiktok:             { label: 'TikTok',           emoji: '🎵', color: '#161616', bg: '#F0F0F0', group: 'Social',    live: false },
  linkedin:           { label: 'LinkedIn',         emoji: '💼', color: '#0A66C2', bg: '#E8F0F9', group: 'Social',    live: false },
  'google-analytics': { label: 'Google Analytics', emoji: '📊', color: '#E37400', bg: '#FEF3E2', group: 'Analytics', live: true  },
  'search-console':   { label: 'Search Console',   emoji: '🔍', color: '#4285F4', bg: '#EAF0FF', group: 'Analytics', live: true  },
  'google-ads':       { label: 'Google Ads',       emoji: '🎯', color: '#34A853', bg: '#E6F4EA', group: 'Paid Ads',  live: false },
  'meta-ads':         { label: 'Meta Ads',         emoji: '📣', color: '#1877F2', bg: '#EBF3FF', group: 'Paid Ads',  live: false },
  'tiktok-ads':       { label: 'TikTok Ads',       emoji: '📱', color: '#EE1D52', bg: '#FDE8EE', group: 'Paid Ads',  live: false },
  'rank-tracker':     { label: 'Rank Tracker',     emoji: '📈', color: '#0EA5E9', bg: '#E0F2FE', group: 'SEO',       live: true  },
}

const META_KEY = { facebook: 'facebook', instagram: 'instagram' }

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function buildChartData(seriesA, seriesB) {
  const map = {}
  for (const pt of (seriesA ?? [])) {
    map[pt.date] = { isoDate: pt.date, date: fmtDate(pt.date), a: pt.value }
  }
  for (const pt of (seriesB ?? [])) {
    if (!map[pt.date]) map[pt.date] = { isoDate: pt.date, date: fmtDate(pt.date) }
    map[pt.date].b = pt.value
  }
  // Sort by ISO date string (YYYY-MM-DD) — not the formatted label
  return Object.values(map).sort((x, y) => (x.isoDate < y.isoDate ? -1 : 1))
}

// ── Small components ──────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, iconColor, trend, trendLabel }) {
  const TrendIcon = trend > 0 ? TrendingUp : TrendingDown
  return (
    <div className="bg-white rounded-xl border border-[#EDE8DC] p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-[#092137]/50 uppercase tracking-wider">{label}</p>
        {Icon && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: iconColor + '20' }}>
            <Icon size={15} style={{ color: iconColor }} />
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-[#092137] leading-none mb-1">{value ?? '—'}</p>
      <div className="flex items-center gap-2 mt-2">
        {sub && <span className="text-xs text-[#092137]/40">{sub}</span>}
        {trend !== undefined && trendLabel && (
          <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full',
            trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
          )}>
            <TrendIcon size={10} />
            {trendLabel}
          </span>
        )}
      </div>
    </div>
  )
}

function ChartCard({ title, sub, children }) {
  return (
    <div className="bg-white rounded-xl border border-[#EDE8DC] p-5">
      <p className="font-semibold text-[#092137] mb-0.5">{title}</p>
      {sub && <p className="text-xs text-[#092137]/40 mb-4">{sub}</p>}
      {children}
    </div>
  )
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-[#EDE8DC] rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="font-semibold text-[#092137]/70 mb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-[#092137]/50">{p.name}:</span>
          <span className="font-semibold">{formatNumber(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => (
          <div key={i} className="bg-white rounded-xl border border-[#EDE8DC] p-5">
            <div className="h-3 w-20 bg-[#EDE8DC] rounded mb-4" />
            <div className="h-8 w-16 bg-[#EDE8DC] rounded mb-2" />
            <div className="h-3 w-12 bg-[#EDE8DC] rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[0,1].map(i => (
          <div key={i} className="bg-white rounded-xl border border-[#EDE8DC] p-5">
            <div className="h-4 w-32 bg-[#EDE8DC] rounded mb-1" />
            <div className="h-3 w-24 bg-[#EDE8DC] rounded mb-6" />
            <div className="h-48 bg-[#F5F1E9] rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Coming soon ───────────────────────────────────────────────────────────────

const COMING_SOON_INFO = {
  tiktok:             'Connect your TikTok Business account to see organic reach, views, likes, comments, and follower growth.',
  linkedin:           'Connect your LinkedIn Company Page to track post impressions, engagement, follower growth, and more.',
  'google-analytics': 'Connect Google Analytics 4 to see sessions, users, bounce rate, and conversion data.',
  'search-console':   'Connect Google Search Console to see impressions, clicks, and keyword rankings.',
  'google-ads':       'Connect Google Ads to track spend, impressions, clicks, CPC, and conversion data.',
  'meta-ads':         'Connect Meta Ads Manager to track Facebook & Instagram ad spend, reach, and ROAS.',
  'tiktok-ads':       'Connect TikTok Ads to see campaign performance, video views, CPM, and conversions.',
}

function ComingSoonCard({ id }) {
  const p = PLATFORMS[id]
  if (!p) return null
  return (
    <div className="bg-white rounded-xl border border-[#EDE8DC] p-10 text-center max-w-lg mx-auto">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4" style={{ backgroundColor: p.bg }}>
        {p.emoji}
      </div>
      <h2 className="text-xl font-bold text-[#092137] mb-2">{p.label}</h2>
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F1E9] text-xs font-semibold text-[#092137]/50 mb-4">
        <Plug size={11} /> API Integration Coming Soon
      </div>
      <p className="text-sm text-[#092137]/60 leading-relaxed mb-6">
        {COMING_SOON_INFO[id] ?? `Connect ${p.label} to start pulling live data into your reports.`}
      </p>
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-not-allowed opacity-50"
        style={{ backgroundColor: p.color }}>
        Connect {p.label}
      </div>
    </div>
  )
}

// ── Error widget ──────────────────────────────────────────────────────────────

function ErrorWidget({ data, p, onReconnect }) {
  return (
    <div className="bg-white rounded-xl border border-amber-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: p.bg }}>
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

// ── Facebook dashboard ────────────────────────────────────────────────────────

function FacebookDashboard({ data, color }) {
  const reachData    = buildChartData(data.series?.reach,       data.series?.impressions)
  const followData   = buildChartData(data.series?.newFollowers, data.series?.lostFollowers)
  const engageData   = buildChartData(data.series?.engagement,   data.series?.pageViews)

  const organicPct = data.reach > 0 ? Math.round((data.organicReach / data.reach) * 100) : 0
  const paidPct    = data.reach > 0 ? Math.round((data.paidReach    / data.reach) * 100) : 0

  const pieData = [
    { name: 'Organic', value: data.organicReach ?? 0, fill: '#34A853' },
    { name: 'Paid',    value: data.paidReach    ?? 0, fill: color },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-5">
      {/* Insights permission warning */}
      {data.insights_error && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Page Insights require a permission re-grant</p>
            <p className="text-xs text-amber-700 mt-0.5">
              The connected account is missing the <code className="bg-amber-100 px-1 rounded">read_insights</code> permission.
              Go to <strong>Accounts</strong>, click <strong>Reconnect</strong> on this client's Facebook account,
              and re-authorise — then refresh this page.
            </p>
            <p className="text-xs text-amber-600 mt-1 font-mono opacity-70">{data.insights_error}</p>
          </div>
        </div>
      )}

      {/* KPI row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Page Followers" value={formatNumber(data.followers)} icon={Users} iconColor={color}
          sub={data.newFollowers > 0 ? `+${formatNumber(data.newFollowers)} new` : undefined} />
        <KpiCard label="Reach" value={formatNumber(data.reach)} icon={Eye} iconColor={color}
          sub={`${organicPct}% organic`} />
        <KpiCard label="Impressions" value={formatNumber(data.impressions)} icon={TrendingUp} iconColor={color} />
        <KpiCard label="Page Views" value={formatNumber(data.pageViews)} icon={MousePointer} iconColor={color} />
      </div>

      {/* KPI row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Engagements" value={formatNumber(data.engagement)} icon={Heart} iconColor="#E1306C" />
        <KpiCard label="Video Views"    value={formatNumber(data.videoViews)}  icon={Film}  iconColor="#7C3AED" />
        <KpiCard label="New Followers"  value={formatNumber(data.newFollowers)} icon={TrendingUp}  iconColor="#34A853" />
        <KpiCard label="Lost Followers" value={formatNumber(data.lostFollowers)} icon={TrendingDown} iconColor="#EF4444" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Reach & Impressions" sub="Daily unique reach vs total impressions">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={reachData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="fbReach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fbImpr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#94A3B8" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#94A3B8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE8" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={formatNumber} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="a" name="Reach"       stroke={color}    fill="url(#fbReach)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="b" name="Impressions" stroke="#94A3B8"  fill="url(#fbImpr)"  strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Follower Growth" sub="New followers gained vs lost per day">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={followData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE8" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="a" name="New Followers"  fill="#34A853" radius={[4,4,0,0]} />
              <Bar dataKey="b" name="Lost Followers" fill="#EF4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard title="Engagement & Page Views" sub="Daily engaged users vs page views">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={engageData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="fbEng" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#E1306C" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#E1306C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE8" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="a" name="Engagements" stroke="#E1306C" fill="url(#fbEng)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="b" name="Page Views"  stroke="#7C3AED" fill="none"         strokeWidth={2} dot={false} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Organic vs Paid split */}
        <ChartCard title="Organic vs Paid Reach" sub="Reach breakdown for this period">
          {pieData.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatNumber(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-5 mt-1">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                    <span className="text-xs text-[#092137]/60">{d.name}</span>
                    <span className="text-xs font-bold text-[#092137]">{formatNumber(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-[#092137]/30">No data</div>
          )}
        </ChartCard>

        {/* Post engagement breakdown */}
        <ChartCard title="Post Engagement" sub="Total interactions on posts">
          <div className="space-y-3 mt-2">
            {[
              { label: 'Likes / Reactions', value: data.likes,    icon: Heart,         color: '#E1306C' },
              { label: 'Comments',          value: data.comments, icon: MessageCircle, color: '#1877F2' },
              { label: 'Shares',            value: data.shares,   icon: Share2,        color: '#34A853' },
              { label: 'Video Views',       value: data.videoViews, icon: Film,        color: '#7C3AED' },
            ].map(({ label, value, icon: Icon, color: c }) => {
              const total = (data.likes ?? 0) + (data.comments ?? 0) + (data.shares ?? 0) + (data.videoViews ?? 0)
              const pct   = total > 0 ? Math.round(((value ?? 0) / total) * 100) : 0
              return (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: c + '20' }}>
                    <Icon size={13} style={{ color: c }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#092137]/60">{label}</span>
                      <span className="text-xs font-bold text-[#092137]">{formatNumber(value ?? 0)}</span>
                    </div>
                    <div className="h-1.5 bg-[#F5F1E9] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: c }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ChartCard>
      </div>

      {/* Posts summary */}
      <div className="bg-white rounded-xl border border-[#EDE8DC] p-5">
        <p className="font-semibold text-[#092137] mb-4">Posts Summary</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-[#F5F1E9] rounded-xl">
            <p className="text-3xl font-bold text-[#092137]">{data.posts ?? 0}</p>
            <p className="text-xs text-[#092137]/50 mt-1 font-medium uppercase tracking-wider">Posts Published</p>
          </div>
          <div className="text-center p-4 bg-[#F5F1E9] rounded-xl">
            <p className="text-3xl font-bold text-[#092137]">{formatNumber(data.postEngagements ?? 0)}</p>
            <p className="text-xs text-[#092137]/50 mt-1 font-medium uppercase tracking-wider">Post Engagements</p>
          </div>
          <div className="text-center p-4 bg-[#F5F1E9] rounded-xl">
            <p className="text-3xl font-bold text-[#092137]">
              {data.posts > 0 ? formatNumber(Math.round((data.engagement ?? 0) / data.posts)) : '—'}
            </p>
            <p className="text-xs text-[#092137]/50 mt-1 font-medium uppercase tracking-wider">Avg Engagement/Post</p>
          </div>
          <div className="text-center p-4 bg-[#F5F1E9] rounded-xl">
            <p className="text-3xl font-bold text-[#092137]">
              {data.reach > 0 ? `${((data.engagement / data.reach) * 100).toFixed(2)}%` : '—'}
            </p>
            <p className="text-xs text-[#092137]/50 mt-1 font-medium uppercase tracking-wider">Engagement Rate</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Instagram dashboard ───────────────────────────────────────────────────────

function InstagramDashboard({ data, color }) {
  const reachData   = buildChartData(data.series?.reach,        data.series?.impressions)
  const profileData = buildChartData(data.series?.profileViews, data.series?.websiteClicks)

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Followers"     value={formatNumber(data.followers)}    icon={Users}         iconColor={color} />
        <KpiCard label="Reach"         value={formatNumber(data.reach)}        icon={Eye}           iconColor={color} />
        <KpiCard label="Impressions"   value={formatNumber(data.impressions)}  icon={TrendingUp}    iconColor={color} />
        <KpiCard label="Profile Views" value={formatNumber(data.profileViews)} icon={MousePointer}  iconColor={color} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Engagements"    value={formatNumber(data.engagement)}    icon={Heart}       iconColor="#E1306C" />
        <KpiCard label="Posts"          value={String(data.posts ?? 0)}          icon={Film}        iconColor="#7C3AED" />
        <KpiCard label="Website Clicks" value={formatNumber(data.websiteClicks)} icon={MousePointer} iconColor="#34A853" />
        <KpiCard label="Likes + Comments"
          value={formatNumber((data.likes ?? 0) + (data.comments ?? 0))}
          icon={Heart} iconColor="#E1306C"
          sub={`${formatNumber(data.likes ?? 0)} likes · ${formatNumber(data.comments ?? 0)} comments`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Reach & Impressions" sub="Daily unique reach vs total impressions">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={reachData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="igReach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE8" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={formatNumber} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="a" name="Reach"       stroke={color}   fill="url(#igReach)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="b" name="Impressions" stroke="#94A3B8" fill="none"          strokeWidth={2} dot={false} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Profile Views & Website Clicks" sub="Daily profile traffic">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={profileData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="igProfile" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#7C3AED" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE8" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="a" name="Profile Views"  stroke="#7C3AED" fill="url(#igProfile)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="b" name="Website Clicks" stroke="#34A853" fill="none"            strokeWidth={2} dot={false} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Engagement breakdown + summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Engagement Breakdown" sub="Total interactions on posts">
          <div className="space-y-3 mt-2">
            {[
              { label: 'Likes',    value: data.likes,    icon: Heart,         color: '#E1306C' },
              { label: 'Comments', value: data.comments, icon: MessageCircle, color: color },
            ].map(({ label, value, icon: Icon, color: c }) => {
              const total = (data.likes ?? 0) + (data.comments ?? 0)
              const pct   = total > 0 ? Math.round(((value ?? 0) / total) * 100) : 0
              return (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: c + '20' }}>
                    <Icon size={13} style={{ color: c }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#092137]/60">{label}</span>
                      <span className="text-xs font-bold text-[#092137]">{formatNumber(value ?? 0)}</span>
                    </div>
                    <div className="h-1.5 bg-[#F5F1E9] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ChartCard>

        <ChartCard title="Performance Summary" sub="Key ratios for this period">
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="text-center p-4 bg-[#F5F1E9] rounded-xl">
              <p className="text-2xl font-bold text-[#092137]">{data.posts ?? 0}</p>
              <p className="text-xs text-[#092137]/50 mt-1 uppercase tracking-wider font-medium">Posts</p>
            </div>
            <div className="text-center p-4 bg-[#F5F1E9] rounded-xl">
              <p className="text-2xl font-bold text-[#092137]">
                {data.reach > 0 ? `${((data.engagement / data.reach) * 100).toFixed(2)}%` : '—'}
              </p>
              <p className="text-xs text-[#092137]/50 mt-1 uppercase tracking-wider font-medium">Engagement Rate</p>
            </div>
            <div className="text-center p-4 bg-[#F5F1E9] rounded-xl">
              <p className="text-2xl font-bold text-[#092137]">
                {data.posts > 0 ? formatNumber(Math.round((data.reach ?? 0) / data.posts)) : '—'}
              </p>
              <p className="text-xs text-[#092137]/50 mt-1 uppercase tracking-wider font-medium">Avg Reach/Post</p>
            </div>
            <div className="text-center p-4 bg-[#F5F1E9] rounded-xl">
              <p className="text-2xl font-bold text-[#092137]">{formatNumber(data.websiteClicks ?? 0)}</p>
              <p className="text-xs text-[#092137]/50 mt-1 uppercase tracking-wider font-medium">Website Clicks</p>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  )
}

// ── Google Analytics dashboard ────────────────────────────────────────────────

function fmtDuration(sec) {
  if (!sec) return '0s'
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function NotConnectedGoogle({ clientId }) {
  const p = PLATFORMS['google-analytics']
  return (
    <div className="bg-white rounded-xl border border-[#EDE8DC] p-10 text-center max-w-lg mx-auto">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4" style={{ backgroundColor: p.bg }}>
        {p.emoji}
      </div>
      <h2 className="text-xl font-bold text-[#092137] mb-2">Connect Google Analytics</h2>
      <p className="text-sm text-[#092137]/60 leading-relaxed mb-6">
        Connect your Google account to pull in sessions, users, bounce rate, traffic channels, and top pages.
      </p>
      <a
        href={`/api/gsc-oauth?action=auth&clientId=${clientId}&from=ga4`}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
        style={{ backgroundColor: p.color }}
      >
        <Globe size={15} /> Connect Google Analytics
      </a>
    </div>
  )
}

function GA4PropertySelectorCard({ properties, onSelect }) {
  const [selected, setSelected] = useState(properties[0]?.id ?? '')
  return (
    <div className="bg-white rounded-xl border border-[#EDE8DC] p-8 max-w-lg mx-auto text-center">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 bg-[#FEF3E2]">📊</div>
      <h2 className="text-lg font-bold text-[#092137] mb-2">Select a GA4 Property</h2>
      <p className="text-sm text-[#092137]/60 mb-5">Choose the Google Analytics 4 property to use for this client.</p>
      <select
        value={selected}
        onChange={e => setSelected(e.target.value)}
        className="w-full text-sm border border-[#EDE8DC] rounded-xl px-4 py-2.5 text-[#092137] bg-white mb-4"
      >
        {properties.map(p => (
          <option key={p.id} value={p.id}>{p.name} — {p.accountName}</option>
        ))}
      </select>
      <button
        onClick={() => onSelect(selected)}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
        style={{ backgroundColor: '#E37400' }}
      >
        Use this property
      </button>
    </div>
  )
}

const CHANNEL_COLORS = ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#7C3AED', '#00ACC1', '#FF6D00', '#0097A7']

function GoogleAnalyticsDashboard({ data, info, onSaveProperty, color }) {
  const sessionData = (data.series ?? [])
    .map(r => ({ isoDate: r.date, date: fmtDate(r.date), sessions: r.sessions, users: r.users, pageviews: r.pageviews }))
    .sort((a, b) => (a.isoDate < b.isoDate ? -1 : 1))

  const devicePie = (data.devices ?? []).map((d, i) => ({
    name: d.device,
    value: d.sessions,
    fill: ['#4285F4', '#34A853', '#FBBC05'][i] ?? '#94A3B8',
  }))

  return (
    <div className="space-y-5">
      {/* Property selector */}
      {info?.ga4Properties?.length > 1 && (
        <div className="bg-white rounded-xl border border-[#EDE8DC] p-4 flex items-center gap-3">
          <Globe size={15} style={{ color }} />
          <span className="text-sm font-medium text-[#092137]">Property:</span>
          <select
            value={info.ga4PropertyId ?? ''}
            onChange={e => onSaveProperty(e.target.value)}
            className="flex-1 text-sm border border-[#EDE8DC] rounded-lg px-3 py-1.5 text-[#092137] bg-white"
          >
            {info.ga4Properties.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.accountName})</option>
            ))}
          </select>
        </div>
      )}

      {/* KPI row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Sessions"  value={formatNumber(data.totals?.sessions)} icon={Activity}   iconColor={color} />
        <KpiCard label="Users"     value={formatNumber(data.totals?.users)}    icon={Users}      iconColor={color} />
        <KpiCard label="New Users" value={formatNumber(data.totals?.newUsers)} icon={TrendingUp} iconColor="#34A853" />
      </div>

      {/* KPI row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Pageviews"    value={formatNumber(data.totals?.pageviews)} icon={Eye} iconColor={color} />
        <KpiCard label="Bounce Rate"  value={`${Math.round((data.totals?.bounceRate ?? 0) * 100)}%`} icon={MousePointer} iconColor="#EF4444" />
        <KpiCard label="Avg Duration" value={fmtDuration(data.totals?.avgDuration)} icon={Clock} iconColor="#7C3AED" />
      </div>

      {/* Sessions over time */}
      <ChartCard title="Sessions & Users Over Time" sub="Daily active sessions and users">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={sessionData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="ga4Sess" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.15} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE8" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={formatNumber} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="sessions" name="Sessions" stroke={color}    fill="url(#ga4Sess)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="users"    name="Users"    stroke="#94A3B8"  fill="none"          strokeWidth={2} dot={false} strokeDasharray="4 2" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Channels + Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Traffic Channels" sub="Sessions by channel">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.channels ?? []} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE8" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={formatNumber} />
              <YAxis type="category" dataKey="channel" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={75} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="sessions" name="Sessions" radius={[0, 4, 4, 0]}>
                {(data.channels ?? []).map((_, i) => (
                  <Cell key={i} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Device Breakdown" sub="Sessions by device type">
          {devicePie.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={devicePie} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                    {devicePie.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={v => formatNumber(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-1 flex-wrap justify-center">
                {devicePie.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                    <span className="text-xs text-[#092137]/60 capitalize">{d.name}</span>
                    <span className="text-xs font-bold text-[#092137]">{formatNumber(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-[#092137]/30">No data</div>
          )}
        </ChartCard>
      </div>

      {/* Top pages */}
      <ChartCard title="Top Pages" sub="Most visited pages for this period">
        <div className="mt-2 space-y-2">
          {(data.topPages ?? []).map((page, i) => {
            const maxViews = data.topPages[0]?.pageviews ?? 1
            const pct = Math.round((page.pageviews / maxViews) * 100)
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#092137]/30 w-5 text-right flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-[#092137] font-medium truncate max-w-[65%]" title={page.title || page.path}>
                      {page.title || page.path}
                    </span>
                    <span className="text-xs font-bold text-[#092137]">{formatNumber(page.pageviews)}</span>
                  </div>
                  <div className="h-1.5 bg-[#F5F1E9] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <p className="text-xs text-[#092137]/40 mt-0.5 truncate">{page.path}</p>
                </div>
              </div>
            )
          })}
          {(!data.topPages || data.topPages.length === 0) && (
            <div className="text-center py-6 text-sm text-[#092137]/30">No page data available</div>
          )}
        </div>
      </ChartCard>
    </div>
  )
}

// ── Search Console dashboard ──────────────────────────────────────────────────

function GSCSiteSelectorCard({ sites, onSelect }) {
  const [selected, setSelected] = useState(sites[0] ?? '')
  return (
    <div className="bg-white rounded-xl border border-[#EDE8DC] p-8 max-w-lg mx-auto text-center">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 bg-[#EAF0FF]">🔍</div>
      <h2 className="text-lg font-bold text-[#092137] mb-2">Select a Property</h2>
      <p className="text-sm text-[#092137]/60 mb-5">Choose the Search Console property to use for this client.</p>
      <select
        value={selected}
        onChange={e => setSelected(e.target.value)}
        className="w-full text-sm border border-[#EDE8DC] rounded-xl px-4 py-2.5 text-[#092137] bg-white mb-4"
      >
        {sites.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <button
        onClick={() => onSelect(selected)}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
        style={{ backgroundColor: '#4285F4' }}
      >
        Use this property
      </button>
    </div>
  )
}

function SearchConsoleDashboard({ data, color }) {
  const queries = data.queries ?? []
  const pages   = data.pages   ?? []

  const totalClicks      = queries.reduce((s, r) => s + r.clicks, 0)
  const totalImpressions = queries.reduce((s, r) => s + r.impressions, 0)
  const avgCTR           = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0'
  const avgPosition      = queries.length > 0
    ? (queries.reduce((s, r) => s + r.position, 0) / queries.length).toFixed(1)
    : '—'

  const topQueryChart = queries.slice(0, 8).map(r => ({
    name:   r.keyword.length > 30 ? r.keyword.slice(0, 30) + '…' : r.keyword,
    clicks: r.clicks,
    impressions: r.impressions,
  }))

  return (
    <div className="space-y-5">

      {/* Site + date badge */}
      <div className="flex items-center gap-2 text-xs text-[#092137]/50">
        <Globe size={12} />
        <span className="font-medium">{data.siteUrl}</span>
        <span>·</span>
        <span>{data.dateRange?.start} → {data.dateRange?.end}</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Clicks"      value={formatNumber(totalClicks)}      icon={MousePointer} iconColor={color} />
        <KpiCard label="Total Impressions" value={formatNumber(totalImpressions)}  icon={Eye}          iconColor={color} />
        <KpiCard label="Avg CTR"           value={`${avgCTR}%`}                   icon={TrendingUp}   iconColor="#34A853" />
        <KpiCard label="Avg Position"      value={avgPosition}                    icon={Activity}     iconColor="#FBBC05" />
      </div>

      {/* Top keywords chart */}
      <ChartCard title="Top Keywords by Clicks" sub="Top 8 queries driving traffic">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={topQueryChart} layout="vertical" margin={{ top: 5, right: 20, left: 140, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE8" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={formatNumber} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={135} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="clicks" name="Clicks" fill={color} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Keywords + Pages tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Top keywords table */}
        <ChartCard title="Top Keywords" sub="Ranked by impressions">
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid #EDE8DC' }}>
                  {['Keyword', 'Clicks', 'Impr.', 'CTR', 'Pos.'].map(h => (
                    <th key={h} className="text-left py-2 pr-3 font-semibold text-[#092137]/40 last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queries.slice(0, 10).map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F5F1E9' }}>
                    <td className="py-2 pr-3 text-[#092137] font-medium max-w-[140px] truncate" title={r.keyword}>{r.keyword}</td>
                    <td className="py-2 pr-3 text-[#092137]/70">{formatNumber(r.clicks)}</td>
                    <td className="py-2 pr-3 text-[#092137]/70">{formatNumber(r.impressions)}</td>
                    <td className="py-2 pr-3 text-[#092137]/70">{r.ctr}%</td>
                    <td className="py-2 text-right font-semibold" style={{ color: r.position <= 3 ? '#34A853' : r.position <= 10 ? '#FBBC05' : '#9CA3AF' }}>
                      {r.position}
                    </td>
                  </tr>
                ))}
                {queries.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-[#092137]/30">No keyword data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </ChartCard>

        {/* Top pages table */}
        <ChartCard title="Top Pages" sub="Ranked by clicks">
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid #EDE8DC' }}>
                  {['Page', 'Clicks', 'Impr.', 'CTR', 'Pos.'].map(h => (
                    <th key={h} className="text-left py-2 pr-3 font-semibold text-[#092137]/40 last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pages.slice(0, 10).map((r, i) => {
                  const path = r.page.replace(/^https?:\/\/[^/]+/, '') || '/'
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #F5F1E9' }}>
                      <td className="py-2 pr-3 text-[#092137] font-medium max-w-[140px] truncate" title={r.page}>{path}</td>
                      <td className="py-2 pr-3 text-[#092137]/70">{formatNumber(r.clicks)}</td>
                      <td className="py-2 pr-3 text-[#092137]/70">{formatNumber(r.impressions)}</td>
                      <td className="py-2 pr-3 text-[#092137]/70">{r.ctr}%</td>
                      <td className="py-2 text-right font-semibold" style={{ color: r.position <= 3 ? '#34A853' : r.position <= 10 ? '#FBBC05' : '#9CA3AF' }}>
                        {r.position}
                      </td>
                    </tr>
                  )
                })}
                {pages.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-[#092137]/30">No page data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
    </div>
  )
}

// ── Rank Tracker dashboard ────────────────────────────────────────────────────

const RANK_COLORS = {
  '1-3':   '#10B981',
  '4-10':  '#3B82F6',
  '11-20': '#F59E0B',
  '21-50': '#F97316',
  '51+':   '#EF4444',
}

function RankBadge({ position }) {
  if (!position) return <span className="text-xs text-[#092137]/30">—</span>
  const color = position <= 3 ? '#10B981' : position <= 10 ? '#3B82F6' : position <= 20 ? '#F59E0B' : '#9CA3AF'
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
      style={{ backgroundColor: color }}>
      {position}
    </div>
  )
}

function RankTrackerDashboard({ clientId, dateFrom, dateTo, onRefresh, refreshing }) {
  const [kwData, setKwData]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [clientId, dateFrom, dateTo])

  async function fetchData() {
    setLoading(true)
    try {
      const { data: keywords } = await supabase
        .from('rank_tracker_keywords')
        .select('id, keyword, domain')
        .eq('client_id', clientId)

      if (!keywords?.length) { setKwData({ chartData: [], stats: {}, rows: [] }); return }

      const keywordIds = keywords.map(k => k.id)

      // Results within date range (for chart + change baseline)
      let q = supabase
        .from('rank_tracker_results')
        .select('*')
        .in('keyword_id', keywordIds)
        .order('checked_at', { ascending: true })
      if (dateFrom) q = q.gte('checked_at', dateFrom)
      if (dateTo)   q = q.lte('checked_at', dateTo + 'T23:59:59')
      const { data: results } = await q

      // Overall latest per keyword
      const { data: allResults } = await supabase
        .from('rank_tracker_results')
        .select('*')
        .in('keyword_id', keywordIds)
        .order('checked_at', { ascending: false })

      const latestMap = {}
      for (const r of (allResults ?? [])) {
        if (!latestMap[r.keyword_id]) latestMap[r.keyword_id] = r
      }

      // Earliest in period per keyword (for change calc)
      const earliestMap = {}
      for (const r of (results ?? [])) {
        if (!earliestMap[r.keyword_id]) earliestMap[r.keyword_id] = r
      }

      // Chart: group by check date, count per bucket
      const dateMap = {}
      for (const r of (results ?? [])) {
        const date = r.checked_at.split('T')[0]
        if (!dateMap[date]) dateMap[date] = {}
        if (!dateMap[date][r.keyword_id] || r.checked_at > dateMap[date][r.keyword_id].checked_at) {
          dateMap[date][r.keyword_id] = r
        }
      }

      const chartData = Object.entries(dateMap).sort().map(([date, kwMap]) => {
        const counts = { '1-3': 0, '4-10': 0, '11-20': 0, '21-50': 0, '51+': 0 }
        for (const r of Object.values(kwMap)) {
          const pos = r.position
          if (!pos) continue
          if (pos <= 3)        counts['1-3']++
          else if (pos <= 10)  counts['4-10']++
          else if (pos <= 20)  counts['11-20']++
          else if (pos <= 50)  counts['21-50']++
          else                 counts['51+']++
        }
        const label = new Date(date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
        return { date: label, ...counts }
      })

      // Stats
      const ranked = keywords.filter(k => latestMap[k.id]?.position)
      const totalVolume = keywords.reduce((s, k) => s + (latestMap[k.id]?.volume ?? 0), 0)
      const avgPos = ranked.length
        ? (ranked.reduce((s, k) => s + latestMap[k.id].position, 0) / ranked.length).toFixed(1)
        : null

      // Table rows
      const rows = keywords.map(kw => {
        const latest   = latestMap[kw.id]
        const earliest = earliestMap[kw.id]
        const change   = latest?.position && earliest?.position && latest.id !== earliest.id
          ? earliest.position - latest.position : null
        return { keyword: kw.keyword, position: latest?.position ?? null, change, url: latest?.url ?? null, volume: latest?.volume ?? null, difficulty: latest?.difficulty ?? null }
      }).sort((a, b) => (a.position ?? 999) - (b.position ?? 999))

      setKwData({ chartData, stats: { total: keywords.length, ranked: ranked.length, totalVolume, avgPos }, rows })
    } catch (err) {
      console.error('[RankTrackerDashboard]', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <PageSkeleton />

  if (!kwData || kwData.rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-[#EDE8DC] p-10 text-center">
        <p className="text-sm text-[#092137]/40 mb-1">No keywords tracked for this client yet.</p>
        <p className="text-xs text-[#092137]/30">Add keywords in the Digital → Rank Tracker page, then run a check.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Keywords Tracked" value={kwData.stats.total}             icon={Activity}   iconColor="#0EA5E9" />
        <KpiCard label="Now Ranking"      value={kwData.stats.ranked}            icon={TrendingUp}  iconColor="#10B981" />
        <KpiCard label="Avg. Position"    value={kwData.stats.avgPos ?? '—'}     icon={Globe}       iconColor="#F59E0B" />
        <KpiCard label="Total Volume"     value={kwData.stats.totalVolume ? formatNumber(kwData.stats.totalVolume) : '—'} icon={Eye} iconColor="#8B5CF6" />
      </div>

      {/* Stacked bar chart */}
      {kwData.chartData.length > 0 && (
        <ChartCard title="Ranking Distribution" sub="Number of keywords in each position group per check">
          <div className="flex gap-4 mb-4 flex-wrap">
            {Object.entries(RANK_COLORS).map(([k, c]) => (
              <span key={k} className="flex items-center gap-1.5 text-xs text-[#092137]/60">
                <span className="w-2.5 h-2.5 rounded-sm inline-block flex-shrink-0" style={{ backgroundColor: c }} />
                {k}
              </span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={kwData.chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE8" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              {Object.entries(RANK_COLORS).map(([key, color]) => (
                <Bar key={key} dataKey={key} stackId="a" fill={color} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Keyword table */}
      <div className="bg-white rounded-xl border border-[#EDE8DC] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#EDE8DC]">
          <p className="text-sm font-semibold text-[#092137]">Keywords</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#EDE8DC]">
              <th className="px-5 py-3 text-left text-xs font-semibold text-[#092137]/40 uppercase tracking-wider">Keyword</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-[#092137]/40 uppercase tracking-wider">Rank</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-[#092137]/40 uppercase tracking-wider">Change</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-[#092137]/40 uppercase tracking-wider">Volume</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-[#092137]/40 uppercase tracking-wider">Difficulty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {kwData.rows.map((row, i) => (
              <tr key={i} className="hover:bg-[#F5F1E9]/50 transition-colors">
                <td className="px-5 py-3.5">
                  <p className="text-sm font-medium text-[#092137]">{row.keyword}</p>
                  {row.url && (
                    <a href={row.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline truncate block max-w-[220px]">
                      {row.url.replace(/^https?:\/\/[^/]+/, '') || '/'}
                    </a>
                  )}
                </td>
                <td className="px-5 py-3.5"><RankBadge position={row.position} /></td>
                <td className="px-5 py-3.5">
                  {row.change != null ? (
                    <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full',
                      row.change > 0 ? 'bg-green-100 text-green-700' : row.change < 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                    )}>
                      {row.change > 0 ? '↑' : row.change < 0 ? '↓' : '='}{row.change !== 0 ? Math.abs(row.change) : ''}
                    </span>
                  ) : <span className="text-xs text-[#092137]/30">—</span>}
                </td>
                <td className="px-5 py-3.5 text-sm text-[#092137]/60">{row.volume ? formatNumber(row.volume) : '—'}</td>
                <td className="px-5 py-3.5">
                  {row.difficulty != null ? (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${row.difficulty}%`, backgroundColor: row.difficulty < 30 ? '#10B981' : row.difficulty < 60 ? '#F59E0B' : '#EF4444' }} />
                      </div>
                      <span className="text-xs text-[#092137]/50">{row.difficulty}</span>
                    </div>
                  ) : <span className="text-xs text-[#092137]/30">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function LiveData() {
  const { platform = 'facebook' } = useParams()
  const navigate = useNavigate()
  const { selectedClientId } = useReportingClient()

  const [dateRange, setDateRange]   = useState('Last 30 days')
  const [metaData, setMetaData]     = useState(null)
  const [loading, setLoading]       = useState(false)
  const [ga4Data, setGa4Data]       = useState(null)
  const [ga4Info, setGa4Info]       = useState(null)
  const [ga4Loading, setGa4Loading] = useState(false)
  const [gscData, setGscData]       = useState(null)
  const [gscInfo, setGscInfo]       = useState(null)
  const [gscSite, setGscSite]       = useState(null)
  const [gscLoading, setGscLoading] = useState(false)

  const p             = PLATFORMS[platform]
  const isLive        = p?.live ?? false
  const isGA4         = platform === 'google-analytics'
  const isGSC         = platform === 'search-console'
  const isRankTracker = platform === 'rank-tracker'

  function getDateBounds() {
    const to   = new Date()
    const from = new Date()
    if (dateRange === 'Last 7 days')    from.setDate(to.getDate() - 7)
    if (dateRange === 'Last 30 days')   from.setDate(to.getDate() - 30)
    if (dateRange === 'Last 90 days')   from.setDate(to.getDate() - 90)
    if (dateRange === 'Last 12 months') from.setFullYear(to.getFullYear() - 1)
    return { dateFrom: from.toISOString().slice(0, 10), dateTo: to.toISOString().slice(0, 10) }
  }

  // Meta effect (Facebook / Instagram only)
  useEffect(() => {
    setMetaData(null)
    if (!['facebook', 'instagram'].includes(platform) || !selectedClientId) return
    fetchMeta()
  }, [platform, selectedClientId, dateRange])

  // GA4 info effect — fires when platform or client changes
  useEffect(() => {
    setGa4Data(null)
    setGa4Info(null)
    if (!isGA4 || !selectedClientId) return
    fetchGA4Info()
  }, [platform, selectedClientId])

  // GSC info effect
  useEffect(() => {
    setGscData(null)
    setGscInfo(null)
    setGscSite(null)
    if (!isGSC || !selectedClientId) return
    fetchGSCInfo()
  }, [platform, selectedClientId])

  // GSC data effect — fires when site or date range changes
  useEffect(() => {
    if (!isGSC || !selectedClientId || !gscSite) return
    fetchGSCData(gscSite)
  }, [gscSite, dateRange])

  // GA4 data effect — fires when property or date range changes
  useEffect(() => {
    if (!isGA4 || !selectedClientId || !ga4Info?.ga4PropertyId) return
    fetchGA4Data(ga4Info.ga4PropertyId)
  }, [ga4Info?.ga4PropertyId, dateRange])

  async function fetchMeta(showToast = false) {
    if (!selectedClientId) return
    setLoading(true)
    const { dateFrom, dateTo } = getDateBounds()
    try {
      const res  = await fetch(`/api/meta-insights?clientId=${selectedClientId}&dateFrom=${dateFrom}&dateTo=${dateTo}`)
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Could not fetch Meta data')
        setMetaData(null)
        return
      }
      const key = META_KEY[platform]
      setMetaData(key ? (data[key] ?? null) : data)

      if (data[key]?.reconnect_required) {
        toast.error(`${p.label} token expired`, {
          action: { label: 'Reconnect', onClick: () => navigate('/accounts') },
          duration: 8000,
        })
      }
      if (showToast && data[key] && !data[key].error) toast.success(`${p.label} data refreshed!`)
    } catch {
      toast.error('Failed to reach Meta')
      setMetaData(null)
    } finally {
      setLoading(false)
    }
  }

  async function fetchGA4Info() {
    if (!selectedClientId) return
    try {
      const res  = await fetch(`/api/gsc-data?type=info&clientId=${selectedClientId}`)
      const data = await res.json()
      setGa4Info(data)
    } catch {
      toast.error('Could not fetch Google connection info')
    }
  }

  async function fetchGA4Data(propertyId, showToast = false) {
    if (!selectedClientId || !propertyId) return
    setGa4Loading(true)
    const { dateFrom, dateTo } = getDateBounds()
    try {
      const res  = await fetch(`/api/gsc-data?type=ga4&clientId=${selectedClientId}&propertyId=${propertyId}&dateFrom=${dateFrom}&dateTo=${dateTo}`)
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Could not fetch Google Analytics data')
        setGa4Data(null)
        return
      }
      setGa4Data(data)
      if (showToast) toast.success('Google Analytics data refreshed!')
    } catch {
      toast.error('Failed to reach Google Analytics API')
      setGa4Data(null)
    } finally {
      setGa4Loading(false)
    }
  }

  async function handleSaveGA4Property(propertyId) {
    await fetch(`/api/gsc-data?type=save-ga4&clientId=${selectedClientId}&propertyId=${propertyId}`, { method: 'POST' })
    setGa4Info(prev => ({ ...prev, ga4PropertyId: propertyId }))
  }

  async function fetchGSCInfo() {
    if (!selectedClientId) return
    try {
      const res  = await fetch(`/api/gsc-data?type=info&clientId=${selectedClientId}`)
      const data = await res.json()
      setGscInfo(data)
      if (data.connected && data.sites?.length === 1) setGscSite(data.sites[0])
    } catch {
      toast.error('Could not fetch Search Console connection info')
    }
  }

  async function fetchGSCData(siteUrl, showToast = false) {
    if (!selectedClientId || !siteUrl) return
    setGscLoading(true)
    const days = dateRange === 'Last 7 days' ? 7 : dateRange === 'Last 90 days' ? 90 : dateRange === 'Last 12 months' ? 365 : 30
    try {
      const res  = await fetch(`/api/gsc-data?type=gsc&clientId=${selectedClientId}&siteUrl=${encodeURIComponent(siteUrl)}&days=${days}`)
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Could not fetch Search Console data')
        setGscData(null)
        return
      }
      setGscData(data)
      if (showToast) toast.success('Search Console data refreshed!')
    } catch {
      toast.error('Failed to reach Search Console API')
      setGscData(null)
    } finally {
      setGscLoading(false)
    }
  }

  if (!p) return <div className="text-sm text-[#092137]/50 p-8 text-center">Unknown platform.</div>

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: p.bg }}>
            {p.emoji}
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#092137]">{p.label}</h1>
            <p className="text-xs text-[#092137]/40">{p.group} · {isLive ? 'Live data' : 'Coming soon'}</p>
          </div>
        </div>

        {isLive && selectedClientId && (
          <div className="flex items-center gap-3">
            <div className="flex bg-[#EDE8DC] rounded-full p-0.5 gap-0.5">
              {DATE_RANGES.map(r => (
                <button key={r} onClick={() => setDateRange(r)}
                  className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                    dateRange === r ? 'bg-white text-[#092137] shadow-sm' : 'text-[#092137]/50 hover:text-[#092137]/80'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              onClick={() => isGA4 ? fetchGA4Data(ga4Info?.ga4PropertyId, true) : isGSC ? fetchGSCData(gscSite, true) : fetchMeta(true)}
              disabled={isGA4 ? ga4Loading : isGSC ? gscLoading : loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-blue-200 bg-blue-50 text-blue-600 text-sm font-medium hover:bg-blue-100 transition-colors disabled:opacity-40"
            >
              {(isGA4 ? ga4Loading : isGSC ? gscLoading : loading) ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {(isGA4 ? ga4Loading : isGSC ? gscLoading : loading) ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      {!isLive ? (
        <ComingSoonCard id={platform} />
      ) : !selectedClientId ? (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100 p-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle size={18} className="text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-orange-800">No client selected</p>
            <p className="text-xs text-orange-600 mt-0.5">Select a client from the top bar to see their {p.label} data.</p>
          </div>
        </div>
      ) : isRankTracker ? (
        <RankTrackerDashboard
          clientId={selectedClientId}
          dateFrom={getDateBounds().dateFrom}
          dateTo={getDateBounds().dateTo}
        />
      ) : isGSC ? (
        !gscInfo ? (
          <PageSkeleton />
        ) : !gscInfo.connected ? (
          <NotConnectedGoogle clientId={selectedClientId} />
        ) : !gscSite && gscInfo.sites?.length > 1 ? (
          <GSCSiteSelectorCard sites={gscInfo.sites} onSelect={setGscSite} />
        ) : gscLoading ? (
          <PageSkeleton />
        ) : gscData ? (
          <SearchConsoleDashboard data={gscData} color={p.color} />
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-[#EDE8DC] p-10 text-center">
            <p className="text-sm text-[#092137]/40">No Search Console data available for this period.</p>
          </div>
        )
      ) : isGA4 ? (
        !ga4Info ? (
          <PageSkeleton />
        ) : !ga4Info.connected ? (
          <NotConnectedGoogle clientId={selectedClientId} />
        ) : !ga4Info.ga4PropertyId && ga4Info.ga4Properties?.length > 0 ? (
          <GA4PropertySelectorCard properties={ga4Info.ga4Properties} onSelect={handleSaveGA4Property} />
        ) : ga4Loading ? (
          <PageSkeleton />
        ) : ga4Data ? (
          <GoogleAnalyticsDashboard data={ga4Data} info={ga4Info} onSaveProperty={handleSaveGA4Property} color={p.color} />
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-[#EDE8DC] p-10 text-center">
            <p className="text-sm text-[#092137]/40">No Google Analytics data available for this period.</p>
          </div>
        )
      ) : loading ? (
        <PageSkeleton />
      ) : metaData?.error || metaData?.reconnect_required ? (
        <ErrorWidget data={metaData} p={p} onReconnect={() => navigate('/accounts')} />
      ) : metaData ? (
        platform === 'facebook'
          ? <FacebookDashboard data={metaData} color={p.color} />
          : <InstagramDashboard data={metaData} color={p.color} />
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-[#EDE8DC] p-10 text-center">
          <p className="text-sm text-[#092137]/40 mb-3">No {p.label} account connected for this client.</p>
          <button onClick={() => navigate('/accounts')} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline">
            Connect account <ArrowRight size={13} />
          </button>
        </div>
      )}
    </div>
  )
}
