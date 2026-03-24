import { useState, useEffect } from 'react'
import { Sparkles, Globe, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useDigitalClient } from '@/lib/digitalClient'

const STATUS_STYLES = {
  good:    { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500',  label: 'Good' },
  warning: { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500',  label: 'Warning' },
  error:   { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500',    label: 'Issue' },
}

export default function AIOverview() {
  const { selectedClient } = useDigitalClient()
  const [url, setUrl]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (selectedClient?.website) {
      const w = selectedClient.website
      setUrl(w.startsWith('http') ? w : `https://${w}`)
    } else {
      setUrl('')
    }
    setResult(null)
    setError(null)
  }, [selectedClient?.id])

  async function analyse() {
    if (!url) return
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`/api/ai-overview?url=${encodeURIComponent(url)}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const goodCount    = result?.insights?.filter(i => i.status === 'good').length ?? 0
  const warningCount = result?.insights?.filter(i => i.status === 'warning').length ?? 0
  const errorCount   = result?.insights?.filter(i => i.status === 'error').length ?? 0

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[#092137]">AI Overview</h1>
        <p className="text-sm text-[#092137]/50">
          {selectedClient
            ? `AI-powered SEO analysis for ${selectedClient.client_name}`
            : 'AI-powered SEO analysis and recommendations'}
        </p>
      </div>

      {/* URL input */}
      <div className="bg-white rounded-xl border border-[#EDE8DC] p-5">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#092137]/30" />
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && analyse()}
              placeholder="Enter URL or domain to analyse"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#EDE8DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
            />
          </div>
          <button
            onClick={analyse}
            disabled={loading || !url}
            className="px-5 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {loading ? 'Analysing…' : 'Analyse'}
          </button>
        </div>
        <p className="text-xs text-[#092137]/40 mt-2 ml-1">
          Powered by Claude AI — analyses page content, structure, and on-page SEO signals
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2 text-sm text-red-700">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="bg-white rounded-xl border border-[#EDE8DC] p-8 text-center space-y-3">
          <Sparkles size={28} className="mx-auto text-purple-400 animate-pulse" />
          <p className="text-sm font-medium text-[#092137]">Analysing page with Claude AI…</p>
          <p className="text-xs text-[#092137]/40">Fetching page content and running SEO analysis</p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Good',     count: goodCount,    color: 'text-green-600 bg-green-50 border-green-200' },
              { label: 'Warnings', count: warningCount, color: 'text-amber-600 bg-amber-50 border-amber-200' },
              { label: 'Issues',   count: errorCount,   color: 'text-red-600 bg-red-50 border-red-200' },
            ].map(({ label, count, color }) => (
              <div key={label} className={`rounded-xl border px-4 py-3 text-center ${color}`}>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs font-medium mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Insights */}
          <div className="bg-white rounded-xl border border-[#EDE8DC] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#EDE8DC] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-purple-500" />
                <p className="text-sm font-semibold text-[#092137]">AI Analysis — {result.url}</p>
              </div>
              <button
                onClick={analyse}
                className="p-1.5 rounded-lg hover:bg-[#EDE8DC] transition-colors text-[#092137]/50"
                title="Re-analyse"
              >
                <RefreshCw size={14} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {result.insights.map((insight, i) => {
                const s = STATUS_STYLES[insight.status] ?? STATUS_STYLES.warning
                return (
                  <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl ${s.bg}`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${s.dot}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`text-xs font-semibold ${s.text}`}>{insight.category}</p>
                        <span className={`text-xs ${s.text} opacity-60`}>{s.label}</span>
                      </div>
                      <p className={`text-xs ${s.text} opacity-80 leading-relaxed`}>{insight.message}</p>
                    </div>
                  </div>
                )
              })}
              {result.insights.length === 0 && (
                <p className="text-sm text-[#092137]/50 text-center py-4">No insights returned — try a different URL</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="bg-white rounded-xl border border-[#EDE8DC] p-12 text-center">
          <Sparkles size={32} className="mx-auto text-purple-400 mb-3" />
          <p className="text-sm font-medium text-[#092137]">Enter a URL and click Analyse</p>
          <p className="text-xs text-[#092137]/40 mt-1">
            {selectedClient?.website
              ? `${selectedClient.client_name}'s website is pre-filled above`
              : 'Select a client above to pre-fill their website URL'}
          </p>
        </div>
      )}
    </div>
  )
}
