import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Trash2, RefreshCw, Loader2, TrendingUp, TrendingDown,
  Minus, Search, AlertCircle, ChevronUp, ChevronDown, ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { useDigitalClient } from '@/lib/digitalClient'
import { formatNumber } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

function positionColor(pos) {
  if (!pos) return '#9CA3AF'
  if (pos <= 3)  return '#10B981'
  if (pos <= 10) return '#3B82F6'
  if (pos <= 20) return '#F59E0B'
  return '#EF4444'
}

function difficultyColor(d) {
  if (d === null || d === undefined) return '#9CA3AF'
  if (d <= 29) return '#10B981'
  if (d <= 59) return '#F59E0B'
  return '#EF4444'
}

function SerpFeatureBadge({ feature }) {
  const labels = {
    featured_snippet:   { label: 'Featured', color: '#7C3AED' },
    local_pack:         { label: 'Local',     color: '#0891B2' },
    knowledge_graph:    { label: 'Knowledge', color: '#EA580C' },
    video:              { label: 'Video',      color: '#DC2626' },
    image:              { label: 'Image',      color: '#0284C7' },
    people_also_ask:    { label: 'PAA',        color: '#65A30D' },
    shopping:           { label: 'Shopping',   color: '#CA8A04' },
    top_stories:        { label: 'News',       color: '#9333EA' },
    answer_box:         { label: 'Answer',     color: '#0891B2' },
    site_links:         { label: 'Sitelinks',  color: '#2563EB' },
  }
  const info = labels[feature]
  if (!info) return null
  return (
    <span
      className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold text-white mr-1"
      style={{ backgroundColor: info.color }}
    >
      {info.label}
    </span>
  )
}

function ChangeCell({ change }) {
  if (change === null || change === undefined) return <span className="text-[#092137]/30 text-sm">—</span>
  if (change === 0) return (
    <span className="inline-flex items-center gap-0.5 text-sm text-[#092137]/40">
      <Minus size={12} /> 0
    </span>
  )
  const improved = change > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-sm font-semibold ${improved ? 'text-green-600' : 'text-red-500'}`}>
      {improved ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {improved ? '+' : ''}{change}
    </span>
  )
}

// ── Add keywords modal ────────────────────────────────────────────────────────

function AddKeywordsModal({ domain, onAdd, onClose }) {
  const [text, setText]       = useState('')
  const [saving, setSaving]   = useState(false)

  async function handleAdd() {
    const keywords = text.split('\n').map(k => k.trim()).filter(Boolean)
    if (!keywords.length) return
    setSaving(true)
    await onAdd(keywords)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(9,33,55,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-[#092137] mb-1">Add Keywords</h3>
        <p className="text-xs text-[#092137]/50 mb-4">One keyword per line. Rankings will be checked for <strong>{domain || 'the client domain'}</strong>.</p>
        <textarea
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={'plumber perth\nbest plumbers near me\nemergency plumbing'}
          rows={8}
          className="w-full text-sm border border-[#EDE8DC] rounded-xl px-4 py-3 text-[#092137] resize-none focus:outline-none focus:border-[#092137]"
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleAdd}
            disabled={saving || !text.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-[#092137] disabled:opacity-40"
            style={{ backgroundColor: '#F0A629' }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {saving ? 'Adding…' : 'Add Keywords'}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#092137]/60 border border-[#EDE8DC] hover:bg-[#F5F1E9]">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const SORT_FIELDS = ['keyword', 'position', 'change', 'volume', 'difficulty']
const PERIODS = [
  { label: '7D',  days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: 'All', days: 0 },
]

export default function RankTracker() {
  const { selectedClient } = useDigitalClient()

  const [results, setResults]     = useState([])
  const [loading, setLoading]     = useState(false)
  const [checking, setChecking]   = useState(false)
  const [lastCost, setLastCost]   = useState(null)
  const [showAdd, setShowAdd]     = useState(false)
  const [search, setSearch]       = useState('')
  const [sortField, setSortField] = useState('position')
  const [sortAsc, setSortAsc]     = useState(true)
  const [selected, setSelected]   = useState(new Set())
  const [period, setPeriod]       = useState(30)

  const clientId = selectedClient?.id
  const domain   = selectedClient?.website?.replace(/^https?:\/\//, '').replace(/\/$/, '') ?? ''

  const load = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const url  = `/api/rank-tracker?action=results&clientId=${clientId}${period ? `&days=${period}` : ''}`
      const res  = await fetch(url)
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Could not load keyword rankings')
    } finally {
      setLoading(false)
    }
  }, [clientId, period])

  useEffect(() => { setResults([]); load() }, [clientId, period])

  async function handleAdd(keywords) {
    try {
      await fetch(`/api/rank-tracker?action=add&clientId=${clientId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ keywords, domain }),
      })
      toast.success(`${keywords.length} keyword${keywords.length > 1 ? 's' : ''} added`)
      load()
    } catch {
      toast.error('Failed to add keywords')
    }
  }

  async function handleDelete(keywordId) {
    try {
      await fetch(`/api/rank-tracker?action=delete&clientId=${clientId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ keywordId }),
      })
      setResults(prev => prev.filter(r => r.id !== keywordId))
      toast.success('Keyword removed')
    } catch {
      toast.error('Failed to remove keyword')
    }
  }

  async function handleDeleteSelected() {
    for (const id of selected) await handleDelete(id)
    setSelected(new Set())
  }

  async function handleCheck() {
    if (!clientId) return
    setChecking(true)
    try {
      const res  = await fetch(`/api/rank-tracker?action=check&clientId=${clientId}`, { method: 'POST' })
      const data = await res.json()
      if (data.costUsd != null) setLastCost(data.costUsd)
      const costStr = data.costUsd != null ? ` · Cost: $${data.costUsd.toFixed(4)} USD` : ''
      toast.success(`Checked ${data.checked} of ${data.total} keywords${costStr}`)
      load()
    } catch {
      toast.error('Rank check failed')
    } finally {
      setChecking(false)
    }
  }

  function toggleSort(field) {
    if (sortField === field) setSortAsc(a => !a)
    else { setSortField(field); setSortAsc(true) }
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(r => r.id)))
  }

  const filtered = results
    .filter(r => !search || r.keyword.includes(search.toLowerCase()))
    .sort((a, b) => {
      let va = a[sortField], vb = b[sortField]
      if (sortField === 'change')     { va = a.change ?? -9999; vb = b.change ?? -9999 }
      if (sortField === 'position')   { va = a.position ?? 999; vb = b.position ?? 999 }
      if (sortField === 'volume')     { va = a.volume ?? 0; vb = b.volume ?? 0 }
      if (sortField === 'difficulty') { va = a.difficulty ?? 0; vb = b.difficulty ?? 0 }
      if (sortField === 'keyword')    { va = a.keyword; vb = b.keyword }
      if (va < vb) return sortAsc ? -1 : 1
      if (va > vb) return sortAsc ? 1 : -1
      return 0
    })

  function SortIcon({ field }) {
    if (sortField !== field) return <ChevronUp size={11} className="opacity-20" />
    return sortAsc ? <ChevronUp size={11} className="opacity-70" /> : <ChevronDown size={11} className="opacity-70" />
  }

  function Th({ field, label, className = '' }) {
    return (
      <th
        className={`px-4 py-3 text-left text-xs font-semibold text-[#092137]/40 uppercase tracking-wider cursor-pointer select-none hover:text-[#092137]/70 whitespace-nowrap ${className}`}
        onClick={() => toggleSort(field)}
      >
        <span className="inline-flex items-center gap-1">{label} <SortIcon field={field} /></span>
      </th>
    )
  }

  if (!clientId) {
    return (
      <div className="flex items-start gap-4 bg-orange-50 border border-orange-100 rounded-xl p-6">
        <AlertCircle size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-orange-800">No client selected</p>
          <p className="text-xs text-orange-600 mt-0.5">Select a client to manage their tracked keywords.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#092137]">Rank Tracker</h1>
          <p className="text-sm text-[#092137]/50 mt-0.5">
            {domain ? `Tracking rankings for ${domain}` : 'Track keyword positions via DataForSEO'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-red-600 bg-red-50 border border-red-100 hover:bg-red-100"
            >
              <Trash2 size={13} /> Delete ({selected.size})
            </button>
          )}
          <button
            onClick={handleCheck}
            disabled={checking || results.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-[#EDE8DC] bg-white text-[#092137] hover:bg-[#F5F1E9] disabled:opacity-40"
          >
            {checking ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {checking ? 'Checking…' : 'Check Rankings'}
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-[#092137]"
            style={{ backgroundColor: '#F0A629' }}
          >
            <Plus size={14} /> Add Keywords
          </button>
        </div>
      </div>

      {/* Stats row */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Keywords',    value: results.length },
            { label: 'Top 3',      value: results.filter(r => r.position && r.position <= 3).length,  color: '#10B981' },
            { label: 'Top 10',     value: results.filter(r => r.position && r.position <= 10).length, color: '#3B82F6' },
            { label: 'Not Ranked', value: results.filter(r => !r.position).length,                    color: '#9CA3AF' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-[#EDE8DC] p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: s.color ?? '#092137' }}>{s.value}</p>
              <p className="text-xs text-[#092137]/50 mt-1 font-medium uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#EDE8DC] overflow-hidden">

        {/* Table toolbar */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#EDE8DC] flex-wrap">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#092137]/30" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search keywords…"
                className="pl-8 pr-4 py-1.5 text-sm rounded-lg border border-[#EDE8DC] text-[#092137] bg-[#F5F1E9] focus:outline-none w-52"
              />
            </div>
            {/* Period selector */}
            <div className="flex items-center gap-1 bg-[#F5F1E9] rounded-lg p-0.5">
              {PERIODS.map(p => (
                <button
                  key={p.label}
                  onClick={() => setPeriod(p.days)}
                  className="px-3 py-1 rounded-md text-xs font-semibold transition-all"
                  style={period === p.days
                    ? { backgroundColor: '#092137', color: '#F5F1E9' }
                    : { color: 'rgba(9,33,55,0.45)' }
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-[#092137]/40">{filtered.length} keyword{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-[#092137]/30" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-[#092137]/40 mb-3">
              {results.length === 0 ? 'No keywords tracked yet.' : 'No results match your search.'}
            </p>
            {results.length === 0 && (
              <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#F0A629] hover:underline">
                <Plus size={13} /> Add your first keywords
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: '#F9F7F3', borderBottom: '1px solid #EDE8DC' }}>
                <tr>
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      className="rounded"
                    />
                  </th>
                  <Th field="keyword"    label="Keyword" />
                  <Th field="position"   label="Google" />
                  <Th field="change"     label="Change" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#092137]/40 uppercase tracking-wider">Google URL</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#092137]/40 uppercase tracking-wider">SERP Features</th>
                  <Th field="volume"     label="Volume" />
                  <Th field="difficulty" label="Difficulty" />
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr
                    key={row.id}
                    className="hover:bg-[#F9F7F3] transition-colors"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F5F1E9' : 'none' }}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleSelect(row.id)}
                        className="rounded"
                      />
                    </td>

                    {/* Keyword */}
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-[#092137]">{row.keyword}</span>
                    </td>

                    {/* Google position */}
                    <td className="px-4 py-3">
                      {row.position ? (
                        <div
                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-bold text-white"
                          style={{ backgroundColor: positionColor(row.position) }}
                        >
                          {row.position}
                        </div>
                      ) : (
                        <span className="text-sm text-[#092137]/30">—</span>
                      )}
                    </td>

                    {/* Change */}
                    <td className="px-4 py-3">
                      <ChangeCell change={row.change} />
                    </td>

                    {/* URL */}
                    <td className="px-4 py-3 max-w-[180px]">
                      {row.url ? (
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1 truncate"
                          title={row.url}
                        >
                          <span className="truncate">{row.url.replace(/^https?:\/\/[^/]+/, '') || '/'}</span>
                          <ExternalLink size={10} className="flex-shrink-0" />
                        </a>
                      ) : (
                        <span className="text-xs text-[#092137]/30">Not ranking</span>
                      )}
                    </td>

                    {/* SERP features */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-0.5">
                        {(row.serpFeatures ?? []).slice(0, 3).map(f => (
                          <SerpFeatureBadge key={f} feature={f} />
                        ))}
                        {!row.serpFeatures?.length && <span className="text-xs text-[#092137]/30">—</span>}
                      </div>
                    </td>

                    {/* Volume */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-[#092137]/70">
                        {row.volume != null ? formatNumber(row.volume) : '—'}
                      </span>
                    </td>

                    {/* Difficulty */}
                    <td className="px-4 py-3">
                      {row.difficulty != null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-[#F5F1E9] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${row.difficulty}%`, backgroundColor: difficultyColor(row.difficulty) }}
                            />
                          </div>
                          <span className="text-xs font-semibold" style={{ color: difficultyColor(row.difficulty) }}>
                            {row.difficulty}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-[#092137]/30">—</span>
                      )}
                    </td>

                    {/* Delete */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(row.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#092137]/20 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Last checked + cost */}
        {results.some(r => r.lastChecked) && (
          <div className="px-4 py-2 border-t border-[#F5F1E9] flex items-center justify-between">
            <p className="text-xs text-[#092137]/30">
              Last checked: {new Date(results.find(r => r.lastChecked)?.lastChecked).toLocaleString('en-AU')}
            </p>
            {lastCost != null && (
              <p className="text-xs text-[#092137]/40">
                Last check cost: <span className="font-medium text-[#092137]/60">${lastCost.toFixed(4)} USD</span>
              </p>
            )}
          </div>
        )}
      </div>

      {showAdd && <AddKeywordsModal domain={domain} onAdd={handleAdd} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
