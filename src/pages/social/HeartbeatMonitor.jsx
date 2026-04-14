import { useState, useEffect, useCallback } from 'react'
import { Activity, RefreshCw, Loader2, AlertTriangle, CheckCircle2, XCircle, Clock, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS = {
  ok:           { label: 'Active',        color: 'text-green-700 bg-green-50 border-green-200',  dot: 'bg-green-500',  icon: CheckCircle2 },
  warning:      { label: 'Overdue',       color: 'text-amber-700 bg-amber-50 border-amber-200',  dot: 'bg-amber-400',  icon: AlertTriangle },
  critical:     { label: 'Not Posting',   color: 'text-red-700 bg-red-50 border-red-200',        dot: 'bg-red-500',    icon: XCircle },
  disconnected: { label: 'Disconnected',  color: 'text-gray-600 bg-gray-50 border-gray-200',     dot: 'bg-gray-400',   icon: WifiOff },
  no_posts:     { label: 'No Posts',      color: 'text-purple-700 bg-purple-50 border-purple-200', dot: 'bg-purple-400', icon: Clock },
}

const PLATFORM_LABEL = { facebook: 'Facebook', instagram: 'Instagram' }
const PLATFORM_COLOR = { facebook: '#1877F2', instagram: '#E1306C' }

function StatusBadge({ status }) {
  const s = STATUS[status] ?? STATUS.warning
  const Icon = s.icon
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border', s.color)}>
      <Icon size={11} />
      {s.label}
    </span>
  )
}

function DaysSince({ days }) {
  if (days === null || days === undefined) return <span className="text-xs text-[#092137]/30">—</span>
  const color = days <= 7 ? 'text-green-600' : days <= 14 ? 'text-amber-600' : 'text-red-600'
  return <span className={cn('text-sm font-semibold', color)}>{days}d ago</span>
}

function PlatformDot({ platform }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full text-white"
      style={{ backgroundColor: PLATFORM_COLOR[platform] ?? '#555' }}
    >
      {PLATFORM_LABEL[platform] ?? platform}
    </span>
  )
}

// ── Summary bar ───────────────────────────────────────────────────────────────

function SummaryBar({ checks }) {
  const counts = { ok: 0, warning: 0, critical: 0, disconnected: 0, no_posts: 0 }
  for (const c of checks) counts[c.status] = (counts[c.status] ?? 0) + 1
  const total = checks.length

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {[
        { key: 'ok',           label: 'Active',       bg: 'bg-green-50 border-green-200',   text: 'text-green-700' },
        { key: 'warning',      label: 'Overdue',      bg: 'bg-amber-50 border-amber-200',   text: 'text-amber-700' },
        { key: 'critical',     label: 'Not Posting',  bg: 'bg-red-50 border-red-200',       text: 'text-red-700' },
        { key: 'disconnected', label: 'Disconnected', bg: 'bg-gray-50 border-gray-200',     text: 'text-gray-600' },
        { key: 'no_posts',     label: 'No Posts',     bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
      ].map(({ key, label, bg, text }) => (
        <div key={key} className={cn('rounded-xl border p-4 text-center', bg)}>
          <p className={cn('text-2xl font-bold', text)}>{counts[key]}</p>
          <p className={cn('text-xs mt-0.5', text)}>{label}</p>
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HeartbeatMonitor() {
  const [loading,    setLoading]    = useState(false)
  const [checks,     setChecks]     = useState(null)
  const [checkedAt,  setCheckedAt]  = useState(null)
  const [error,      setError]      = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')

  const runCheck = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/meta-insights?action=heartbeat')
      const data = await res.json()
      if (!data.ok) throw new Error(data.error ?? 'Check failed')
      setChecks(data.checks)
      setCheckedAt(data.checkedAt)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { runCheck() }, [runCheck])

  // Group by client
  const clientMap = {}
  for (const c of (checks ?? [])) {
    if (!clientMap[c.clientId]) {
      clientMap[c.clientId] = { clientName: c.clientName, color: c.color, platforms: [] }
    }
    clientMap[c.clientId].platforms.push(c)
  }

  const clients = Object.values(clientMap)

  // Overall client status = worst platform status
  const STATUS_RANK = { critical: 0, disconnected: 1, warning: 2, no_posts: 3, ok: 4 }
  for (const client of clients) {
    client.worstStatus = client.platforms.reduce(
      (worst, p) => (STATUS_RANK[p.status] < STATUS_RANK[worst] ? p.status : worst),
      'ok'
    )
  }

  // Sort: worst first
  clients.sort((a, b) => (STATUS_RANK[a.worstStatus] ?? 99) - (STATUS_RANK[b.worstStatus] ?? 99))

  const filtered = filterStatus === 'all'
    ? clients
    : clients.filter(c => c.worstStatus === filterStatus)

  const allChecks = checks ?? []
  const hasAlerts = allChecks.some(c => c.status === 'critical' || c.status === 'disconnected')

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#092137]">Heartbeat Monitor</h1>
          <p className="text-sm text-[#092137]/50">
            Checks all connected client pages for recent posts — flags if nothing posted in 7+ days
          </p>
        </div>
        <button
          onClick={runCheck}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-[#EDE8DC] rounded-xl text-sm font-medium text-[#092137] hover:bg-[#F5F1E9] transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {loading ? 'Checking…' : 'Refresh'}
        </button>
      </div>

      {/* Alert banner */}
      {!loading && hasAlerts && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2.5 text-sm text-red-700">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Action required — some client pages haven't posted recently</p>
            <p className="text-red-600/80 mt-0.5">
              Check if Hootsuite is still connected for the flagged accounts below.
            </p>
          </div>
        </div>
      )}

      {/* Last checked */}
      {checkedAt && (
        <p className="text-xs text-[#092137]/40 flex items-center gap-1.5">
          <Clock size={11} />
          Last checked {new Date(checkedAt).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-red-700">
          <XCircle size={15} />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && !checks && (
        <div className="flex items-center justify-center gap-3 py-20 text-[#092137]/50">
          <Loader2 size={22} className="animate-spin" />
          <span className="text-sm">Checking all client pages…</span>
        </div>
      )}

      {checks && !loading && (
        <>
          {/* Summary */}
          <SummaryBar checks={allChecks} />

          {/* Filter pills */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'critical', 'disconnected', 'warning', 'ok'].map(f => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                  filterStatus === f
                    ? 'bg-[#092137] text-white border-[#092137]'
                    : 'bg-white text-[#092137]/60 border-[#EDE8DC] hover:border-[#092137]/30'
                )}
              >
                {f === 'all' ? `All (${clients.length})` :
                 f === 'critical' ? 'Not Posting' :
                 f === 'disconnected' ? 'Disconnected' :
                 f === 'warning' ? 'Overdue' : 'Active'}
              </button>
            ))}
          </div>

          {/* Client table */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#EDE8DC] p-10 text-center">
              <Activity size={28} className="mx-auto text-[#092137]/20 mb-2" />
              <p className="text-sm text-[#092137]/40">No clients match this filter</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#EDE8DC] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#F5F1E9] text-xs font-semibold text-[#092137]/60 uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-5 py-3">Client</th>
                    <th className="text-left px-5 py-3">Platform</th>
                    <th className="text-center px-4 py-3">Status</th>
                    <th className="text-center px-4 py-3">Last Post</th>
                    <th className="text-left px-5 py-3">Last Posted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(client =>
                    client.platforms.map((p, pi) => {
                      const isFirst = pi === 0
                      const rowBg = p.status === 'critical'     ? 'bg-red-50/40' :
                                    p.status === 'disconnected'  ? 'bg-gray-50/60' :
                                    p.status === 'warning'       ? 'bg-amber-50/30' : ''
                      return (
                        <tr key={`${p.clientId}-${p.platform}`} className={cn('hover:bg-[#F5F1E9]/40 transition-colors', rowBg)}>
                          {/* Client name — only on first platform row */}
                          <td className="px-5 py-3.5">
                            {isFirst && (
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: client.color ?? '#092137' }}
                                />
                                <span className="font-semibold text-[#092137]">{client.clientName}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <PlatformDot platform={p.platform} />
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <StatusBadge status={p.status} />
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <DaysSince days={p.daysSince} />
                          </td>
                          <td className="px-5 py-3.5 text-xs text-[#092137]/50">
                            {p.lastPost
                              ? new Date(p.lastPost).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                              : p.tokenExpired
                              ? <span className="flex items-center gap-1 text-gray-500"><WifiOff size={11} /> Token expired — reconnect in Connected Accounts</span>
                              : '—'}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty — no connected accounts */}
          {clients.length === 0 && (
            <div className="bg-white rounded-xl border border-[#EDE8DC] p-12 text-center">
              <Wifi size={32} className="mx-auto text-[#092137]/20 mb-3" />
              <p className="text-sm font-medium text-[#092137]">No connected social accounts found</p>
              <p className="text-xs text-[#092137]/40 mt-1">
                Connect client Facebook or Instagram pages via Connected Accounts
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
