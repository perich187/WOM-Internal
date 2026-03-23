import { useState } from 'react'
import { ClipboardCheck, AlertTriangle, XCircle, CheckCircle2, Info, Globe } from 'lucide-react'

const AUDIT_CATEGORIES = [
  {
    name:   'Crawlability',
    score:  94,
    issues: [
      { severity: 'warning', message: '3 pages returning 3xx redirects', count: 3 },
      { severity: 'good',    message: 'robots.txt correctly configured', count: null },
      { severity: 'good',    message: 'XML sitemap found and valid', count: null },
    ]
  },
  {
    name:   'On-Page SEO',
    score:  78,
    issues: [
      { severity: 'error',   message: 'Missing meta descriptions', count: 8 },
      { severity: 'warning', message: 'Duplicate title tags found', count: 4 },
      { severity: 'warning', message: 'Images missing alt text', count: 12 },
      { severity: 'good',    message: 'H1 tags present on all key pages', count: null },
    ]
  },
  {
    name:   'Performance',
    score:  65,
    issues: [
      { severity: 'error',   message: 'Render-blocking resources detected', count: 5 },
      { severity: 'warning', message: 'Uncompressed images over 200KB', count: 9 },
      { severity: 'good',    message: 'Gzip compression enabled', count: null },
    ]
  },
  {
    name:   'Links',
    score:  89,
    issues: [
      { severity: 'warning', message: 'Broken internal links', count: 2 },
      { severity: 'good',    message: 'No broken external links found', count: null },
      { severity: 'good',    message: 'No orphan pages detected', count: null },
    ]
  },
]

const SEV = {
  error:   { Icon: XCircle,       color: 'text-red-500',   bg: 'bg-red-50' },
  warning: { Icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50' },
  good:    { Icon: CheckCircle2,  color: 'text-green-500', bg: 'bg-green-50' },
}

function ScoreCircle({ score }) {
  const color = score >= 90 ? '#10B981' : score >= 70 ? '#F59E0B' : '#EF4444'
  return (
    <div className="text-lg font-bold" style={{ color }}>{score}</div>
  )
}

export default function SiteAudit() {
  const [domain, setDomain] = useState('')

  const totalIssues = AUDIT_CATEGORIES.reduce((s, c) => s + c.issues.filter(i => i.severity !== 'good').length, 0)

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[#092137]">Site Audit</h1>
        <p className="text-sm text-[#092137]/50">Comprehensive SEO health check for any website</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2 text-sm text-blue-700">
        <Info size={15} className="flex-shrink-0 mt-0.5" />
        Phase 2 — full site crawler coming soon. Sample audit results shown below.
      </div>

      <div className="bg-white rounded-xl border border-[#EDE8DC] p-5">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#092137]/30" />
            <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="Enter domain to audit (e.g. example.com.au)" className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#EDE8DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400" />
          </div>
          <button className="px-5 py-2.5 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-colors flex items-center gap-1.5">
            <ClipboardCheck size={15} /> Audit
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-3">
        {AUDIT_CATEGORIES.map(cat => (
          <div key={cat.name} className="bg-white rounded-xl border border-[#EDE8DC] p-4 text-center">
            <ScoreCircle score={cat.score} />
            <p className="text-xs text-[#092137]/50 mt-1">{cat.name}</p>
          </div>
        ))}
      </div>

      {/* Issue categories */}
      <div className="space-y-3">
        {AUDIT_CATEGORIES.map(cat => (
          <div key={cat.name} className="bg-white rounded-xl border border-[#EDE8DC] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#EDE8DC] flex items-center justify-between">
              <p className="text-sm font-semibold text-[#092137]">{cat.name}</p>
              <ScoreCircle score={cat.score} />
            </div>
            <div className="divide-y divide-gray-50">
              {cat.issues.map((issue, i) => {
                const { Icon, color, bg } = SEV[issue.severity]
                return (
                  <div key={i} className={`flex items-center gap-3 px-5 py-3.5 ${bg}`}>
                    <Icon size={15} className={`flex-shrink-0 ${color}`} />
                    <p className="flex-1 text-sm text-[#092137]/80">{issue.message}</p>
                    {issue.count && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-white/60 ${color}`}>
                        {issue.count}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
