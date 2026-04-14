import { useState, useEffect } from 'react'
import { Zap, Smartphone, Monitor, Loader2, AlertCircle, RefreshCw, History } from 'lucide-react'
import { useDigitalClient } from '@/lib/digitalClient'
import { useSiteSpeedHistory } from '@/lib/hooks'

function ScoreRing({ score, label }) {
  const color = score >= 90 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444'
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center border-4 font-bold text-lg"
        style={{ borderColor: color, color }}
      >
        {score}
      </div>
      <p className="text-xs text-[#092137]/50 text-center">{label}</p>
    </div>
  )
}

function vitalStatus(name, score) {
  if (score === null) return 'moderate'
  if (score >= 0.9) return 'good'
  if (score >= 0.5) return 'moderate'
  return 'poor'
}

const VITAL_STYLE = {
  good:     'text-green-600 bg-green-50',
  moderate: 'text-amber-600 bg-amber-50',
  poor:     'text-red-600 bg-red-50',
}

export default function SiteSpeed() {
  const { selectedClient } = useDigitalClient()
  const [url, setUrl]     = useState('')
  const [device, setDevice] = useState('mobile')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)
  const [result, setResult] = useState(null)

  const { data: history, refetch: refetchHistory } = useSiteSpeedHistory({
    clientId: selectedClient?.id,
    limit: 10,
  })

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

  async function run(strategy) {
    if (!url) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ url, strategy })
      if (selectedClient?.id) params.set('clientId', selectedClient.id)
      const res = await fetch(`/api/site-speed?${params}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      refetchHistory()
    }
  }

  async function analyse() {
    await run(device)
  }

  async function switchDevice(d) {
    setDevice(d)
    if (result) await run(d)
  }

  const scores = result?.scores

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[#092137]">Site Speed</h1>
        <p className="text-sm text-[#092137]/50">
          {selectedClient
            ? `Google PageSpeed Insights for ${selectedClient.client_name}`
            : 'Google PageSpeed Insights — Core Web Vitals analysis'}
        </p>
      </div>

      {/* URL input */}
      <div className="bg-white rounded-xl border border-[#EDE8DC] p-5">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Zap size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#092137]/30" />
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && analyse()}
              placeholder="Enter URL to test (e.g. https://example.com.au)"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#EDE8DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400"
            />
          </div>
          <button
            onClick={analyse}
            disabled={loading || !url}
            className="px-5 py-2.5 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
            {loading ? 'Analysing…' : 'Analyse'}
          </button>
        </div>
        <p className="text-xs text-[#092137]/40 mt-2 ml-1">
          Powered by Google PageSpeed Insights — free, no usage limits
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2 text-sm text-red-700">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          <div className="bg-white rounded-xl border border-[#EDE8DC] p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm font-semibold text-[#092137]">{result.url}</p>
                {result.fetchTime && (
                  <p className="text-xs text-[#092137]/40">
                    Tested {new Date(result.fetchTime).toLocaleString('en-AU')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-[#EDE8DC] rounded-full p-0.5 gap-0.5">
                  {[{id:'mobile', icon: Smartphone}, {id:'desktop', icon: Monitor}].map(({id, icon: Icon}) => (
                    <button
                      key={id}
                      onClick={() => switchDevice(id)}
                      disabled={loading}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all disabled:opacity-50 ${device === id ? 'bg-white shadow-sm text-[#092137]' : 'text-[#092137]/50'}`}
                    >
                      <Icon size={12} /><span className="capitalize">{id}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={analyse}
                  disabled={loading}
                  className="p-1.5 rounded-lg hover:bg-[#EDE8DC] transition-colors text-[#092137]/50 disabled:opacity-50"
                  title="Re-test"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Score rings */}
            {scores && (
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  ['Performance',    scores.performance],
                  ['Accessibility',  scores.accessibility],
                  ['Best Practices', scores.bestPractices],
                  ['SEO',            scores.seo],
                ].map(([label, score]) => (
                  <ScoreRing key={label} score={score} label={label} />
                ))}
              </div>
            )}

            {/* Core Web Vitals */}
            {result.vitals?.length > 0 && (
              <>
                <p className="text-xs font-semibold text-[#092137]/40 uppercase tracking-wider mb-3">Core Web Vitals</p>
                <div className="space-y-2">
                  {result.vitals.map(v => {
                    const status = vitalStatus(v.name, v.score)
                    return (
                      <div key={v.name} className="flex items-center gap-3 text-sm">
                        <span className="flex-1 text-[#092137]/70">{v.name}</span>
                        <span className="font-mono text-xs text-[#092137]/60">{v.value}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${VITAL_STYLE[status]}`}>
                          {status}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Opportunities */}
          {result.opportunities?.length > 0 && (
            <div className="bg-white rounded-xl border border-[#EDE8DC] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#EDE8DC]">
                <p className="text-sm font-semibold text-[#092137]">Improvement Opportunities</p>
              </div>
              <div className="divide-y divide-gray-50">
                {result.opportunities.map((op, i) => (
                  <div key={i} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-[#092137]">{op.title}</p>
                      {op.savings && (
                        <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                          {op.savings}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#092137]/50 mt-1 leading-relaxed">{op.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="bg-white rounded-xl border border-[#EDE8DC] p-12 text-center">
          <Zap size={32} className="mx-auto text-amber-400 mb-3" />
          <p className="text-sm font-medium text-[#092137]">Enter a URL and click Analyse</p>
          <p className="text-xs text-[#092137]/40 mt-1">
            {selectedClient?.website
              ? `${selectedClient.client_name}'s website is pre-filled above`
              : 'Select a client above to pre-fill their website URL'}
          </p>
        </div>
      )}

      {/* History panel */}
      {history?.length > 0 && (
        <div className="bg-white rounded-xl border border-[#EDE8DC] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#EDE8DC] flex items-center gap-2">
            <History size={14} className="text-[#092137]/40" />
            <p className="text-sm font-semibold text-[#092137]">Recent Tests</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F1E9] text-xs font-semibold text-[#092137]/60 uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-2.5">URL</th>
                  <th className="text-center px-3 py-2.5">Device</th>
                  <th className="text-center px-3 py-2.5">Perf</th>
                  <th className="text-center px-3 py-2.5">Access.</th>
                  <th className="text-center px-3 py-2.5">SEO</th>
                  <th className="text-right px-5 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map(row => {
                  const sc = row.scores ?? {}
                  const perfColor = sc.performance >= 90 ? '#10B981' : sc.performance >= 50 ? '#F59E0B' : '#EF4444'
                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-[#F5F1E9]/40 cursor-pointer"
                      onClick={() => { setUrl(row.url); setDevice(row.strategy); setResult({ ...row, fetchTime: row.fetch_time }) }}
                    >
                      <td className="px-5 py-3 text-[#092137]/70 truncate max-w-xs">{row.url}</td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-xs capitalize text-[#092137]/50">{row.strategy}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-xs font-bold" style={{ color: perfColor }}>{sc.performance ?? '—'}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-xs text-[#092137]/70">{sc.accessibility ?? '—'}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-xs text-[#092137]/70">{sc.seo ?? '—'}</span>
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-[#092137]/40">
                        {new Date(row.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
