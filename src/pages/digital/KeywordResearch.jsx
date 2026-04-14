import { useState, useEffect } from 'react'
import {
  Search, TrendingUp, TrendingDown, Minus, Globe, Lightbulb,
  LayoutList, Loader2, ExternalLink, AlertCircle, Download, Info,
  History, ListChecks, X, CheckSquare,
} from 'lucide-react'
import { useDigitalClient } from '@/lib/digitalClient'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useKeywordResearchHistory } from '@/lib/hooks'

// ── Constants ────────────────────────────────────────────────────────────────

const MODES = [
  { id: 'domain', label: 'Domain Analysis',  icon: Globe,      desc: 'See every keyword a domain ranks for' },
  { id: 'ideas',  label: 'Keyword Ideas',     icon: Lightbulb,  desc: 'Find related keywords for a seed term' },
  { id: 'serp',   label: 'SERP Preview',      icon: LayoutList, desc: "Who's ranking top 10 right now" },
]

const LOCATIONS = [
  { code: 2036,  label: 'Australia' },
  { code: 2840,  label: 'United States' },
  { code: 2826,  label: 'United Kingdom' },
  { code: 2124,  label: 'Canada' },
  { code: 2554,  label: 'New Zealand' },
]

// ── Small helpers ─────────────────────────────────────────────────────────────

function fmtVol(n) {
  if (n == null) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

function fmtCpc(n) {
  if (n == null) return '—'
  return '$' + Number(n).toFixed(2)
}

function DifficultyBar({ score }) {
  if (score == null) return <span className="text-xs text-[#092137]/30">—</span>
  const color = score >= 70 ? '#EF4444' : score >= 40 ? '#F59E0B' : '#10B981'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-medium" style={{ color }}>{score}</span>
    </div>
  )
}

function TrendSparkline({ monthly }) {
  if (!monthly?.length) return <Minus size={14} className="text-gray-300" />
  const recent = monthly.slice(-6)
  const vals   = recent.map(m => m.search_volume ?? 0)
  const first  = vals[0]
  const last   = vals[vals.length - 1]
  if (last > first * 1.1)  return <TrendingUp   size={14} className="text-green-500" />
  if (last < first * 0.9)  return <TrendingDown size={14} className="text-red-400" />
  return <Minus size={14} className="text-gray-400" />
}

function CompetitionDot({ val }) {
  if (val == null) return <span className="text-xs text-[#092137]/30">—</span>
  const label = val < 0.33 ? 'Low' : val < 0.66 ? 'Med' : 'High'
  const color = val < 0.33 ? 'bg-green-500' : val < 0.66 ? 'bg-yellow-400' : 'bg-red-500'
  return (
    <span className="flex items-center gap-1.5 text-xs text-[#092137]/70">
      <span className={cn('w-2 h-2 rounded-full', color)} />
      {label}
    </span>
  )
}

// ── Export helpers ────────────────────────────────────────────────────────────

function exportCsv(rows, filename) {
  if (!rows?.length) return
  const headers = Object.keys(rows[0]).join(',')
  const lines   = rows.map(r =>
    Object.values(r).map(v => (typeof v === 'string' && v.includes(',') ? `"${v}"` : v ?? '')).join(',')
  )
  const blob = new Blob([headers + '\n' + lines.join('\n')], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function exportListCsv(kwMap) {
  const rows = [...kwMap.values()].map(r => ({
    keyword:    r.keyword,
    volume:     r.volume ?? '',
    difficulty: r.difficulty ?? '',
    cpc:        r.cpc ?? '',
    competition: r.competition ?? '',
    position:   r.position ?? '',
    url:        r.url ?? '',
  }))
  exportCsv(rows, 'keyword-list.csv')
}

// ── Keyword list tray ─────────────────────────────────────────────────────────

function KeywordListTray({ kwMap, onRemove, onClear }) {
  const [open, setOpen] = useState(false)
  const count = kwMap.size
  if (count === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="w-80 bg-white rounded-xl border border-[#EDE8DC] shadow-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#EDE8DC] flex items-center justify-between">
            <p className="text-sm font-semibold text-[#092137]">Keyword List ({count})</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportListCsv(kwMap)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <Download size={12} /> Export CSV
              </button>
              <button onClick={() => setOpen(false)} className="text-[#092137]/30 hover:text-[#092137]">
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
            {[...kwMap.values()].map(row => (
              <div key={row.keyword} className="flex items-center gap-2 px-4 py-2.5 group">
                <span className="flex-1 text-sm text-[#092137] truncate">{row.keyword}</span>
                {row.volume != null && (
                  <span className="text-xs text-[#092137]/40 flex-shrink-0">{fmtVol(row.volume)}</span>
                )}
                <button
                  onClick={() => onRemove(row.keyword)}
                  className="opacity-0 group-hover:opacity-100 text-[#092137]/30 hover:text-red-500 transition-opacity flex-shrink-0"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
          <div className="px-4 py-2.5 border-t border-[#EDE8DC] flex justify-between items-center">
            <button onClick={onClear} className="text-xs text-red-400 hover:text-red-600">Clear all</button>
            <button
              onClick={() => exportListCsv(kwMap)}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 flex items-center gap-1.5"
            >
              <Download size={12} /> Export ({count})
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-full shadow-lg hover:bg-blue-700 transition-colors"
      >
        <ListChecks size={16} />
        Keyword List
        <span className="bg-white text-blue-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {count}
        </span>
      </button>
    </div>
  )
}

// ── Domain Analysis results ──────────────────────────────────────────────────

function DomainResults({ items, domain, source, kwMap, onToggle, onToggleAll }) {
  if (!items?.length) return (
    <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-900">
      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold">No keywords found for {domain}</p>
        <p className="mt-1 text-yellow-800/70">The domain may be new, have very low authority, or not indexed yet. Try a competitor domain instead.</p>
      </div>
    </div>
  )

  const isAdsSuggestion = source === 'ads_suggestions'
  const allSelected = items.every(r => kwMap.has(r.keyword))

  return (
    <div className="space-y-3">
      {isAdsSuggestion && (
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
          <Info size={15} className="flex-shrink-0 mt-0.5" />
          <p>
            <span className="font-semibold">Showing Google Ads keyword suggestions</span> — this domain doesn't have enough organic ranking data in DataForSEO's database yet.
            These are keywords Google considers relevant to the site. Position data isn't available for this source.
          </p>
        </div>
      )}
      <div className="bg-white rounded-xl border border-[#EDE8DC] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#EDE8DC] flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#092137]">
              {isAdsSuggestion ? 'Keyword Suggestions' : 'Organic Keywords'} — {domain}
            </p>
            <p className="text-xs text-[#092137]/40 mt-0.5">{items.length} keywords found</p>
          </div>
          <button
            onClick={() => exportCsv(
              items.map(r => ({ keyword: r.keyword, position: r.position, volume: r.volume, difficulty: r.difficulty, cpc: r.cpc, url: r.url })),
              `${domain}-keywords.csv`
            )}
            className="flex items-center gap-1.5 text-xs text-[#092137]/50 hover:text-[#092137] transition-colors"
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F1E9] text-xs font-semibold text-[#092137]/60 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => onToggleAll(items, allSelected)}
                    className="rounded border-gray-300 text-blue-600 cursor-pointer"
                    title={allSelected ? 'Deselect all' : 'Select all'}
                  />
                </th>
                <th className="text-left px-3 py-3">Keyword</th>
                {!isAdsSuggestion && <th className="text-right px-5 py-3">Position</th>}
                <th className="text-right px-5 py-3">Volume</th>
                {!isAdsSuggestion && <th className="text-left px-5 py-3">Difficulty</th>}
                <th className="text-left px-5 py-3">Competition</th>
                <th className="text-right px-5 py-3">CPC</th>
                <th className="text-center px-5 py-3">Trend</th>
                {!isAdsSuggestion && <th className="px-5 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((row, i) => {
                const checked = kwMap.has(row.keyword)
                return (
                  <tr
                    key={i}
                    onClick={() => onToggle(row)}
                    className={cn('cursor-pointer transition-colors', checked ? 'bg-blue-50/60 hover:bg-blue-50' : 'hover:bg-[#F5F1E9]/40')}
                  >
                    <td className="px-4 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggle(row)}
                        onClick={e => e.stopPropagation()}
                        className="rounded border-gray-300 text-blue-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-3 font-medium text-[#092137]">{row.keyword}</td>
                    {!isAdsSuggestion && (
                      <td className="px-5 py-3 text-right">
                        {row.position ? (
                          <span className={cn(
                            'text-xs font-bold px-2 py-0.5 rounded-full',
                            row.position <= 3  ? 'bg-green-100 text-green-700' :
                            row.position <= 10 ? 'bg-blue-100 text-blue-700' :
                                                 'bg-gray-100 text-gray-600'
                          )}>
                            #{row.position}
                          </span>
                        ) : <span className="text-xs text-[#092137]/30">—</span>}
                      </td>
                    )}
                    <td className="px-5 py-3 text-right text-[#092137]/70">{fmtVol(row.volume)}</td>
                    {!isAdsSuggestion && <td className="px-5 py-3"><DifficultyBar score={row.difficulty} /></td>}
                    <td className="px-5 py-3"><CompetitionDot val={row.competition} /></td>
                    <td className="px-5 py-3 text-right text-[#092137]/70">{fmtCpc(row.cpc)}</td>
                    <td className="px-5 py-3 text-center"><TrendSparkline monthly={row.trend} /></td>
                    {!isAdsSuggestion && (
                      <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                        {row.url && (
                          <a href={row.url} target="_blank" rel="noreferrer" className="text-[#092137]/30 hover:text-blue-500">
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Keyword Ideas results ────────────────────────────────────────────────────

function IdeasResults({ data, kwMap, onToggle, onToggleAll }) {
  const { seed, suggestions } = data

  const allSelected = suggestions.length > 0 && suggestions.every(r => kwMap.has(r.keyword))

  return (
    <div className="space-y-4">
      {/* Seed keyword summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Monthly Volume', value: fmtVol(seed.volume) },
          { label: 'Avg. CPC', value: fmtCpc(seed.cpc) },
          { label: 'Keyword Ideas', value: suggestions.length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-[#EDE8DC] p-4 text-center">
            <p className="text-2xl font-bold text-[#092137]">{value}</p>
            <p className="text-xs text-[#092137]/50 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {!suggestions.length ? (
        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-900">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <p>No related keyword suggestions found. Try a broader term.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#EDE8DC] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#EDE8DC] flex items-center justify-between">
            <p className="text-sm font-semibold text-[#092137]">
              Keyword Ideas — <span className="text-blue-600">"{seed.keyword}"</span>
            </p>
            <button
              onClick={() => exportCsv(
                suggestions.map(r => ({ keyword: r.keyword, volume: r.volume, difficulty: r.difficulty, cpc: r.cpc })),
                `${seed.keyword}-ideas.csv`
              )}
              className="flex items-center gap-1.5 text-xs text-[#092137]/50 hover:text-[#092137]"
            >
              <Download size={13} /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F1E9] text-xs font-semibold text-[#092137]/60 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => onToggleAll(suggestions, allSelected)}
                      className="rounded border-gray-300 text-blue-600 cursor-pointer"
                      title={allSelected ? 'Deselect all' : 'Select all'}
                    />
                  </th>
                  <th className="text-left px-3 py-3">Keyword</th>
                  <th className="text-right px-5 py-3">Volume</th>
                  <th className="text-left px-5 py-3">Difficulty</th>
                  <th className="text-left px-5 py-3">Competition</th>
                  <th className="text-right px-5 py-3">CPC</th>
                  <th className="text-center px-5 py-3">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {suggestions.map((row, i) => {
                  const checked = kwMap.has(row.keyword)
                  return (
                    <tr
                      key={i}
                      onClick={() => onToggle(row)}
                      className={cn('cursor-pointer transition-colors', checked ? 'bg-blue-50/60 hover:bg-blue-50' : 'hover:bg-[#F5F1E9]/40')}
                    >
                      <td className="px-4 py-3 w-8">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggle(row)}
                          onClick={e => e.stopPropagation()}
                          className="rounded border-gray-300 text-blue-600 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-3 font-medium text-[#092137]">{row.keyword}</td>
                      <td className="px-5 py-3 text-right text-[#092137]/70">{fmtVol(row.volume)}</td>
                      <td className="px-5 py-3"><DifficultyBar score={row.difficulty} /></td>
                      <td className="px-5 py-3"><CompetitionDot val={row.competition} /></td>
                      <td className="px-5 py-3 text-right text-[#092137]/70">{fmtCpc(row.cpc)}</td>
                      <td className="px-5 py-3 text-center"><TrendSparkline monthly={row.trend} /></td>
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

// ── SERP Preview results ─────────────────────────────────────────────────────

function SerpResults({ data }) {
  const { keyword, organic, features } = data

  return (
    <div className="space-y-4">
      {features.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-[#092137]/50 uppercase tracking-wider">SERP Features:</span>
          {features.map(f => (
            <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 capitalize">
              {f.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#EDE8DC] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#EDE8DC]">
          <p className="text-sm font-semibold text-[#092137]">
            Top {organic.length} results for <span className="text-blue-600">"{keyword}"</span>
          </p>
        </div>
        <div className="divide-y divide-[#EDE8DC]">
          {organic.map((item, i) => (
            <div key={i} className="px-5 py-4 hover:bg-[#F5F1E9]/40">
              <div className="flex items-start gap-3">
                <span className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5',
                  i === 0 ? 'bg-yellow-400 text-white' :
                  i <= 2  ? 'bg-[#092137] text-white' :
                             'bg-[#EDE8DC] text-[#092137]/70'
                )}>
                  {item.position}
                </span>
                <div className="min-w-0 flex-1">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-blue-600 hover:underline line-clamp-1"
                  >
                    {item.title}
                  </a>
                  <p className="text-xs text-green-700 mt-0.5 truncate">{item.url}</p>
                  {item.description && (
                    <p className="text-xs text-[#092137]/60 mt-1 line-clamp-2">{item.description}</p>
                  )}
                </div>
                <span className="text-xs text-[#092137]/40 flex-shrink-0">{item.domain}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function KeywordResearch() {
  const { selectedClient } = useDigitalClient()
  const [mode,      setMode]      = useState('domain')
  const [input,     setInput]     = useState('')
  const [location,  setLocation]  = useState(2036)
  const [limit,     setLimit]     = useState(50)
  const [loading,   setLoading]   = useState(false)
  const [result,    setResult]    = useState(null)
  const [error,     setError]     = useState(null)

  // Keyword list — Map<keyword string, row object> so duplicates across searches are merged
  const [kwMap, setKwMap] = useState(new Map())

  const { data: kwHistory, refetch: refetchKwHistory } = useKeywordResearchHistory({
    clientId: selectedClient?.id,
    limit: 15,
  })

  // Pre-fill domain from selected client
  useEffect(() => {
    if (mode === 'domain' && selectedClient?.website) {
      setInput(selectedClient.website)
    }
  }, [selectedClient?.id, mode])

  const placeholder = mode === 'domain' ? 'e.g. competitor.com.au'
                    : mode === 'ideas'  ? 'e.g. perth cafe'
                    :                    'e.g. best cafe perth'

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!input.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const body = mode === 'domain'
        ? { domain: input.trim(), limit, locationCode: location }
        : mode === 'ideas'
        ? { keyword: input.trim(), limit, locationCode: location }
        : { keyword: input.trim(), locationCode: location }

      const res  = await fetch(`/api/keyword-research?action=${mode}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error ?? 'Request failed')
      setResult(data)
      refetchKwHistory()
    } catch (err) {
      setError(err.message ?? 'Something went wrong')
      toast.error(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function rerunSearch(row) {
    setMode(row.action)
    setInput(row.query)
    setLocation(row.location_code ?? 2036)
    setResult(null)
    setError(null)
  }

  // Keyword list handlers
  function toggleKeyword(row) {
    setKwMap(prev => {
      const next = new Map(prev)
      if (next.has(row.keyword)) {
        next.delete(row.keyword)
      } else {
        next.set(row.keyword, row)
      }
      return next
    })
  }

  function toggleAll(rows, currentlyAllSelected) {
    setKwMap(prev => {
      const next = new Map(prev)
      if (currentlyAllSelected) {
        rows.forEach(r => next.delete(r.keyword))
      } else {
        rows.forEach(r => next.set(r.keyword, r))
      }
      return next
    })
  }

  function removeKeyword(keyword) {
    setKwMap(prev => { const next = new Map(prev); next.delete(keyword); return next })
  }

  function clearList() {
    setKwMap(new Map())
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-20">
      <div>
        <h1 className="text-xl font-bold text-[#092137]">Keyword Research</h1>
        <p className="text-sm text-[#092137]/50">
          {selectedClient
            ? `Powered by DataForSEO · ${selectedClient.client_name}`
            : 'Powered by DataForSEO — competitor keywords, ideas & SERP previews'}
        </p>
      </div>

      {/* Mode picker */}
      <div className="grid grid-cols-3 gap-3">
        {MODES.map(m => {
          const Icon   = m.icon
          const active = mode === m.id
          return (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setResult(null); setError(null) }}
              className={cn(
                'flex flex-col items-start gap-1.5 px-4 py-3.5 rounded-xl border-2 text-left transition-all',
                active
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-[#EDE8DC] bg-white hover:border-blue-200'
              )}
            >
              <div className="flex items-center gap-2">
                <Icon size={16} className={active ? 'text-blue-600' : 'text-[#092137]/50'} />
                <span className={cn('text-sm font-semibold', active ? 'text-blue-700' : 'text-[#092137]')}>
                  {m.label}
                </span>
              </div>
              <p className="text-xs text-[#092137]/50 leading-snug">{m.desc}</p>
            </button>
          )
        })}
      </div>

      {/* Search bar */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#EDE8DC] p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#092137]/30" />
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#EDE8DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
            />
          </div>
          <select
            value={location}
            onChange={e => setLocation(Number(e.target.value))}
            className="px-3 py-2.5 text-sm border border-[#EDE8DC] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {LOCATIONS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          {mode !== 'serp' && (
            <select
              value={limit}
              onChange={e => setLimit(Number(e.target.value))}
              className="px-3 py-2.5 text-sm border border-[#EDE8DC] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value={25}>25 results</option>
              <option value={50}>50 results</option>
              <option value={100}>100 results</option>
            </select>
          )}
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            {loading ? 'Searching…' : 'Research'}
          </button>
        </div>
      </form>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-16 text-[#092137]/50">
          <Loader2 size={22} className="animate-spin" />
          <span className="text-sm">Fetching data from DataForSEO…</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Request failed</p>
            <p className="mt-1 text-red-700/80">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <>
          {result.action === 'domain' && (
            <DomainResults
              items={result.items}
              domain={result.domain ?? input}
              source={result.source}
              kwMap={kwMap}
              onToggle={toggleKeyword}
              onToggleAll={toggleAll}
            />
          )}
          {result.action === 'ideas' && (
            <IdeasResults
              data={{ seed: result.seed, suggestions: result.suggestions }}
              kwMap={kwMap}
              onToggle={toggleKeyword}
              onToggleAll={toggleAll}
            />
          )}
          {result.action === 'serp' && (
            <SerpResults data={{ keyword: result.keyword, organic: result.organic, features: result.features }} />
          )}
        </>
      )}

      {/* History panel */}
      {kwHistory?.length > 0 && (
        <div className="bg-white rounded-xl border border-[#EDE8DC] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#EDE8DC] flex items-center gap-2">
            <History size={14} className="text-[#092137]/40" />
            <p className="text-sm font-semibold text-[#092137]">Recent Searches</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F1E9] text-xs font-semibold text-[#092137]/60 uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-2.5">Query</th>
                  <th className="text-center px-3 py-2.5">Type</th>
                  <th className="text-center px-3 py-2.5">Results</th>
                  <th className="text-right px-5 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {kwHistory.map(row => {
                  const modeLabel = row.action === 'domain' ? 'Domain' : row.action === 'ideas' ? 'Ideas' : 'SERP'
                  const modeColor = row.action === 'domain' ? 'bg-purple-50 text-purple-700'
                                  : row.action === 'ideas'  ? 'bg-blue-50 text-blue-700'
                                  :                           'bg-green-50 text-green-700'
                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-[#F5F1E9]/40 cursor-pointer"
                      onClick={() => rerunSearch(row)}
                      title="Click to re-run this search"
                    >
                      <td className="px-5 py-3 font-medium text-[#092137]">{row.query}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', modeColor)}>{modeLabel}</span>
                      </td>
                      <td className="px-3 py-3 text-center text-xs text-[#092137]/60">{row.result_count}</td>
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

      {/* Floating keyword list tray */}
      <KeywordListTray kwMap={kwMap} onRemove={removeKeyword} onClear={clearList} />
    </div>
  )
}
