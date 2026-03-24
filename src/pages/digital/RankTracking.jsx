import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus, Link2, Loader2, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react'
import { useDigitalClient } from '@/lib/digitalClient'
import { useLocation } from 'react-router-dom'

function PositionBadge({ position }) {
  const color = position <= 3 ? '#10B981' : position <= 10 ? '#3B82F6' : position <= 20 ? '#F59E0B' : '#9CA3AF'
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
      style={{ backgroundColor: color }}
    >
      {position <= 100 ? Math.round(position) : '100+'}
    </div>
  )
}

function CtrBar({ ctr }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-400"
          style={{ width: `${Math.min(ctr * 5, 100)}%` }}
        />
      </div>
      <span className="text-xs text-[#092137]/50">{ctr}%</span>
    </div>
  )
}

export default function RankTracking() {
  const { selectedClient } = useDigitalClient()
  const location = useLocation()
  const params   = new URLSearchParams(location.search)

  const [connection, setConnection] = useState(null)   // { sites, googleEmail }
  const [connLoading, setConnLoading] = useState(false)
  const [selectedSite, setSelectedSite] = useState('')
  const [days, setDays]     = useState('28')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)
  const [data, setData]     = useState(null)
  const [tab, setTab]       = useState('queries')

  // Show success/error from OAuth callback
  const gscConnected = params.get('gsc_connected') === '1'
  const gscError     = params.get('gsc_error')

  // Check connection status for selected client
  useEffect(() => {
    if (!selectedClient) { setConnection(null); setData(null); return }
    checkConnection()
  }, [selectedClient?.id])

  async function checkConnection() {
    setConnLoading(true)
    try {
      // Try to fetch with a dummy siteUrl to see if connection exists
      const res = await fetch(`/api/gsc-data?clientId=${selectedClient.id}&siteUrl=https://check.test`)
      const json = await res.json()
      if (res.status === 404) {
        setConnection(null)
      } else {
        // Connection exists — get sites list from Supabase via the connection
        // We'll re-use the error response which tells us connection exists
        setConnection({ exists: true })
      }
    } catch (_) {
      setConnection(null)
    } finally {
      setConnLoading(false)
    }
  }

  function connectGSC() {
    if (!selectedClient) return
    window.location.href = `/api/gsc-auth?clientId=${selectedClient.id}`
  }

  async function fetchData() {
    if (!selectedClient || !selectedSite) return
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(
        `/api/gsc-data?clientId=${selectedClient.id}&siteUrl=${encodeURIComponent(selectedSite)}&days=${days}`
      )
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
      setConnection({ exists: true, googleEmail: json.googleEmail, sites: [] })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // After successful connection, re-check
  useEffect(() => {
    if (gscConnected && selectedClient) checkConnection()
  }, [gscConnected])

  const rows = tab === 'queries' ? (data?.queries ?? []) : (data?.pages ?? [])

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[#092137]">Rank Tracking</h1>
        <p className="text-sm text-[#092137]/50">
          {selectedClient
            ? `Google Search Console data for ${selectedClient.client_name}`
            : 'Connect Google Search Console to track keyword rankings'}
        </p>
      </div>

      {/* OAuth success/error banners */}
      {gscConnected && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 size={15} />
          Search Console connected successfully!
        </div>
      )}
      {gscError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-red-700">
          <AlertCircle size={15} />
          {decodeURIComponent(gscError)}
        </div>
      )}

      {!selectedClient ? (
        <div className="bg-white rounded-xl border border-[#EDE8DC] p-12 text-center">
          <TrendingUp size={32} className="mx-auto text-blue-400 mb-3" />
          <p className="text-sm font-medium text-[#092137]">Select a client to get started</p>
          <p className="text-xs text-[#092137]/40 mt-1">Choose a client from the selector above</p>
        </div>
      ) : connLoading ? (
        <div className="bg-white rounded-xl border border-[#EDE8DC] p-10 text-center">
          <Loader2 size={24} className="mx-auto text-blue-400 animate-spin mb-2" />
          <p className="text-sm text-[#092137]/50">Checking Search Console connection…</p>
        </div>
      ) : !connection ? (
        /* Not connected */
        <div className="bg-white rounded-xl border border-[#EDE8DC] p-10 text-center space-y-4">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl mx-auto flex items-center justify-center">
            <Link2 size={24} className="text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#092137]">Connect Google Search Console</p>
            <p className="text-xs text-[#092137]/50 mt-1 max-w-sm mx-auto leading-relaxed">
              Grant WOM read-only access to {selectedClient.client_name}'s Search Console to see real keyword rankings, clicks, and impressions.
            </p>
          </div>
          <button
            onClick={connectGSC}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            <ExternalLink size={15} />
            Connect with Google
          </button>
          <p className="text-xs text-[#092137]/30">
            Read-only access · Client must verify their domain in Search Console first
          </p>
        </div>
      ) : (
        /* Connected — show data controls */
        <>
          <div className="bg-white rounded-xl border border-[#EDE8DC] p-5">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-[#092137]/50 mb-1.5 block">Search Console Property</label>
                <input
                  value={selectedSite}
                  onChange={e => setSelectedSite(e.target.value)}
                  placeholder="https://example.com.au/"
                  className="w-full px-3 py-2.5 text-sm border border-[#EDE8DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#092137]/50 mb-1.5 block">Date Range</label>
                <select
                  value={days}
                  onChange={e => setDays(e.target.value)}
                  className="px-3 py-2.5 text-sm border border-[#EDE8DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                >
                  <option value="7">Last 7 days</option>
                  <option value="28">Last 28 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </div>
              <button
                onClick={fetchData}
                disabled={loading || !selectedSite}
                className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <TrendingUp size={15} />}
                {loading ? 'Loading…' : 'Fetch Data'}
              </button>
              <button
                onClick={connectGSC}
                className="px-4 py-2.5 border border-[#EDE8DC] text-[#092137]/60 text-sm rounded-xl hover:bg-[#F5F1E9] transition-colors"
              >
                Reconnect
              </button>
            </div>
            {connection.googleEmail && (
              <p className="text-xs text-[#092137]/40 mt-2 ml-1">
                Connected as {connection.googleEmail}
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2 text-sm text-red-700">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {data && !loading && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Total Clicks',  value: data.queries.reduce((s, r) => s + r.clicks, 0).toLocaleString() },
                  { label: 'Impressions',   value: data.queries.reduce((s, r) => s + r.impressions, 0).toLocaleString() },
                  { label: 'Avg. CTR',      value: data.queries.length ? (data.queries.reduce((s, r) => s + r.ctr, 0) / data.queries.length).toFixed(1) + '%' : '—' },
                  { label: 'Avg. Position', value: data.queries.length ? (data.queries.reduce((s, r) => s + r.position, 0) / data.queries.length).toFixed(1) : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white rounded-xl border border-[#EDE8DC] p-4 text-center">
                    <p className="text-xl font-bold text-[#092137]">{value}</p>
                    <p className="text-xs text-[#092137]/50 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div className="bg-white rounded-xl border border-[#EDE8DC] overflow-hidden">
                <div className="flex border-b border-[#EDE8DC]">
                  {[{ id: 'queries', label: 'Top Keywords' }, { id: 'pages', label: 'Top Pages' }].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`px-5 py-3 text-sm font-medium transition-colors ${tab === t.id ? 'text-blue-600 border-b-2 border-blue-600 -mb-px' : 'text-[#092137]/50 hover:text-[#092137]'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                  <div className="ml-auto px-5 py-3 text-xs text-[#092137]/40 self-center">
                    {data.dateRange.start} → {data.dateRange.end}
                  </div>
                </div>

                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#EDE8DC]">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-[#092137]/40 uppercase tracking-wider">
                        {tab === 'queries' ? 'Keyword' : 'Page'}
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-[#092137]/40 uppercase tracking-wider">Position</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-[#092137]/40 uppercase tracking-wider">Clicks</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-[#092137]/40 uppercase tracking-wider">Impressions</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-[#092137]/40 uppercase tracking-wider">CTR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((row, i) => (
                      <tr key={i} className="hover:bg-[#F5F1E9]/50 transition-colors">
                        <td className="px-5 py-3.5 text-sm text-[#092137] max-w-xs truncate">
                          {tab === 'queries' ? row.keyword : (
                            <span className="text-xs text-[#092137]/60 truncate block">
                              {row.page.replace(/^https?:\/\/[^/]+/, '') || '/'}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5"><PositionBadge position={row.position} /></td>
                        <td className="px-5 py-3.5 text-sm font-medium text-[#092137]">{row.clicks.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-sm text-[#092137]/60">{row.impressions.toLocaleString()}</td>
                        <td className="px-5 py-3.5"><CtrBar ctr={row.ctr} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length === 0 && (
                  <p className="text-sm text-center text-[#092137]/40 py-8">No data for this date range</p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
