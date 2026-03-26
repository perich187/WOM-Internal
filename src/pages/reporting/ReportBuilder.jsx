import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, Link2, Check, Plus, Trash2, ChevronUp, ChevronDown,
  FileText, Megaphone, BarChart2, Type, Eye, Loader2, X, RefreshCw, LineChart, TrendingUp,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useClients } from '@/lib/hooks'
import { toast } from 'sonner'

function formatNum(n) {
  if (!n) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1000)    return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

// ── Platform config ───────────────────────────────────────────────────────────

const PLATFORMS = {
  facebook:  { label: 'Facebook',   color: '#1877F2', emoji: '📘' },
  instagram: { label: 'Instagram',  color: '#E1306C', emoji: '📸' },
  tiktok:    { label: 'TikTok',     color: '#000000', emoji: '🎵' },
  google:    { label: 'Google Ads', color: '#4285F4', emoji: '🔍' },
  linkedin:  { label: 'LinkedIn',   color: '#0A66C2', emoji: '💼' },
}

const PLATFORM_DEFAULT_METRICS = {
  facebook:  ['Reach', 'Impressions', 'Engagements', 'Page Likes'],
  instagram: ['Reach', 'Impressions', 'Engagements', 'Followers'],
  tiktok:    ['Video Views', 'Likes', 'Followers', 'Profile Views'],
  google:    ['Clicks', 'Impressions', 'CTR', 'Conversions'],
  linkedin:  ['Impressions', 'Clicks', 'Followers', 'Engagements'],
}

// ── Section helpers ───────────────────────────────────────────────────────────

function newSection(type) {
  const id = crypto.randomUUID()
  switch (type) {
    case 'summary':
      return { id, type, title: 'The Rundown', body: '' }
    case 'platform':
      return {
        id, type, platform: 'facebook',
        metrics: PLATFORM_DEFAULT_METRICS.facebook.map(label => ({ label, value: '', change: '', positive: true })),
      }
    case 'metrics':
      return {
        id, type, title: 'Key Metrics',
        metrics: [{ label: '', value: '', change: '', positive: true }],
      }
    case 'chart':
      return {
        id, type, title: 'Monthly Performance', chartType: 'bar', color: '#1877F2',
        data: [
          { label: 'Week 1', value: '' },
          { label: 'Week 2', value: '' },
          { label: 'Week 3', value: '' },
          { label: 'Week 4', value: '' },
        ],
      }
    case 'text':
      return { id, type, title: '', body: '' }
    case 'rank-tracker':
      return { id, type, title: 'Rank Tracker' }
    default:
      return { id, type }
  }
}

// ── Section preview (collapsed view) ─────────────────────────────────────────

function SectionPreview({ section }) {
  switch (section.type) {
    case 'summary':
      return (
        <p className="text-sm text-[#092137]/50 line-clamp-2">
          {section.body || <span className="italic">No content yet…</span>}
        </p>
      )
    case 'platform': {
      const p = PLATFORMS[section.platform] || PLATFORMS.facebook
      return (
        <div className="flex items-center gap-2 text-sm text-[#092137]/60">
          <span className="font-medium" style={{ color: p.color }}>{p.label}</span>
          <span>·</span>
          <span>{(section.metrics || []).length} metrics</span>
          {section.metrics?.slice(0, 3).map(m => (
            <span key={m.label} className="text-xs bg-[#F5F1E9] px-1.5 py-0.5 rounded">{m.label}</span>
          ))}
        </div>
      )
    }
    case 'metrics':
      return (
        <div className="flex items-center gap-2 text-sm text-[#092137]/60">
          <span>{(section.metrics || []).length} metric{section.metrics?.length !== 1 ? 's' : ''}</span>
          {section.metrics?.slice(0, 4).map(m => (
            <span key={m.label} className="text-xs bg-[#F5F1E9] px-1.5 py-0.5 rounded">{m.label || 'Untitled'}</span>
          ))}
        </div>
      )
    case 'chart':
      return (
        <div className="flex items-center gap-2 text-sm text-[#092137]/60">
          <span className="capitalize">{section.chartType || 'bar'} chart</span>
          <span>·</span>
          <span>{(section.data || []).length} data points</span>
        </div>
      )
    case 'text':
      return (
        <p className="text-sm text-[#092137]/50 line-clamp-2">
          {section.body || <span className="italic">No content yet…</span>}
        </p>
      )
    case 'rank-tracker':
      return (
        <p className="text-sm text-[#092137]/50">Keyword rankings &amp; position distribution chart</p>
      )
    default:
      return null
  }
}

// ── Section editors ───────────────────────────────────────────────────────────

function SummaryEditor({ section, onChange }) {
  const field = 'w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#EDE8DC] bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400'
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-[#092137]/60 uppercase tracking-wider mb-1">Section title</label>
        <input
          value={section.title}
          onChange={e => onChange({ ...section, title: e.target.value })}
          placeholder="The Rundown"
          className={field}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#092137]/60 uppercase tracking-wider mb-1">Body text</label>
        <textarea
          value={section.body}
          onChange={e => onChange({ ...section, body: e.target.value })}
          placeholder="Write your summary here…"
          rows={5}
          className={field + ' resize-none'}
        />
      </div>
    </div>
  )
}

function MetricRow({ metric, onChange, onDelete, showDelete }) {
  const input = 'px-2.5 py-1.5 text-sm rounded-lg border border-[#EDE8DC] bg-white focus:outline-none focus:ring-1 focus:ring-orange-400/40 focus:border-orange-400'
  return (
    <div className="flex items-center gap-2">
      <input
        value={metric.label}
        onChange={e => onChange({ ...metric, label: e.target.value })}
        placeholder="Label"
        className={input + ' flex-1'}
      />
      <input
        value={metric.value}
        onChange={e => onChange({ ...metric, value: e.target.value })}
        placeholder="Value"
        className={input + ' w-28'}
      />
      <input
        value={metric.change}
        onChange={e => onChange({ ...metric, change: e.target.value })}
        placeholder="+12%"
        className={input + ' w-20'}
      />
      <select
        value={metric.positive ? 'true' : 'false'}
        onChange={e => onChange({ ...metric, positive: e.target.value === 'true' })}
        className={input + ' w-24'}
      >
        <option value="true">▲ Good</option>
        <option value="false">▼ Bad</option>
      </select>
      {showDelete && (
        <button onClick={onDelete} className="w-7 h-7 rounded-lg text-[#092137]/30 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
          <X size={14} />
        </button>
      )}
    </div>
  )
}

function PlatformEditor({ section, onChange, clientId, dateFrom, dateTo }) {
  const [syncing, setSyncing] = useState(false)

  function handlePlatformChange(platform) {
    const defaults = PLATFORM_DEFAULT_METRICS[platform] || []
    onChange({
      ...section,
      platform,
      metrics: defaults.map(label => ({ label, value: '', change: '', positive: true })),
    })
  }

  function updateMetric(i, metric) {
    const metrics = [...section.metrics]
    metrics[i] = metric
    onChange({ ...section, metrics })
  }

  function addMetric() {
    onChange({ ...section, metrics: [...section.metrics, { label: '', value: '', change: '', positive: true }] })
  }

  function deleteMetric(i) {
    onChange({ ...section, metrics: section.metrics.filter((_, idx) => idx !== i) })
  }

  async function autoFill() {
    if (!clientId) { toast.error('Select a client first'); return }
    if (!dateFrom || !dateTo) { toast.error('Set a date range first'); return }
    if (!['facebook', 'instagram'].includes(section.platform)) {
      toast.error('Auto-fill only works for Facebook and Instagram'); return
    }

    setSyncing(true)
    try {
      const res = await fetch(`/api/meta-insights?clientId=${clientId}&dateFrom=${dateFrom}&dateTo=${dateTo}`)
      const data = await res.json()

      if (!res.ok) { toast.error(data.error || 'Failed to fetch Meta data'); return }

      const ins = data[section.platform]
      if (!ins) { toast.error(`No ${PLATFORMS[section.platform]?.label} account connected for this client`); return }
      if (ins.error) {
        if (ins.reconnect_required) {
          toast.error(`${PLATFORMS[section.platform]?.label} token expired — reconnect in Accounts`, {
            action: { label: 'Go to Accounts', onClick: () => window.location.href = '/accounts' },
            duration: 8000,
          })
        } else {
          toast.error(ins.error)
        }
        return
      }

      // Build metrics from real data
      const metrics = [
        { label: 'Reach',         value: formatNum(ins.reach),       change: '', positive: true },
        { label: 'Impressions',   value: formatNum(ins.impressions),  change: '', positive: true },
        { label: 'Engagements',   value: formatNum(ins.engagement),   change: '', positive: true },
        { label: 'Posts',         value: String(ins.posts),           change: '', positive: true },
        { label: 'Followers',     value: formatNum(ins.followers),    change: '', positive: true },
      ]

      if (ins.newFollowers > 0) {
        metrics.push({ label: 'New Followers', value: formatNum(ins.newFollowers), change: '', positive: true })
      }

      onChange({ ...section, metrics })
      toast.success(`Auto-filled from ${PLATFORMS[section.platform]?.label}!`)
    } catch (err) {
      toast.error('Failed to connect to Meta. Check account is still connected.')
    } finally {
      setSyncing(false)
    }
  }

  const canAutoFill = ['facebook', 'instagram'].includes(section.platform)

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-[#092137]/60 uppercase tracking-wider mb-1">Platform</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PLATFORMS).map(([key, p]) => (
              <button
                key={key}
                onClick={() => handlePlatformChange(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  section.platform === key
                    ? 'text-white border-transparent'
                    : 'text-[#092137]/60 border-[#EDE8DC] hover:border-gray-300'
                }`}
                style={section.platform === key ? { backgroundColor: p.color, borderColor: p.color } : {}}
              >
                {p.emoji} {p.label}
              </button>
            ))}
          </div>
        </div>

        {canAutoFill && (
          <button
            onClick={autoFill}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {syncing
              ? <><Loader2 size={13} className="animate-spin" /> Pulling data…</>
              : <><RefreshCw size={13} /> Auto-fill from Meta</>}
          </button>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold text-[#092137]/60 uppercase tracking-wider">Metrics</label>
          <div className="flex gap-2 text-xs text-[#092137]/30">
            <span className="w-[calc(100%-232px)]">Label</span>
            <span className="w-28">Value</span>
            <span className="w-20">Change</span>
            <span className="w-24">Trend</span>
          </div>
        </div>
        <div className="space-y-2">
          {(section.metrics || []).map((m, i) => (
            <MetricRow
              key={i}
              metric={m}
              onChange={metric => updateMetric(i, metric)}
              onDelete={() => deleteMetric(i)}
              showDelete={section.metrics.length > 1}
            />
          ))}
        </div>
        <button
          onClick={addMetric}
          className="mt-2 flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700 font-medium transition-colors"
        >
          <Plus size={13} /> Add metric
        </button>
      </div>
    </div>
  )
}

function MetricsEditor({ section, onChange }) {
  function updateMetric(i, metric) {
    const metrics = [...section.metrics]
    metrics[i] = metric
    onChange({ ...section, metrics })
  }

  function addMetric() {
    onChange({ ...section, metrics: [...section.metrics, { label: '', value: '', change: '', positive: true }] })
  }

  function deleteMetric(i) {
    onChange({ ...section, metrics: section.metrics.filter((_, idx) => idx !== i) })
  }

  const field = 'w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#EDE8DC] bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400'

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-[#092137]/60 uppercase tracking-wider mb-1">Section title</label>
        <input
          value={section.title}
          onChange={e => onChange({ ...section, title: e.target.value })}
          placeholder="Key Metrics"
          className={field}
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold text-[#092137]/60 uppercase tracking-wider">Metric cards</label>
        </div>
        <div className="space-y-2">
          {(section.metrics || []).map((m, i) => (
            <MetricRow
              key={i}
              metric={m}
              onChange={metric => updateMetric(i, metric)}
              onDelete={() => deleteMetric(i)}
              showDelete={section.metrics.length > 1}
            />
          ))}
        </div>
        <button
          onClick={addMetric}
          className="mt-2 flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700 font-medium transition-colors"
        >
          <Plus size={13} /> Add metric
        </button>
      </div>
    </div>
  )
}

function ChartEditor({ section, onChange }) {
  const field = 'px-2.5 py-1.5 text-sm rounded-lg border border-[#EDE8DC] bg-white focus:outline-none focus:ring-1 focus:ring-orange-400/40 focus:border-orange-400'
  const titleField = 'w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#EDE8DC] bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400'

  function updateRow(i, key, val) {
    const data = [...section.data]
    data[i] = { ...data[i], [key]: val }
    onChange({ ...section, data })
  }
  function addRow() {
    onChange({ ...section, data: [...section.data, { label: '', value: '' }] })
  }
  function deleteRow(i) {
    onChange({ ...section, data: section.data.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-[#092137]/60 uppercase tracking-wider mb-1">Chart title</label>
        <input value={section.title} onChange={e => onChange({ ...section, title: e.target.value })} placeholder="Monthly Performance" className={titleField} />
      </div>

      <div className="flex items-center gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#092137]/60 uppercase tracking-wider mb-1">Chart type</label>
          <div className="flex gap-2">
            {['bar', 'line'].map(t => (
              <button key={t} onClick={() => onChange({ ...section, chartType: t })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors capitalize ${section.chartType === t ? 'bg-blue-500 text-white border-blue-500' : 'border-[#EDE8DC] text-[#092137]/60 hover:border-gray-300'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#092137]/60 uppercase tracking-wider mb-1">Colour</label>
          <div className="flex gap-1.5">
            {CHART_COLORS.map(c => (
              <button key={c} onClick={() => onChange({ ...section, color: c })}
                className={`w-6 h-6 rounded-full transition-all ${section.color === c ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : ''}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold text-[#092137]/60 uppercase tracking-wider">Data points</label>
          <div className="flex gap-4 text-xs text-[#092137]/30 mr-8">
            <span>Label</span><span>Value</span>
          </div>
        </div>
        <div className="space-y-2">
          {(section.data || []).map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={row.label} onChange={e => updateRow(i, 'label', e.target.value)} placeholder="e.g. Jan" className={field + ' flex-1'} />
              <input value={row.value} onChange={e => updateRow(i, 'value', e.target.value)} placeholder="0" className={field + ' w-28'} type="number" />
              {section.data.length > 2 && (
                <button onClick={() => deleteRow(i)} className="w-7 h-7 rounded-lg text-[#092137]/30 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button onClick={addRow} className="mt-2 flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700 font-medium transition-colors">
          <Plus size={13} /> Add data point
        </button>
      </div>
    </div>
  )
}

function TextEditor({ section, onChange }) {
  const field = 'w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#EDE8DC] bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400'
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-[#092137]/60 uppercase tracking-wider mb-1">Heading (optional)</label>
        <input
          value={section.title}
          onChange={e => onChange({ ...section, title: e.target.value })}
          placeholder="e.g. Goals for Next Month"
          className={field}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#092137]/60 uppercase tracking-wider mb-1">Content</label>
        <textarea
          value={section.body}
          onChange={e => onChange({ ...section, body: e.target.value })}
          placeholder="Write your content here…"
          rows={5}
          className={field + ' resize-none'}
        />
      </div>
    </div>
  )
}

function RankTrackerEditor({ section, onChange }) {
  const field = 'w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#EDE8DC] bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400'
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-[#092137]/60 uppercase tracking-wider mb-1">Section title</label>
        <input
          value={section.title}
          onChange={e => onChange({ ...section, title: e.target.value })}
          placeholder="Rank Tracker"
          className={field}
        />
      </div>
      <p className="text-xs text-[#092137]/50 bg-[#F5F1E9] rounded-lg px-3 py-2.5 leading-relaxed">
        Automatically pulls keyword rankings for the selected client. Add keywords via the Rank Tracker page, then run a check before generating the report.
      </p>
    </div>
  )
}

// ── Section type meta ─────────────────────────────────────────────────────────

const SECTION_TYPES = [
  { type: 'summary',  label: 'Summary',          icon: FileText,   desc: 'The Rundown — executive summary text',    color: '#8B5CF6' },
  { type: 'platform', label: 'Platform Section',  icon: Megaphone,  desc: 'Facebook, Instagram, TikTok metrics',    color: '#E1306C' },
  { type: 'metrics',  label: 'Metric Cards',      icon: BarChart2,  desc: 'Grid of KPI cards with values & trends', color: '#10B981' },
  { type: 'chart',    label: 'Chart',             icon: LineChart,  desc: 'Bar or line chart with custom data',      color: '#3B82F6' },
  { type: 'text',         label: 'Text Block',        icon: Type,        desc: 'Goals, notes, or freeform content',          color: '#F59E0B' },
  { type: 'rank-tracker', label: 'Rank Tracker',      icon: TrendingUp,  desc: 'Keyword rankings & position distribution',   color: '#0EA5E9' },
]

const CHART_COLORS = ['#1877F2', '#E1306C', '#10B981', '#F59E0B', '#8B5CF6', '#092137']

// ── Section card (preview + inline editor) ────────────────────────────────────

function SectionCard({ section, index, total, isEditing, onEdit, onDone, onChange, onDelete, onMoveUp, onMoveDown, clientId, dateFrom, dateTo }) {
  const meta = SECTION_TYPES.find(t => t.type === section.type) || SECTION_TYPES[0]
  const Icon = meta.icon

  const sectionTitle = section.type === 'platform'
    ? `${PLATFORMS[section.platform]?.label || 'Platform'} Performance`
    : section.title || meta.label

  function renderEditor() {
    switch (section.type) {
      case 'summary':  return <SummaryEditor  section={section} onChange={onChange} />
      case 'platform': return <PlatformEditor section={section} onChange={onChange} clientId={clientId} dateFrom={dateFrom} dateTo={dateTo} />
      case 'metrics':  return <MetricsEditor  section={section} onChange={onChange} />
      case 'chart':        return <ChartEditor        section={section} onChange={onChange} />
      case 'text':         return <TextEditor         section={section} onChange={onChange} />
      case 'rank-tracker': return <RankTrackerEditor  section={section} onChange={onChange} />
      default:             return null
    }
  }

  return (
    <div className={`bg-white rounded-xl border transition-all ${isEditing ? 'border-orange-400 shadow-md' : 'border-[#EDE8DC]'}`}>
      {/* Header row */}
      <div className="flex items-center gap-3 p-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: meta.color + '15' }}
        >
          <Icon size={16} style={{ color: meta.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#092137] truncate">{sectionTitle}</p>
          {!isEditing && <SectionPreview section={section} />}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="w-7 h-7 rounded-lg text-[#092137]/30 hover:text-[#092137]/70 hover:bg-[#F5F1E9] flex items-center justify-center transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronUp size={15} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="w-7 h-7 rounded-lg text-[#092137]/30 hover:text-[#092137]/70 hover:bg-[#F5F1E9] flex items-center justify-center transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronDown size={15} />
          </button>
          {isEditing ? (
            <button
              onClick={onDone}
              className="px-3 py-1 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors ml-1"
            >
              Done
            </button>
          ) : (
            <button
              onClick={onEdit}
              className="px-3 py-1 rounded-lg bg-[#F5F1E9] text-[#092137]/60 text-xs font-medium hover:bg-[#EDE8DC] transition-colors ml-1"
            >
              Edit
            </button>
          )}
          <button
            onClick={onDelete}
            className="w-7 h-7 rounded-lg text-[#092137]/20 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Inline editor */}
      {isEditing && (
        <div className="px-4 pb-4 border-t border-[#EDE8DC] pt-4">
          {renderEditor()}
        </div>
      )}
    </div>
  )
}

// ── Add Section menu ──────────────────────────────────────────────────────────

function AddSectionMenu({ onAdd, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute left-0 bottom-full mb-2 w-72 bg-white rounded-xl border border-[#EDE8DC] shadow-xl z-50 p-2"
    >
      {SECTION_TYPES.map(({ type, label, icon: Icon, desc, color }) => (
        <button
          key={type}
          onClick={() => { onAdd(type); onClose() }}
          className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-[#F5F1E9] transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: color + '15' }}>
            <Icon size={16} style={{ color }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#092137]">{label}</p>
            <p className="text-xs text-[#092137]/50">{desc}</p>
          </div>
        </button>
      ))}
    </div>
  )
}

// ── Main builder ──────────────────────────────────────────────────────────────

export default function ReportBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'

  const { data: clients = [] } = useClients()

  const [title, setTitle]       = useState('Monthly Report')
  const [clientId, setClientId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [sections, setSections] = useState([])
  const [editingIdx, setEditingIdx] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [shareToken, setShareToken] = useState(null)
  const [copied, setCopied]     = useState(false)
  const [addOpen, setAddOpen]   = useState(false)
  const [loading, setLoading]   = useState(!isNew)

  // Load existing report
  useEffect(() => {
    if (isNew) return
    supabase.from('reports').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error || !data) { toast.error('Report not found'); navigate('/reporting'); return }
      setTitle(data.title)
      setClientId(data.client_id ?? '')
      setDateFrom(data.date_from ?? '')
      setDateTo(data.date_to ?? '')
      setSections(data.sections ?? [])
      setShareToken(data.share_token)
      setLoading(false)
    })
  }, [id, isNew, navigate])

  function getClientName() {
    return clients.find(c => c.id === clientId)?.client_name ?? ''
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      title: title.trim() || 'Monthly Report',
      client_id: clientId || null,
      client_name: getClientName(),
      date_from: dateFrom || null,
      date_to: dateTo || null,
      sections,
      updated_at: new Date().toISOString(),
    }

    if (isNew) {
      const { data, error } = await supabase.from('reports').insert(payload).select().single()
      if (error) { toast.error(error.message); setSaving(false); return }
      setShareToken(data.share_token)
      navigate(`/reporting/builder/${data.id}`, { replace: true })
      toast.success('Report created!')
    } else {
      const { data, error } = await supabase.from('reports').update(payload).eq('id', id).select().single()
      if (error) { toast.error(error.message); setSaving(false); return }
      setShareToken(data.share_token)
      toast.success('Report saved!')
    }
    setSaving(false)
  }

  function copyShareLink() {
    if (!shareToken) { toast.error('Save the report first to get a share link'); return }
    navigator.clipboard.writeText(`${window.location.origin}/report/${shareToken}`)
    setCopied(true)
    toast.success('Share link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  function addSection(type) {
    const s = newSection(type)
    setSections(prev => [...prev, s])
    setEditingIdx(sections.length)
  }

  function updateSection(i, section) {
    setSections(prev => prev.map((s, idx) => idx === i ? section : s))
  }

  function deleteSection(i) {
    setSections(prev => prev.filter((_, idx) => idx !== i))
    if (editingIdx === i) setEditingIdx(null)
    else if (editingIdx > i) setEditingIdx(idx => idx - 1)
  }

  function moveSection(i, dir) {
    const j = i + dir
    if (j < 0 || j >= sections.length) return
    setSections(prev => {
      const arr = [...prev]
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return arr
    })
    setEditingIdx(prev => prev === i ? j : prev === j ? i : prev)
  }

  const fieldClass = 'w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#EDE8DC] bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={28} className="text-orange-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/reporting')}
          className="flex items-center gap-2 text-sm text-[#092137]/50 hover:text-[#092137] transition-colors"
        >
          <ArrowLeft size={16} /> Reports
        </button>
        <div className="flex-1" />
        {shareToken && (
          <button
            onClick={copyShareLink}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#EDE8DC] text-sm text-[#092137]/60 hover:bg-[#F5F1E9] transition-colors"
          >
            {copied ? <><Check size={14} className="text-green-500" /> Copied!</> : <><Link2 size={14} /> Share Link</>}
          </button>
        )}
        {shareToken && (
          <a
            href={`/report/${shareToken}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#EDE8DC] text-sm text-[#092137]/60 hover:bg-[#F5F1E9] transition-colors"
          >
            <Eye size={14} /> Preview
          </a>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* Report metadata */}
      <div className="bg-white rounded-xl border border-[#EDE8DC] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#092137]/60 uppercase tracking-wider">Report Details</h2>

        <div>
          <label className="block text-xs font-semibold text-[#092137]/60 uppercase tracking-wider mb-1.5">Report Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Monthly Report"
            className={fieldClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#092137]/60 uppercase tracking-wider mb-1.5">Client</label>
            <select
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              className={fieldClass}
            >
              <option value="">No client</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.client_name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#092137]/60 uppercase tracking-wider mb-1.5">Date from</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#092137]/60 uppercase tracking-wider mb-1.5">Date to</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={fieldClass} />
            </div>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[#092137]/60 uppercase tracking-wider">Sections</h2>

        {sections.length === 0 && (
          <div className="bg-white rounded-xl border border-dashed border-[#EDE8DC] p-10 text-center">
            <p className="text-sm text-[#092137]/40">No sections yet — add one below to start building your report</p>
          </div>
        )}

        {sections.map((section, i) => (
          <SectionCard
            key={section.id}
            section={section}
            index={i}
            total={sections.length}
            isEditing={editingIdx === i}
            onEdit={() => setEditingIdx(i)}
            onDone={() => setEditingIdx(null)}
            onChange={s => updateSection(i, s)}
            onDelete={() => deleteSection(i)}
            onMoveUp={() => moveSection(i, -1)}
            onMoveDown={() => moveSection(i, 1)}
            clientId={clientId}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        ))}

        {/* Add section */}
        <div className="relative">
          <button
            onClick={() => setAddOpen(o => !o)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-[#EDE8DC] text-sm text-[#092137]/40 hover:border-orange-300 hover:text-orange-500 transition-colors w-full justify-center"
          >
            <Plus size={16} /> Add Section
          </button>
          {addOpen && <AddSectionMenu onAdd={addSection} onClose={() => setAddOpen(false)} />}
        </div>
      </div>

      {/* Share link hint */}
      {!shareToken && (
        <div className="bg-orange-50 rounded-xl border border-orange-200 p-4 text-sm text-orange-700">
          Save the report to get a shareable link you can send to your client.
        </div>
      )}
    </div>
  )
}
