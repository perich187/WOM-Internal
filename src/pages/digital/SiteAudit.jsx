import { useState, useEffect } from 'react'
import {
  ClipboardCheck, Globe, Loader2, AlertCircle, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useDigitalClient } from '@/lib/digitalClient'

// ---------------------------------------------------------------------------
// Severity helpers
// ---------------------------------------------------------------------------

const SEV_ORDER = { critical: 0, error: 1, warning: 2, passed: 3 }

const SEV_BADGE = {
  critical: { bg: '#EF4444', label: 'CRITICAL' },
  error:    { bg: '#F97316', label: 'ERROR' },
  warning:  { bg: '#F59E0B', label: 'WARNING' },
  passed:   { bg: '#10B981', label: 'PASSED' },
}

// ---------------------------------------------------------------------------
// Score ring (Recharts-based donut)
// ---------------------------------------------------------------------------

function ScoreRing({ score, size = 140, strokeWidth = 14, label }) {
  const colour = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444'
  const scoreLabel = score >= 80 ? 'Healthy' : score >= 60 ? 'Needs Work' : 'Critical'
  const data = [
    { value: score },
    { value: 100 - score },
  ]
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <PieChart width={size} height={size}>
          <Pie
            data={data}
            cx={size / 2}
            cy={size / 2}
            innerRadius={(size / 2) - strokeWidth}
            outerRadius={size / 2}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            strokeWidth={0}
          >
            <Cell fill={colour} />
            <Cell fill="#EDE8DC" />
          </Pie>
        </PieChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-bold" style={{ fontSize: size * 0.22, color: colour, lineHeight: 1 }}>
            {score}
          </span>
          <span className="text-xs font-medium" style={{ color: colour }}>{label || scoreLabel}</span>
        </div>
      </div>
    </div>
  )
}

function MiniRing({ value, total, colour, label }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  const data = [{ value: pct }, { value: 100 - pct }]
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: 72, height: 72 }}>
        <PieChart width={72} height={72}>
          <Pie
            data={data}
            cx={36}
            cy={36}
            innerRadius={24}
            outerRadius={33}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            strokeWidth={0}
          >
            <Cell fill={colour} />
            <Cell fill="#EDE8DC" />
          </Pie>
        </PieChart>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold" style={{ color: colour }}>{value}</span>
        </div>
      </div>
      <p className="text-xs text-[#092137]/50 text-center leading-tight">{label}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Score by depth bar chart
// ---------------------------------------------------------------------------

function DepthBar(props) {
  const { x, y, width, height, value } = props
  const colour = value >= 80 ? '#10B981' : value >= 60 ? '#F59E0B' : '#EF4444'
  return <rect x={x} y={y} width={width} height={height} fill={colour} rx={3} />
}

function DepthChart({ data }) {
  if (!data || data.length === 0) return null
  return (
    <div className="bg-white rounded-xl border border-[#EDE8DC] p-5">
      <p className="text-sm font-semibold text-[#092137] mb-4">Score by Page Depth</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <XAxis
            dataKey="depth"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#092137', opacity: 0.5 }}
            tickFormatter={d => `Depth ${d}`}
          />
          <YAxis
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#092137', opacity: 0.5 }}
          />
          <Tooltip
            formatter={(value) => [`${value}`, 'Score']}
            labelFormatter={(label) => `Depth ${label}`}
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #EDE8DC',
              fontSize: '12px',
              color: '#092137',
            }}
          />
          <Bar dataKey="score" shape={<DepthBar />} maxBarSize={56} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tests table row
// ---------------------------------------------------------------------------

function TestRow({ test }) {
  const [open, setOpen] = useState(false)
  const badge = SEV_BADGE[test.severity]

  return (
    <div className="border-b border-[#EDE8DC] last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-[#F5F1E9]/60 transition-colors"
      >
        {/* Test name */}
        <span className="flex-1 text-sm font-medium text-[#092137] min-w-0 truncate">{test.label}</span>

        {/* Badge */}
        <span
          className="text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: badge.bg }}
        >
          {badge.label}
        </span>

        {/* Failures count */}
        <span className="text-sm font-semibold text-[#092137] w-14 text-right flex-shrink-0">
          {test.failures > 0 ? test.failures : '—'}
        </span>

        {/* Expand icon */}
        <span className="text-[#092137]/30 flex-shrink-0">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-2.5 bg-[#F5F1E9]/40">
          <p className="text-xs text-[#092137]/60 leading-relaxed">{test.description}</p>
          {test.affectedUrls.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-[#092137]/40 uppercase tracking-wide">Affected Pages</p>
              <div className="flex flex-wrap gap-1.5">
                {test.affectedUrls.map((u, i) => {
                  let relative
                  try {
                    relative = new URL(u).pathname || '/'
                  } catch {
                    relative = u
                  }
                  return (
                    <a
                      key={i}
                      href={u}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-white border border-[#EDE8DC] text-[#092137]/60 px-2 py-0.5 rounded-md hover:text-[#092137] hover:border-[#092137]/30 transition-colors max-w-xs truncate"
                      title={u}
                    >
                      {relative}
                    </a>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SiteAudit() {
  const { selectedClient } = useDigitalClient()
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (selectedClient?.website) {
      setDomain(selectedClient.website.replace(/^https?:\/\//, '').replace(/\/$/, ''))
    } else {
      setDomain('')
    }
    setResult(null)
    setError(null)
  }, [selectedClient?.id])

  async function runAudit() {
    if (!domain) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const url = domain.startsWith('http') ? domain : `https://${domain}`
      const res = await fetch(`/api/site-audit?url=${encodeURIComponent(url)}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Sort tests: critical → error → warning → passed
  const sortedTests = result?.tests
    ? [...result.tests].sort((a, b) => {
        const ao = SEV_ORDER[a.severity] ?? 99
        const bo = SEV_ORDER[b.severity] ?? 99
        if (ao !== bo) return ao - bo
        return b.failures - a.failures
      })
    : []

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-[#092137]">Site Audit</h1>
        <p className="text-sm text-[#092137]/50">
          {selectedClient
            ? `SEO health check for ${selectedClient.client_name}`
            : 'Comprehensive SEO health check for any website'}
        </p>
      </div>

      {/* Domain input */}
      <div className="bg-white rounded-xl border border-[#EDE8DC] p-5">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#092137]/30" />
            <input
              value={domain}
              onChange={e => setDomain(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runAudit()}
              placeholder="Enter domain to audit (e.g. example.com.au)"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#EDE8DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
            />
          </div>
          <button
            onClick={runAudit}
            disabled={loading || !domain}
            className="px-5 py-2.5 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <ClipboardCheck size={15} />}
            {loading ? 'Auditing…' : 'Audit'}
          </button>
        </div>
        <p className="text-xs text-[#092137]/40 mt-2 ml-1">
          Crawls up to 20 pages — runs 51 SEO checks across titles, meta, H1s, canonicals, redirects, structured data and more
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2 text-sm text-red-700">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-xl border border-[#EDE8DC] p-14 text-center space-y-3">
          <Loader2 size={32} className="mx-auto text-red-400 animate-spin" />
          <p className="text-sm font-semibold text-[#092137]">Crawling site…</p>
          <p className="text-xs text-[#092137]/40">Auditing up to 20 pages for 51 SEO tests — this may take 30–60 seconds</p>
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="bg-white rounded-xl border border-[#EDE8DC] p-14 text-center">
          <ClipboardCheck size={32} className="mx-auto text-red-400 mb-3" />
          <p className="text-sm font-semibold text-[#092137]">Enter a domain and click Audit</p>
          <p className="text-xs text-[#092137]/40 mt-1">
            {selectedClient?.website
              ? `${selectedClient.client_name}'s domain is pre-filled above`
              : 'Select a client above to pre-fill their domain'}
          </p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <>
          {/* Summary header */}
          <div className="bg-white rounded-xl border border-[#EDE8DC] p-6">
            <div className="flex flex-wrap items-center gap-6 md:gap-10">

              {/* Overall score ring */}
              <ScoreRing score={result.overallScore} size={140} strokeWidth={14} />

              {/* Critical / Error / Warning counts */}
              <div className="flex gap-4 flex-wrap">
                <div className="rounded-xl px-5 py-4 flex flex-col items-center gap-0.5" style={{ background: '#FEF2F2' }}>
                  <span className="text-3xl font-bold" style={{ color: '#EF4444' }}>{result.criticalCount}</span>
                  <span className="text-xs font-medium" style={{ color: '#EF4444' }}>Critical</span>
                </div>
                <div className="rounded-xl px-5 py-4 flex flex-col items-center gap-0.5" style={{ background: '#FFF7ED' }}>
                  <span className="text-3xl font-bold" style={{ color: '#F97316' }}>{result.errorCount}</span>
                  <span className="text-xs font-medium" style={{ color: '#F97316' }}>Errors</span>
                </div>
                <div className="rounded-xl px-5 py-4 flex flex-col items-center gap-0.5" style={{ background: '#FFFBEB' }}>
                  <span className="text-3xl font-bold" style={{ color: '#F59E0B' }}>{result.warningCount}</span>
                  <span className="text-xs font-medium" style={{ color: '#F59E0B' }}>Warnings</span>
                </div>
              </div>

              {/* Divider */}
              <div className="hidden md:block w-px h-20 bg-[#EDE8DC]" />

              {/* Meta info */}
              <div className="space-y-1.5 text-sm">
                <p className="text-[#092137]/50">
                  <span className="font-medium text-[#092137]">{result.pagesAudited}</span> pages crawled
                </p>
                <p className="text-[#092137]/50">
                  Audited{' '}
                  <span className="font-medium text-[#092137]">
                    {new Date(result.crawledAt).toLocaleDateString('en-AU', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </span>
                </p>
                <p className="text-[#092137]/50">
                  <span className="font-medium text-[#092137]">{result.tests?.length ?? 0}</span> tests run
                </p>
              </div>

              {/* Passed / Failed mini rings */}
              <div className="flex gap-5 ml-auto">
                <MiniRing
                  value={result.passedCount}
                  total={result.tests?.length ?? 1}
                  colour="#10B981"
                  label="Passed"
                />
                <MiniRing
                  value={result.failedCount}
                  total={result.tests?.length ?? 1}
                  colour="#EF4444"
                  label="Failed"
                />
              </div>

              {/* Re-audit button */}
              <button
                onClick={runAudit}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#EDE8DC] text-sm text-[#092137]/60 hover:bg-[#F5F1E9] transition-colors"
              >
                <RefreshCw size={13} /> Re-audit
              </button>
            </div>
          </div>

          {/* Score by depth */}
          {result.scoreByDepth?.length > 0 && (
            <DepthChart data={result.scoreByDepth} />
          )}

          {/* Tests table */}
          <div className="bg-white rounded-xl border border-[#EDE8DC] overflow-hidden">
            {/* Table header */}
            <div className="flex items-center gap-4 px-5 py-3 border-b border-[#EDE8DC] bg-[#F5F1E9]/60">
              <span className="flex-1 text-xs font-semibold text-[#092137]/50 uppercase tracking-wide">Test</span>
              <span className="text-xs font-semibold text-[#092137]/50 uppercase tracking-wide flex-shrink-0 w-20 text-center">Type</span>
              <span className="text-xs font-semibold text-[#092137]/50 uppercase tracking-wide flex-shrink-0 w-14 text-right">Failures</span>
              <span className="w-4 flex-shrink-0" />
            </div>

            {/* Rows */}
            <div>
              {sortedTests.map(test => (
                <TestRow key={test.id} test={test} />
              ))}
            </div>
          </div>

          {/* Pages crawled */}
          <div className="bg-white rounded-xl border border-[#EDE8DC] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#EDE8DC] flex items-center justify-between">
              <p className="text-sm font-semibold text-[#092137]">Pages Crawled</p>
              <p className="text-xs text-[#092137]/40">{result.pageResults?.length} pages</p>
            </div>
            <div className="divide-y divide-[#F5F1E9] max-h-72 overflow-y-auto">
              {result.pageResults?.map((p, i) => {
                const statusColour = p.statusCode === 200 ? '#10B981'
                  : p.statusCode >= 400 ? '#EF4444'
                  : '#F59E0B'
                let relPath = p.url
                try { relPath = new URL(p.url).pathname || '/' } catch { /* keep url */ }
                return (
                  <div key={i} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColour }} />
                    <span className="flex-1 text-[#092137]/70 truncate text-xs" title={p.url}>{relPath}</span>
                    <span className="text-xs text-[#092137]/40 flex-shrink-0">D{p.depth}</span>
                    <span className="text-xs font-medium flex-shrink-0" style={{ color: statusColour }}>{p.statusCode || '—'}</span>
                    <span className="text-xs text-[#092137]/30 flex-shrink-0">{p.responseTime}ms</span>
                    {p.issueCount > 0 && (
                      <span className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded flex-shrink-0">
                        {p.issueCount} issue{p.issueCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
