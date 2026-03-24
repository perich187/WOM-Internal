import { useState, useEffect } from 'react'
import { ClipboardCheck, AlertTriangle, XCircle, CheckCircle2, Globe, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useDigitalClient } from '@/lib/digitalClient'

const SEV_STYLE = {
  error:   { Icon: XCircle,       color: 'text-red-500',   bg: 'bg-red-50',   badge: 'bg-red-100 text-red-700' },
  warning: { Icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-700' },
  good:    { Icon: CheckCircle2,  color: 'text-green-500', bg: 'bg-green-50', badge: 'bg-green-100 text-green-700' },
}

function HealthScore({ score }) {
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444'
  const label = score >= 80 ? 'Healthy' : score >= 60 ? 'Needs Work' : 'Critical'
  return (
    <div className="flex flex-col items-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center border-[5px] font-bold text-2xl"
        style={{ borderColor: color, color }}
      >
        {score}
      </div>
      <p className="text-xs font-medium mt-2" style={{ color }}>{label}</p>
    </div>
  )
}

export default function SiteAudit() {
  const { selectedClient } = useDigitalClient()
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)
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
    try {
      const url = domain.startsWith('http') ? domain : `https://${domain}`
      const res  = await fetch(`/api/site-audit?url=${encodeURIComponent(url)}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
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
          Crawls up to 20 pages — checks titles, meta, H1s, alt text, canonical tags, structured data and more
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2 text-sm text-red-700">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl border border-[#EDE8DC] p-10 text-center space-y-3">
          <ClipboardCheck size={28} className="mx-auto text-red-400 animate-pulse" />
          <p className="text-sm font-medium text-[#092137]">Crawling site…</p>
          <p className="text-xs text-[#092137]/40">Auditing up to 20 pages for SEO issues</p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <>
          {/* Summary header */}
          <div className="bg-white rounded-xl border border-[#EDE8DC] p-6 flex items-center gap-8">
            <HealthScore score={result.healthScore} />
            <div className="flex-1 grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">{result.totalErrors}</p>
                <p className="text-xs text-[#092137]/50 mt-0.5">Errors</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-500">{result.totalWarnings}</p>
                <p className="text-xs text-[#092137]/50 mt-0.5">Warnings</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#092137]">{result.pagesAudited}</p>
                <p className="text-xs text-[#092137]/50 mt-0.5">Pages Audited</p>
              </div>
            </div>
            <button
              onClick={runAudit}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#EDE8DC] text-sm text-[#092137]/60 hover:bg-[#F5F1E9] transition-colors"
            >
              <RefreshCw size={13} /> Re-audit
            </button>
          </div>

          {/* Issues by category */}
          {result.summary?.length > 0 && (
            <div className="space-y-3">
              {result.summary
                .sort((a, b) => (b.errors * 3 + b.warnings) - (a.errors * 3 + a.warnings))
                .map(cat => {
                  const hasErrors   = cat.errors > 0
                  const hasWarnings = cat.warnings > 0
                  const severity    = hasErrors ? 'error' : hasWarnings ? 'warning' : 'good'
                  const { Icon, color, bg } = SEV_STYLE[severity]
                  return (
                    <div key={cat.category} className={`rounded-xl border overflow-hidden ${bg} border-transparent`}>
                      <div className="flex items-center gap-3 px-5 py-4">
                        <Icon size={16} className={`flex-shrink-0 ${color}`} />
                        <p className="flex-1 text-sm font-medium text-[#092137]">{cat.category}</p>
                        {cat.errors > 0 && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SEV_STYLE.error.badge}`}>
                            {cat.errors} error{cat.errors !== 1 ? 's' : ''}
                          </span>
                        )}
                        {cat.warnings > 0 && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SEV_STYLE.warning.badge}`}>
                            {cat.warnings} warning{cat.warnings !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {cat.examples?.length > 0 && (
                        <div className="px-5 pb-3 flex flex-wrap gap-1.5">
                          {cat.examples.map((ex, i) => (
                            <span key={i} className="text-xs bg-white/70 text-[#092137]/50 px-2 py-0.5 rounded-md truncate max-w-xs">
                              {ex.replace(/^https?:\/\/[^/]+/, '') || '/'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          )}

          {/* Pages audited */}
          <div className="bg-white rounded-xl border border-[#EDE8DC] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#EDE8DC]">
              <p className="text-sm font-semibold text-[#092137]">Pages Crawled</p>
            </div>
            <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
              {result.pageResults?.map((p, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.status === 200 ? 'bg-green-400' : p.status === 'error' ? 'bg-red-400' : 'bg-amber-400'}`} />
                  <span className="flex-1 text-[#092137]/70 truncate text-xs">{p.url}</span>
                  <span className="text-xs text-[#092137]/40">{p.status}</span>
                  {p.issues > 0 && (
                    <span className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                      {p.issues} issue{p.issues !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="bg-white rounded-xl border border-[#EDE8DC] p-12 text-center">
          <ClipboardCheck size={32} className="mx-auto text-red-400 mb-3" />
          <p className="text-sm font-medium text-[#092137]">Enter a domain and click Audit</p>
          <p className="text-xs text-[#092137]/40 mt-1">
            {selectedClient?.website
              ? `${selectedClient.client_name}'s domain is pre-filled above`
              : 'Select a client above to pre-fill their domain'}
          </p>
        </div>
      )}
    </div>
  )
}
