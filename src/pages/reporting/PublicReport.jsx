import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { TrendingUp, TrendingDown, Printer, Mail, Loader2, AlertTriangle } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { supabase } from '@/lib/supabase'

// ── Platform config ───────────────────────────────────────────────────────────

const PLATFORMS = {
  facebook:  { label: 'Facebook',   color: '#1877F2', bg: '#EBF3FF', emoji: '📘' },
  instagram: { label: 'Instagram',  color: '#E1306C', bg: '#FDE8F0', emoji: '📸' },
  tiktok:    { label: 'TikTok',     color: '#161616', bg: '#F0F0F0', emoji: '🎵' },
  google:    { label: 'Google Ads', color: '#4285F4', bg: '#EAF0FF', emoji: '🔍' },
  linkedin:  { label: 'LinkedIn',   color: '#0A66C2', bg: '#E8F0F9', emoji: '💼' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatDateRange(from, to) {
  if (from && to) return `${formatDate(from)} – ${formatDate(to)}`
  if (from) return `From ${formatDate(from)}`
  if (to) return `To ${formatDate(to)}`
  return ''
}

function ChangeBadge({ change, positive }) {
  if (!change) return null
  const Icon = positive ? TrendingUp : TrendingDown
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
        positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
      }`}
    >
      <Icon size={11} />
      {change}
    </span>
  )
}

// ── Section renderers ─────────────────────────────────────────────────────────

function SummarySection({ section }) {
  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="border-l-4 border-[#F0A629] pl-6">
        {section.title && (
          <h2 className="text-2xl font-bold text-[#092137] mb-4">{section.title}</h2>
        )}
        <p className="text-[#092137]/70 leading-relaxed text-base whitespace-pre-wrap">{section.body}</p>
      </div>
    </div>
  )
}

function PlatformSection({ section }) {
  const p = PLATFORMS[section.platform] || PLATFORMS.facebook
  const metrics = section.metrics || []

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      {/* Platform header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{ backgroundColor: p.bg }}
        >
          {p.emoji}
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#092137]">{p.label} Performance</h2>
          <div className="w-20 h-1 rounded-full mt-1" style={{ backgroundColor: p.color }} />
        </div>
      </div>

      {/* Metrics grid */}
      <div className={`grid gap-4 ${metrics.length <= 2 ? 'grid-cols-2' : metrics.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {metrics.map((m, i) => (
          <div key={i} className="bg-white rounded-xl border border-[#EDE8DC] p-5 text-center shadow-sm">
            <p className="text-xs font-semibold text-[#092137]/50 uppercase tracking-wider mb-2">{m.label}</p>
            <p className="text-3xl font-bold text-[#092137] mb-2">{m.value || '—'}</p>
            <ChangeBadge change={m.change} positive={m.positive} />
          </div>
        ))}
      </div>
    </div>
  )
}

function MetricsSection({ section }) {
  const metrics = section.metrics || []

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      {section.title && (
        <h2 className="text-xl font-bold text-[#092137] mb-6">{section.title}</h2>
      )}
      <div className={`grid gap-4 ${metrics.length <= 2 ? 'grid-cols-2' : metrics.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {metrics.map((m, i) => (
          <div key={i} className="bg-white rounded-xl border border-[#EDE8DC] p-5 text-center shadow-sm">
            <p className="text-xs font-semibold text-[#092137]/50 uppercase tracking-wider mb-2">{m.label || 'Metric'}</p>
            <p className="text-3xl font-bold text-[#092137] mb-2">{m.value || '—'}</p>
            <ChangeBadge change={m.change} positive={m.positive} />
          </div>
        ))}
      </div>
    </div>
  )
}

function TextSection({ section }) {
  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      {section.title && (
        <h2 className="text-xl font-bold text-[#092137] mb-4">{section.title}</h2>
      )}
      <p className="text-[#092137]/70 leading-relaxed whitespace-pre-wrap">{section.body}</p>
    </div>
  )
}

function ChartSection({ section }) {
  const chartData = (section.data || []).map(d => ({ label: d.label, value: Number(d.value) || 0 }))
  const color = section.color || '#1877F2'

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      {section.title && (
        <h2 className="text-xl font-bold text-[#092137] mb-6">{section.title}</h2>
      )}
      <div className="bg-white rounded-xl border border-[#EDE8DC] p-6 shadow-sm">
        <ResponsiveContainer width="100%" height={260}>
          {section.chartType === 'line' ? (
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE8DC" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#092137', opacity: 0.5 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#092137', opacity: 0.5 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #EDE8DC', fontSize: 13 }} />
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={3} dot={{ fill: color, r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE8DC" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#092137', opacity: 0.5 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#092137', opacity: 0.5 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #EDE8DC', fontSize: 13 }} />
              <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

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
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {position}
    </div>
  )
}

function RankTrackerSection({ section, report }) {
  const [kwData, setKwData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!report?.client_id) { setLoading(false); return }
    fetchData()
  }, [report?.client_id])

  async function fetchData() {
    try {
      const { data: keywords } = await supabase
        .from('rank_tracker_keywords')
        .select('id, keyword, domain')
        .eq('client_id', report.client_id)

      if (!keywords?.length) { setKwData({ chartData: [], stats: {}, rows: [] }); setLoading(false); return }

      const keywordIds = keywords.map(k => k.id)

      // Fetch results within report date range
      let query = supabase
        .from('rank_tracker_results')
        .select('*')
        .in('keyword_id', keywordIds)
        .order('checked_at', { ascending: true })

      if (report.date_from) query = query.gte('checked_at', report.date_from)
      if (report.date_to)   query = query.lte('checked_at', report.date_to + 'T23:59:59')

      const { data: results } = await query

      // Also fetch overall latest per keyword (for current position shown in table)
      const { data: allResults } = await supabase
        .from('rank_tracker_results')
        .select('*')
        .in('keyword_id', keywordIds)
        .order('checked_at', { ascending: false })

      // Latest result per keyword
      const latestMap = {}
      for (const r of (allResults ?? [])) {
        if (!latestMap[r.keyword_id]) latestMap[r.keyword_id] = r
      }

      // Earliest result in range per keyword (for change calc)
      const earliestMap = {}
      for (const r of (results ?? [])) {
        if (!earliestMap[r.keyword_id]) earliestMap[r.keyword_id] = r
      }

      // Chart: group results by check date, count per position bucket
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
          const p = r.position
          if (!p) continue
          if (p <= 3)       counts['1-3']++
          else if (p <= 10) counts['4-10']++
          else if (p <= 20) counts['11-20']++
          else if (p <= 50) counts['21-50']++
          else              counts['51+']++
        }
        const label = new Date(date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
        return { date: label, ...counts }
      })

      // Summary stats
      const ranked = keywords.filter(k => latestMap[k.id]?.position)
      const totalVolume = keywords.reduce((s, k) => s + (latestMap[k.id]?.volume ?? 0), 0)
      const avgPos = ranked.length
        ? (ranked.reduce((s, k) => s + latestMap[k.id].position, 0) / ranked.length).toFixed(1)
        : null

      // Keyword table rows, sorted by position
      const rows = keywords.map(kw => {
        const latest   = latestMap[kw.id]
        const earliest = earliestMap[kw.id]
        const change   = latest?.position && earliest?.position && latest.id !== earliest.id
          ? earliest.position - latest.position
          : null
        return { keyword: kw.keyword, position: latest?.position ?? null, change, url: latest?.url ?? null, volume: latest?.volume ?? null }
      }).sort((a, b) => (a.position ?? 999) - (b.position ?? 999))

      setKwData({ chartData, stats: { total: keywords.length, ranked: ranked.length, totalVolume, avgPos }, rows })
    } catch (err) {
      console.error('[RankTrackerSection]', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="max-w-3xl mx-auto px-8 py-10 text-center">
      <Loader2 size={20} className="animate-spin text-blue-400 mx-auto" />
    </div>
  )

  if (!report?.client_id || !kwData) return null

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      {section.title && (
        <h2 className="text-xl font-bold text-[#092137] mb-6">{section.title}</h2>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Keywords Tracked', value: kwData.stats.total ?? 0 },
          { label: 'Now Ranking',      value: kwData.stats.ranked ?? 0 },
          { label: 'Avg. Position',    value: kwData.stats.avgPos ?? '—' },
          { label: 'Total Volume',     value: kwData.stats.totalVolume ? kwData.stats.totalVolume.toLocaleString() : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-[#EDE8DC] p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-[#092137]">{value}</p>
            <p className="text-xs text-[#092137]/50 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Stacked bar chart */}
      {kwData.chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-[#EDE8DC] p-5 mb-6 shadow-sm">
          <p className="text-xs font-semibold text-[#092137]/50 uppercase tracking-wider mb-3">Ranking Distribution</p>
          <div className="flex gap-4 mb-4 flex-wrap">
            {Object.entries(RANK_COLORS).map(([k, c]) => (
              <span key={k} className="flex items-center gap-1.5 text-xs text-[#092137]/60">
                <span className="w-2.5 h-2.5 rounded-sm inline-block flex-shrink-0" style={{ backgroundColor: c }} />
                {k}
              </span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={kwData.chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE8DC" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#092137', opacity: 0.5 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#092137', opacity: 0.5 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #EDE8DC', fontSize: 12 }} />
              {Object.entries(RANK_COLORS).map(([key, color]) => (
                <Bar key={key} dataKey={key} stackId="a" fill={color} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Keyword table */}
      <div className="bg-white rounded-xl border border-[#EDE8DC] overflow-hidden shadow-sm">
        {kwData.rows.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#EDE8DC]">
                <th className="px-5 py-3 text-left text-xs font-semibold text-[#092137]/40 uppercase tracking-wider">Keyword</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-[#092137]/40 uppercase tracking-wider">Rank</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-[#092137]/40 uppercase tracking-wider">Change</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-[#092137]/40 uppercase tracking-wider">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {kwData.rows.map((row, i) => (
                <tr key={i}>
                  <td className="px-5 py-3.5">
                    <p className="text-sm text-[#092137]">{row.keyword}</p>
                    {row.url && (
                      <p className="text-xs text-[#092137]/40 truncate max-w-[220px]">
                        {row.url.replace(/^https?:\/\/[^/]+/, '') || '/'}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3.5"><RankBadge position={row.position} /></td>
                  <td className="px-5 py-3.5">
                    {row.change != null ? (
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        row.change > 0 ? 'bg-green-100 text-green-700' : row.change < 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {row.change > 0 ? '↑' : row.change < 0 ? '↓' : '='}{row.change !== 0 ? Math.abs(row.change) : ''}
                      </span>
                    ) : <span className="text-xs text-[#092137]/30">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[#092137]/60">
                    {row.volume ? row.volume.toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-center text-[#092137]/40 py-8">No rank tracking data for this period</p>
        )}
      </div>
    </div>
  )
}

function renderSection(section, report) {
  switch (section.type) {
    case 'summary':      return <SummarySection      key={section.id} section={section} />
    case 'platform':     return <PlatformSection     key={section.id} section={section} />
    case 'metrics':      return <MetricsSection      key={section.id} section={section} />
    case 'chart':        return <ChartSection        key={section.id} section={section} />
    case 'text':         return <TextSection         key={section.id} section={section} />
    case 'rank-tracker': return <RankTrackerSection  key={section.id} section={section} report={report} />
    default:             return null
  }
}

// ── Cover page ────────────────────────────────────────────────────────────────

function CoverPage({ report }) {
  const dateRange = formatDateRange(report.date_from, report.date_to)

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#092137' }}
    >
      {/* Top strip */}
      <div className="h-1.5 bg-[#F0A629]" />

      {/* Main cover content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-20 text-center">
        {/* WOM Logo */}
        <img
          src="/wom-logo.png"
          alt="Word of Mouth Agency"
          className="h-14 mb-16 opacity-90"
          style={{ filter: 'brightness(0) invert(1)' }}
        />

        {/* Client name */}
        {report.client_name && (
          <p className="text-[#F0A629] font-semibold text-lg uppercase tracking-widest mb-4">
            {report.client_name}
          </p>
        )}

        {/* Report title */}
        <h1 className="text-white font-bold text-5xl sm:text-6xl leading-tight mb-6 max-w-2xl">
          {report.title}
        </h1>

        {/* Date range */}
        {dateRange && (
          <p className="text-white/50 text-lg">{dateRange}</p>
        )}

        {/* Gold line */}
        <div className="w-24 h-1 bg-[#F0A629] rounded-full mt-12" />
      </div>

      {/* Bottom */}
      <div className="px-8 py-8 text-center text-white/30 text-sm">
        Prepared by Word of Mouth Agency
      </div>
    </div>
  )
}

// ── Back page ─────────────────────────────────────────────────────────────────

function BackPage() {
  return (
    <div
      className="min-h-[40vh] flex flex-col items-center justify-center px-8 py-16 text-center"
      style={{ backgroundColor: '#092137' }}
    >
      <div className="h-1 w-24 bg-[#F0A629] rounded-full mb-10" />
      <img
        src="/wom-logo.png"
        alt="Word of Mouth Agency"
        className="h-10 mb-6 opacity-80"
        style={{ filter: 'brightness(0) invert(1)' }}
      />
      <p className="text-white/40 text-sm mb-1">wordofmouthagency.com.au</p>
      <p className="text-white/30 text-xs">Questions? Reach out to your account manager.</p>
    </div>
  )
}

// ── Section divider ───────────────────────────────────────────────────────────

function SectionDivider() {
  return <div className="max-w-3xl mx-auto px-8"><div className="border-t border-[#EDE8DC]" /></div>
}

// ── Main public report ────────────────────────────────────────────────────────

export default function PublicReport() {
  const { token } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    supabase
      .from('reports')
      .select('*')
      .eq('share_token', token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true) } else { setReport(data) }
        setLoading(false)
      })
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1E9] flex items-center justify-center">
        <Loader2 size={32} className="text-[#F0A629] animate-spin" />
      </div>
    )
  }

  if (notFound || !report) {
    return (
      <div className="min-h-screen bg-[#F5F1E9] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <AlertTriangle size={40} className="text-orange-400" />
        <h1 className="text-2xl font-bold text-[#092137]">Report not found</h1>
        <p className="text-[#092137]/50">This report link may have expired or been removed.</p>
      </div>
    )
  }

  const sections = report.sections || []
  const shareUrl = window.location.href

  function handlePrint() { window.print() }

  function handleEmail() {
    const subject = encodeURIComponent(`${report.title}${report.client_name ? ` — ${report.client_name}` : ''}`)
    const body    = encodeURIComponent(`Hi,\n\nPlease find your report here:\n${shareUrl}\n\nBest regards,\nWord of Mouth Agency`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  return (
    <div className="min-h-screen bg-[#F5F1E9]">
      {/* Print CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          @page { margin: 0; }
        }
      `}</style>

      {/* Floating action bar */}
      <div className="no-print fixed bottom-6 right-6 flex items-center gap-2 z-50">
        <button
          onClick={handleEmail}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#EDE8DC] text-sm font-medium text-[#092137]/70 hover:bg-[#F5F1E9] shadow-lg transition-colors"
        >
          <Mail size={15} /> Email
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#092137] text-white text-sm font-semibold hover:bg-[#061828] shadow-lg transition-colors"
        >
          <Printer size={15} /> Save as PDF
        </button>
      </div>

      {/* Cover */}
      <CoverPage report={report} />

      {/* Sections */}
      {sections.length > 0 && (
        <div className="bg-[#F5F1E9]">
          {sections.map((section, i) => (
            <div key={section.id}>
              {renderSection(section, report)}
              {i < sections.length - 1 && <SectionDivider />}
            </div>
          ))}
        </div>
      )}

      {/* Back page */}
      <BackPage />
    </div>
  )
}
