import { useState, useEffect, useRef } from 'react'
import {
  ClipboardCheck, Globe, Loader2, AlertCircle, RefreshCw, X, ChevronDown, ChevronUp, ExternalLink,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useDigitalClient } from '@/lib/digitalClient'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BATCH_SIZE = 5

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
  const data = [{ value: score }, { value: 100 - score }]
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
// Detail panel — column definitions per test
// ---------------------------------------------------------------------------

function StatusBadge({ code }) {
  const c = code >= 500 ? { bg: '#7F1D1D', text: '#FEE2E2' }
    : code >= 400 ? { bg: '#EF4444', text: '#fff' }
    : code >= 300 ? { bg: '#F59E0B', text: '#fff' }
    : { bg: '#10B981', text: '#fff' }
  return (
    <span
      className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {code}
    </span>
  )
}

function TypeBadge({ type }) {
  const styles = {
    image:  { bg: '#DBEAFE', text: '#1E40AF' },
    css:    { bg: '#EDE9FE', text: '#5B21B6' },
    js:     { bg: '#FEF3C7', text: '#92400E' },
  }
  const s = styles[type] || { bg: '#F3F4F6', text: '#374151' }
  return (
    <span
      className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {type}
    </span>
  )
}

function TruncUrl({ url, maxLen = 50 }) {
  if (!url) return <span className="text-[#092137]/40">—</span>
  const display = url.length > maxLen ? url.slice(0, maxLen) + '…' : url
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={url}
      className="text-blue-600 hover:underline flex items-center gap-1 min-w-0"
    >
      <span className="truncate">{display}</span>
      <ExternalLink size={10} className="flex-shrink-0 opacity-50" />
    </a>
  )
}

function RelPath({ url }) {
  let path = url
  try { path = new URL(url).pathname || '/' } catch {}
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={url}
      className="text-blue-600 hover:underline text-xs"
    >
      {path}
    </a>
  )
}

function DetailsTable({ test }) {
  const { id, details } = test
  if (!details || details.length === 0) {
    return <p className="text-xs text-[#092137]/40 py-4 text-center">No details available.</p>
  }

  const thClass = "text-[10px] font-semibold text-[#092137]/40 uppercase tracking-wide py-2 px-3 text-left bg-[#F5F1E9]/60"
  const tdClass = "text-xs text-[#092137]/80 py-2.5 px-3 align-top"

  // --- broken_resources ---
  if (id === 'broken_resources') {
    return (
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={thClass}>Resource URL</th>
            <th className={thClass}>Type</th>
            <th className={thClass}>Status</th>
            <th className={thClass}>Found on</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EDE8DC]">
          {details.map((d, i) => (
            <tr key={i}>
              <td className={tdClass}><TruncUrl url={d.resourceUrl} /></td>
              <td className={tdClass}><TypeBadge type={d.type} /></td>
              <td className={tdClass}><StatusBadge code={d.statusCode} /></td>
              <td className={tdClass}><RelPath url={d.foundOnPage} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  // --- broken_links ---
  if (id === 'broken_links') {
    return (
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={thClass}>Link URL</th>
            <th className={thClass}>Found on Page</th>
            <th className={thClass}>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EDE8DC]">
          {details.map((d, i) => (
            <tr key={i}>
              <td className={tdClass}><TruncUrl url={d.linkUrl} /></td>
              <td className={tdClass}><RelPath url={d.foundOnPage} /></td>
              <td className={tdClass}><StatusBadge code={d.statusCode} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  // --- 4xx_errors / 5xx_errors ---
  if (id === '4xx_errors' || id === '5xx_errors') {
    return (
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={thClass}>Page URL</th>
            <th className={thClass}>Status</th>
            <th className={thClass}>Linked From</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EDE8DC]">
          {details.map((d, i) => (
            <tr key={i}>
              <td className={tdClass}><RelPath url={d.pageUrl} /></td>
              <td className={tdClass}><StatusBadge code={d.statusCode} /></td>
              <td className={tdClass}>{d.linkedFrom ? <RelPath url={d.linkedFrom} /> : <span className="text-[#092137]/30">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  // --- duplicate_titles / duplicate_descriptions ---
  if (id === 'duplicate_titles' || id === 'duplicate_descriptions') {
    const valueLabel = id === 'duplicate_titles' ? 'Title' : 'Description'
    return (
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={thClass}>{valueLabel}</th>
            <th className={thClass}>Pages Affected</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EDE8DC]">
          {details.map((d, i) => {
            const value = d.title || d.description || ''
            return (
              <tr key={i}>
                <td className={tdClass}>
                  <span className="block max-w-xs truncate" title={value}>{value || '—'}</span>
                </td>
                <td className={tdClass}>
                  <div className="flex flex-col gap-0.5">
                    {(d.pages || []).map((u, j) => <RelPath key={j} url={u} />)}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }

  // --- missing_meta_description / missing_title / missing_h1 ---
  if (id === 'missing_meta_description' || id === 'missing_title' || id === 'missing_h1') {
    return (
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={thClass}>Page URL</th>
            <th className={thClass}>Title</th>
            <th className={thClass}>Word Count</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EDE8DC]">
          {details.map((d, i) => (
            <tr key={i}>
              <td className={tdClass}><RelPath url={d.pageUrl} /></td>
              <td className={tdClass}>
                <span className="block max-w-xs truncate" title={d.title}>{d.title || '—'}</span>
              </td>
              <td className={tdClass}>{d.wordCount ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  // --- long_title / short_title ---
  if (id === 'long_title' || id === 'short_title') {
    return (
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={thClass}>Page URL</th>
            <th className={thClass}>Title</th>
            <th className={thClass}>Length</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EDE8DC]">
          {details.map((d, i) => (
            <tr key={i}>
              <td className={tdClass}><RelPath url={d.pageUrl} /></td>
              <td className={tdClass}>
                <span className="block max-w-xs truncate" title={d.title}>{d.title || '—'}</span>
              </td>
              <td className={tdClass}>{d.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  // --- missing_alt ---
  if (id === 'missing_alt') {
    return (
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={thClass}>Page URL</th>
            <th className={thClass}>Images Without Alt</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EDE8DC]">
          {details.map((d, i) => (
            <tr key={i}>
              <td className={tdClass}><RelPath url={d.pageUrl} /></td>
              <td className={tdClass}>{d.imagesWithoutAlt ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  // --- slow_page_load / high_waiting_time ---
  if (id === 'slow_page_load' || id === 'high_waiting_time') {
    return (
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={thClass}>Page URL</th>
            <th className={thClass}>Response Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EDE8DC]">
          {details.map((d, i) => (
            <tr key={i}>
              <td className={tdClass}><RelPath url={d.pageUrl} /></td>
              <td className={tdClass}>{d.responseTime}ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  // --- orphan_pages ---
  if (id === 'orphan_pages') {
    return (
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={thClass}>Page URL</th>
            <th className={thClass}>Title</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EDE8DC]">
          {details.map((d, i) => (
            <tr key={i}>
              <td className={tdClass}><RelPath url={d.pageUrl} /></td>
              <td className={tdClass}>
                <span className="block max-w-xs truncate" title={d.title}>{d.title || '—'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  // --- redirect_chain ---
  if (id === 'redirect_chain') {
    return (
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={thClass}>Page URL</th>
            <th className={thClass}>Redirect Count</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EDE8DC]">
          {details.map((d, i) => (
            <tr key={i}>
              <td className={tdClass}><RelPath url={d.pageUrl} /></td>
              <td className={tdClass}>{d.redirectCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  // --- deprecated_html ---
  if (id === 'deprecated_html') {
    return (
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={thClass}>Page URL</th>
            <th className={thClass}>Tags Found</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EDE8DC]">
          {details.map((d, i) => (
            <tr key={i}>
              <td className={tdClass}><RelPath url={d.pageUrl} /></td>
              <td className={tdClass}>
                <div className="flex flex-wrap gap-1">
                  {(d.tags || []).map((t, j) => (
                    <code key={j} className="text-[10px] bg-[#F5F1E9] border border-[#EDE8DC] px-1.5 py-0.5 rounded">
                      &lt;{t}&gt;
                    </code>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  // --- seo_unfriendly_url ---
  if (id === 'seo_unfriendly_url') {
    return (
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={thClass}>Page URL</th>
            <th className={thClass}>Issue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EDE8DC]">
          {details.map((d, i) => (
            <tr key={i}>
              <td className={tdClass}><RelPath url={d.pageUrl} /></td>
              <td className={tdClass}>{d.issue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  // --- meta_robots_blocking ---
  if (id === 'meta_robots_blocking') {
    return (
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={thClass}>Page URL</th>
            <th className={thClass}>Robots Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EDE8DC]">
          {details.map((d, i) => (
            <tr key={i}>
              <td className={tdClass}><RelPath url={d.pageUrl} /></td>
              <td className={tdClass}><code className="text-xs bg-amber-50 px-1.5 py-0.5 rounded">{d.robots}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  // --- Default: page URL only ---
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className={thClass}>Page URL</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#EDE8DC]">
        {details.map((d, i) => (
          <tr key={i}>
            <td className={tdClass}><RelPath url={d.pageUrl} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ---------------------------------------------------------------------------
// Detail slide panel
// ---------------------------------------------------------------------------

function DetailPanel({ test, onClose }) {
  const badge = SEV_BADGE[test?.severity] || SEV_BADGE.passed
  const panelRef = useRef(null)

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  if (!test) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 h-full w-[480px] max-w-[90vw] bg-white shadow-xl z-50 flex flex-col"
        style={{ animation: 'slideInRight 0.2s ease-out' }}
      >
        {/* Panel header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#EDE8DC] flex-shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-[#092137]/40 uppercase tracking-wide mb-0.5">Test Details</p>
            <h2 className="text-sm font-bold text-[#092137] leading-snug">{test.label}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[#F5F1E9] transition-colors text-[#092137]/40 hover:text-[#092137]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Panel body */}
        <div className="flex-1 overflow-y-auto">
          {/* Summary card */}
          <div className="px-5 pt-4 pb-3">
            <div
              className="rounded-xl px-4 py-3 flex items-center gap-4"
              style={{ backgroundColor: badge.bg + '18' }}
            >
              <div>
                <p className="text-3xl font-bold" style={{ color: badge.bg }}>
                  {test.failures > 0 ? test.failures : '0'}
                </p>
                <p className="text-xs font-semibold mt-0.5" style={{ color: badge.bg }}>
                  {badge.label}
                </p>
              </div>
              <p className="text-xs text-[#092137]/60 leading-relaxed flex-1">{test.description}</p>
            </div>
          </div>

          {/* Row count */}
          {test.details && test.details.length > 0 && (
            <p className="text-[10px] font-semibold text-[#092137]/40 uppercase tracking-wide px-5 pb-2">
              Showing {test.details.length} of {test.details.length} rows
            </p>
          )}

          {/* Details table */}
          <div className="overflow-x-auto">
            <DetailsTable test={test} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}

// ---------------------------------------------------------------------------
// Tests table row
// ---------------------------------------------------------------------------

function TestRow({ test, onOpen }) {
  const badge = SEV_BADGE[test.severity]

  return (
    <button
      onClick={() => onOpen(test)}
      className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-[#F5F1E9]/60 transition-colors border-b border-[#EDE8DC] last:border-0"
    >
      <span className="flex-1 text-sm font-medium text-[#092137] min-w-0 truncate">{test.label}</span>
      <span
        className="text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: badge.bg }}
      >
        {badge.label}
      </span>
      <span className="text-sm font-semibold text-[#092137] w-14 text-right flex-shrink-0">
        {test.failures > 0 ? test.failures : '—'}
      </span>
      <ChevronDown size={14} className="text-[#092137]/30 flex-shrink-0" />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Progress bar component
// ---------------------------------------------------------------------------

function ProgressBar({ value, max }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="w-full bg-[#EDE8DC] rounded-full h-2.5 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, backgroundColor: '#EF4444' }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SiteAudit() {
  const { selectedClient } = useDigitalClient()
  const [domain, setDomain] = useState('')

  // Phase: 'idle' | 'starting' | 'crawling' | 'finalizing' | 'complete' | 'error'
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  // Crawl progress
  const [jobId, setJobId] = useState(null)
  const [totalUrls, setTotalUrls] = useState(0)
  const [crawledCount, setCrawledCount] = useState(0)
  const [currentPage, setCurrentPage] = useState('')
  const [liveErrors, setLiveErrors] = useState(0)
  const [liveWarnings, setLiveWarnings] = useState(0)

  // Side panel
  const [panelTest, setPanelTest] = useState(null)

  // Cancel flag
  const cancelRef = useRef(false)

  useEffect(() => {
    if (selectedClient?.website) {
      setDomain(selectedClient.website.replace(/^https?:\/\//, '').replace(/\/$/, ''))
    } else {
      setDomain('')
    }
    resetState()
  }, [selectedClient?.id])

  function resetState() {
    setResult(null)
    setError(null)
    setPhase('idle')
    setJobId(null)
    setTotalUrls(0)
    setCrawledCount(0)
    setCurrentPage('')
    setLiveErrors(0)
    setLiveWarnings(0)
    cancelRef.current = false
  }

  // Derive live error/warning counts from crawled pages (rough heuristic during crawl)
  // We do this by checking page status codes in finalize; during crawl we don't have this info directly.
  // We'll just show 0 during crawl and actual counts after finalize.

  async function runAudit() {
    if (!domain) return
    cancelRef.current = false
    resetState()
    setPhase('starting')

    const url = domain.startsWith('http') ? domain : `https://${domain}`
    const clientId = selectedClient?.id || ''

    try {
      // Step 1: Start — discover URLs
      const startRes = await fetch(
        `/api/site-audit-start?url=${encodeURIComponent(url)}${clientId ? `&clientId=${clientId}` : ''}`,
        { method: 'POST' }
      )
      if (!startRes.ok) {
        const d = await startRes.json().catch(() => ({}))
        throw new Error(d.error || `Start failed (${startRes.status})`)
      }
      const startData = await startRes.json()
      const { jobId: jid, urls } = startData

      if (cancelRef.current) return

      setJobId(jid)
      setTotalUrls(urls.length)
      setPhase('crawling')

      // Step 2: Crawl in batches of BATCH_SIZE
      // Assign depths: first URL = 0, rest = 1
      const depths = urls.map((_, i) => (i === 0 ? 0 : 1))

      let crawled = 0
      for (let i = 0; i < urls.length; i += BATCH_SIZE) {
        if (cancelRef.current) return

        const batch = urls.slice(i, i + BATCH_SIZE)
        const batchDepths = depths.slice(i, i + BATCH_SIZE)

        setCurrentPage(batch[batch.length - 1])

        const crawlRes = await fetch('/api/site-audit-crawl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId: jid, urls: batch, depths: batchDepths }),
        })

        if (!crawlRes.ok) {
          const d = await crawlRes.json().catch(() => ({}))
          throw new Error(d.error || `Crawl batch failed (${crawlRes.status})`)
        }

        crawled += batch.length
        setCrawledCount(crawled)
      }

      if (cancelRef.current) return

      // Step 3: Finalize
      setPhase('finalizing')
      const finalRes = await fetch(`/api/site-audit-finalize?jobId=${jid}`, { method: 'POST' })
      if (!finalRes.ok) {
        const d = await finalRes.json().catch(() => ({}))
        throw new Error(d.error || `Finalize failed (${finalRes.status})`)
      }
      const finalData = await finalRes.json()

      if (cancelRef.current) return

      setResult(finalData)
      setPhase('complete')
    } catch (err) {
      if (!cancelRef.current) {
        setError(err.message)
        setPhase('error')
      }
    }
  }

  function cancelAudit() {
    cancelRef.current = true
    resetState()
  }

  const sortedTests = result?.tests
    ? [...result.tests].sort((a, b) => {
        const ao = SEV_ORDER[a.severity] ?? 99
        const bo = SEV_ORDER[b.severity] ?? 99
        if (ao !== bo) return ao - bo
        return b.failures - a.failures
      })
    : []

  const isRunning = phase === 'starting' || phase === 'crawling' || phase === 'finalizing'

  // Progress percentage
  const progressPct = totalUrls > 0 ? Math.round((crawledCount / totalUrls) * 100) : 0

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
              onKeyDown={e => e.key === 'Enter' && !isRunning && runAudit()}
              placeholder="Enter domain to audit (e.g. example.com.au)"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#EDE8DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
              disabled={isRunning}
            />
          </div>
          <button
            onClick={runAudit}
            disabled={isRunning || !domain}
            className="px-5 py-2.5 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? <Loader2 size={15} className="animate-spin" /> : <ClipboardCheck size={15} />}
            {isRunning ? 'Auditing…' : 'Audit'}
          </button>
        </div>
        <p className="text-xs text-[#092137]/40 mt-2 ml-1">
          Crawls up to 150 pages — runs 51 SEO checks across titles, meta, H1s, canonicals, redirects, structured data and more
        </p>
      </div>

      {/* Error */}
      {phase === 'error' && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2 text-sm text-red-700">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Starting state */}
      {phase === 'starting' && (
        <div className="bg-white rounded-xl border border-[#EDE8DC] p-10 text-center space-y-3">
          <Loader2 size={32} className="mx-auto text-red-400 animate-spin" />
          <p className="text-sm font-semibold text-[#092137]">Discovering pages…</p>
          <p className="text-xs text-[#092137]/40">Fetching homepage and extracting all internal links</p>
        </div>
      )}

      {/* Crawling / finalizing progress */}
      {(phase === 'crawling' || phase === 'finalizing') && (
        <div className="bg-white rounded-xl border border-[#EDE8DC] p-8 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-bold text-[#092137]">
                {phase === 'finalizing' ? 'Analysing results…' : 'Crawling site…'}
              </p>
              {phase === 'crawling' && (
                <p className="text-xs text-[#092137]/40 mt-1 truncate max-w-sm" title={currentPage}>
                  Analysing page: {(() => {
                    try { return new URL(currentPage).pathname || '/' } catch { return currentPage }
                  })()}
                </p>
              )}
              {phase === 'finalizing' && (
                <p className="text-xs text-[#092137]/40 mt-1">Running 51 SEO tests across {crawledCount} pages…</p>
              )}
            </div>
            <button
              onClick={cancelAudit}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EDE8DC] text-xs text-[#092137]/50 hover:bg-[#F5F1E9] hover:text-[#092137] transition-colors"
            >
              <X size={12} /> Cancel
            </button>
          </div>

          {phase === 'crawling' && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-[#092137]/50">
                  <span>{crawledCount} of {totalUrls} pages</span>
                  <span>{progressPct}%</span>
                </div>
                <ProgressBar value={crawledCount} max={totalUrls} />
              </div>
            </>
          )}

          {phase === 'finalizing' && (
            <div className="flex items-center gap-3">
              <Loader2 size={20} className="text-red-400 animate-spin flex-shrink-0" />
              <p className="text-sm text-[#092137]/60">Running cross-page analysis…</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {phase === 'idle' && (
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
      {phase === 'complete' && result && (
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
            <div className="flex items-center gap-4 px-5 py-3 border-b border-[#EDE8DC] bg-[#F5F1E9]/60">
              <span className="flex-1 text-xs font-semibold text-[#092137]/50 uppercase tracking-wide">Test</span>
              <span className="text-xs font-semibold text-[#092137]/50 uppercase tracking-wide flex-shrink-0 w-20 text-center">Type</span>
              <span className="text-xs font-semibold text-[#092137]/50 uppercase tracking-wide flex-shrink-0 w-14 text-right">Failures</span>
              <span className="w-4 flex-shrink-0" />
            </div>
            <div>
              {sortedTests.map(test => (
                <TestRow key={test.id} test={test} onOpen={setPanelTest} />
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
                try { relPath = new URL(p.url).pathname || '/' } catch {}
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

      {/* Detail side panel */}
      {panelTest && (
        <DetailPanel test={panelTest} onClose={() => setPanelTest(null)} />
      )}
    </div>
  )
}
