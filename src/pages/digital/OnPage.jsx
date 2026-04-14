import { useState, useEffect } from 'react'
import {
  ScanSearch, Loader2, AlertCircle, CheckCircle2, XCircle,
  FileText, Link, Image, BarChart2, Code2, ShieldCheck, AlertTriangle,
} from 'lucide-react'
import { useDigitalClient } from '@/lib/digitalClient'
import { cn } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

function charCountBadge(len, { min, ideal, max }) {
  if (!len) return { label: '0 chars', color: 'text-red-600 bg-red-50' }
  if (len >= min && len <= max) {
    const isIdeal = len >= ideal[0] && len <= ideal[1]
    return {
      label: `${len} chars`,
      color: isIdeal ? 'text-green-700 bg-green-50' : 'text-amber-700 bg-amber-50',
    }
  }
  return { label: `${len} chars`, color: 'text-red-600 bg-red-50' }
}

function Score({ score }) {
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444'
  const label = score >= 80 ? 'Good' : score >= 60 ? 'Needs Work' : 'Poor'
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center"
        style={{ borderColor: color }}
      >
        <span className="text-2xl font-bold leading-none" style={{ color }}>{Math.round(score)}</span>
        <span className="text-xs font-medium" style={{ color }}>{label}</span>
      </div>
      <p className="text-xs text-[#092137]/50">On-Page Score</p>
    </div>
  )
}

// ── Check items ───────────────────────────────────────────────────────────────

const CHECK_DEFS = [
  { key: 'no_title',                    label: 'Has Title Tag',               invert: true },
  { key: 'no_description',              label: 'Has Meta Description',        invert: true },
  { key: 'no_h1_tag',                   label: 'Has H1 Tag',                  invert: true },
  { key: 'is_https',                    label: 'HTTPS',                       invert: false },
  { key: 'no_image_alt',                label: 'All Images Have Alt Text',    invert: true },
  { key: 'is_4xx_code',                 label: 'No 4xx Error',                invert: true },
  { key: 'is_5xx_code',                 label: 'No 5xx Error',                invert: true },
  { key: 'is_redirect',                 label: 'No Redirect',                 invert: true },
  { key: 'canonical_to_redirect',       label: 'Canonical Not Redirected',    invert: true },
  { key: 'no_doctype',                  label: 'Has Doctype',                 invert: true },
  { key: 'has_render_blocking_resources', label: 'No Render-Blocking Resources', invert: true },
  { key: 'high_loading_time',           label: 'Fast Load Time',              invert: true },
  { key: 'low_content_rate',            label: 'Good Content Rate',           invert: true },
  { key: 'low_character_count',         label: 'Sufficient Content',          invert: true },
  { key: 'no_favicon',                  label: 'Has Favicon',                 invert: true },
  { key: 'frame',                       label: 'No Frames',                   invert: true },
  { key: 'flash',                       label: 'No Flash',                    invert: true },
]

function CheckGrid({ checks }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {CHECK_DEFS.map(({ key, label, invert }) => {
        const raw   = checks?.[key]
        if (raw === null || raw === undefined) return null
        const pass  = invert ? !raw : raw
        return (
          <div
            key={key}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium',
              pass ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            )}
          >
            {pass
              ? <CheckCircle2 size={13} className="flex-shrink-0" />
              : <XCircle      size={13} className="flex-shrink-0" />}
            {label}
          </div>
        )
      })}
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ icon: Icon, title, children, iconColor = 'text-[#092137]/40' }) {
  return (
    <div className="bg-white rounded-xl border border-[#EDE8DC] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#EDE8DC] flex items-center gap-2">
        <Icon size={15} className={iconColor} />
        <p className="text-sm font-semibold text-[#092137]">{title}</p>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OnPage() {
  const { selectedClient } = useDigitalClient()
  const [url,     setUrl]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [result,  setResult]  = useState(null)

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
    setResult(null)
    try {
      const res  = await fetch('/api/site-audit?action=instant', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error ?? 'Analysis failed')
      setResult(data.page)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const meta   = result?.meta ?? {}
  const checks = result?.checks ?? {}
  const timing = result?.page_timing ?? {}

  const titleLen = meta.title?.length ?? 0
  const descLen  = meta.description?.length ?? 0
  const titleBadge = charCountBadge(titleLen, { min: 10, ideal: [50, 60], max: 70 })
  const descBadge  = charCountBadge(descLen,  { min: 50, ideal: [120, 160], max: 170 })

  const imagesNoAlt = (meta.images ?? []).filter(img => !img.alt || img.alt.trim() === '')

  const h1Count = meta.htags?.h1?.length ?? 0
  const h1Status = h1Count === 1 ? 'good' : h1Count === 0 ? 'missing' : 'multiple'

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[#092137]">On-Page Optimisation</h1>
        <p className="text-sm text-[#092137]/50">
          {selectedClient
            ? `Powered by DataForSEO · ${selectedClient.client_name}`
            : 'Analyse any page for on-page SEO issues — powered by DataForSEO'}
        </p>
      </div>

      {/* URL input */}
      <div className="bg-white rounded-xl border border-[#EDE8DC] p-5">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <ScanSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#092137]/30" />
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && analyse()}
              placeholder="Enter full page URL (e.g. https://example.com.au/about)"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#EDE8DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
            />
          </div>
          <button
            onClick={analyse}
            disabled={loading || !url}
            className="px-5 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <ScanSearch size={15} />}
            {loading ? 'Analysing…' : 'Analyse'}
          </button>
        </div>
        <p className="text-xs text-[#092137]/40 mt-2 ml-1">
          Analyses a single page — title, meta, headings, images, links, technical checks & more
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2 text-sm text-red-700">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-3 py-16 text-[#092137]/50">
          <Loader2 size={22} className="animate-spin" />
          <span className="text-sm">Fetching page data from DataForSEO…</span>
        </div>
      )}

      {result && !loading && (
        <>
          {/* Overview row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="sm:col-span-1 bg-white rounded-xl border border-[#EDE8DC] p-4 flex items-center justify-center">
              <Score score={result.onpage_score ?? 0} />
            </div>
            {[
              { label: 'Status Code', value: result.status_code ?? '—',
                color: result.status_code === 200 ? 'text-green-600' : 'text-red-600' },
              { label: 'Word Count', value: (meta.content?.plain_text_word_count ?? 0).toLocaleString() },
              { label: 'Page Size', value: result.size ? `${Math.round(result.size / 1024)} KB` : '—' },
              { label: 'Internal Links', value: meta.internal_links_count ?? '—' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl border border-[#EDE8DC] p-4 text-center">
                <p className={cn('text-2xl font-bold text-[#092137]', color)}>{value}</p>
                <p className="text-xs text-[#092137]/50 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Meta tags */}
          <Section icon={FileText} title="Meta Tags" iconColor="text-blue-500">
            <div className="space-y-4">
              {/* Title */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-semibold text-[#092137]/50 uppercase tracking-wider">Title Tag</p>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', titleBadge.color)}>
                    {titleBadge.label}
                  </span>
                  <span className="text-xs text-[#092137]/30">ideal: 50–60 chars</span>
                </div>
                {meta.title
                  ? <p className="text-sm font-medium text-[#092137] bg-[#F5F1E9] rounded-lg px-3 py-2">{meta.title}</p>
                  : <p className="text-sm text-red-500 italic">Missing — no title tag found</p>}
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-semibold text-[#092137]/50 uppercase tracking-wider">Meta Description</p>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', descBadge.color)}>
                    {descBadge.label}
                  </span>
                  <span className="text-xs text-[#092137]/30">ideal: 120–160 chars</span>
                </div>
                {meta.description
                  ? <p className="text-sm text-[#092137]/80 bg-[#F5F1E9] rounded-lg px-3 py-2 leading-relaxed">{meta.description}</p>
                  : <p className="text-sm text-red-500 italic">Missing — no meta description found</p>}
              </div>

              {/* Canonical */}
              {meta.canonical && (
                <div>
                  <p className="text-xs font-semibold text-[#092137]/50 uppercase tracking-wider mb-1">Canonical URL</p>
                  <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 truncate">{meta.canonical}</p>
                </div>
              )}

              {/* Robots */}
              {meta.robots?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#092137]/50 uppercase tracking-wider mb-1">Robots</p>
                  <div className="flex gap-2">
                    {meta.robots.map(r => (
                      <span key={r} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-[#092137]/70 font-mono">{r}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Headings */}
          <Section icon={BarChart2} title="Heading Structure" iconColor="text-purple-500">
            <div className="space-y-3">
              {/* H1 status banner */}
              <div className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                h1Status === 'good'     ? 'bg-green-50 text-green-700' :
                h1Status === 'missing'  ? 'bg-red-50 text-red-700' :
                                          'bg-amber-50 text-amber-700'
              )}>
                {h1Status === 'good'
                  ? <CheckCircle2 size={14} />
                  : <AlertTriangle size={14} />}
                {h1Status === 'good'    ? `1 H1 tag found — "${meta.htags?.h1?.[0]}"` :
                 h1Status === 'missing' ? 'No H1 tag found — every page should have exactly one H1' :
                                          `${h1Count} H1 tags found — use only one H1 per page`}
              </div>

              {/* Heading lists */}
              {['h2','h3','h4','h5','h6'].map(tag => {
                const items = meta.htags?.[tag] ?? []
                if (!items.length) return null
                return (
                  <div key={tag}>
                    <p className="text-xs font-semibold text-[#092137]/40 uppercase tracking-wider mb-1.5">
                      {tag.toUpperCase()} <span className="text-[#092137]/30 normal-case font-normal">({items.length})</span>
                    </p>
                    <ul className="space-y-1">
                      {items.slice(0, 10).map((h, i) => (
                        <li key={i} className="text-sm text-[#092137]/70 pl-3 border-l-2 border-[#EDE8DC] truncate">{h}</li>
                      ))}
                      {items.length > 10 && (
                        <li className="text-xs text-[#092137]/30 pl-3">+{items.length - 10} more</li>
                      )}
                    </ul>
                  </div>
                )
              })}
            </div>
          </Section>

          {/* Technical checks */}
          <Section icon={ShieldCheck} title="Technical Checks" iconColor="text-green-500">
            <CheckGrid checks={checks} />
          </Section>

          {/* Images */}
          <Section icon={Image} title="Images" iconColor="text-amber-500">
            <div className="space-y-3">
              <div className="flex gap-4 text-sm">
                <span className="text-[#092137]/60">Total images: <strong className="text-[#092137]">{meta.images_count ?? 0}</strong></span>
                <span className={imagesNoAlt.length > 0 ? 'text-red-600' : 'text-green-600'}>
                  Missing alt text: <strong>{imagesNoAlt.length}</strong>
                </span>
              </div>
              {imagesNoAlt.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#092137]/40 uppercase tracking-wider mb-2">Images Without Alt Text</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {imagesNoAlt.slice(0, 20).map((img, i) => (
                      <p key={i} className="text-xs text-[#092137]/60 bg-[#F5F1E9] rounded px-3 py-1.5 truncate font-mono">
                        {img.src ?? img.url ?? `Image ${i + 1}`}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Links */}
          <Section icon={Link} title="Links" iconColor="text-blue-500">
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { label: 'Internal Links', value: meta.internal_links_count ?? 0 },
                { label: 'External Links', value: meta.external_links_count ?? 0 },
                { label: 'Broken Links',   value: meta.broken_links?.length ?? 0,
                  color: (meta.broken_links?.length ?? 0) > 0 ? 'text-red-600' : 'text-green-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[#F5F1E9] rounded-xl p-4">
                  <p className={cn('text-2xl font-bold text-[#092137]', color)}>{value}</p>
                  <p className="text-xs text-[#092137]/50 mt-1">{label}</p>
                </div>
              ))}
            </div>
            {meta.broken_links?.length > 0 && (
              <div className="mt-3 space-y-1">
                {meta.broken_links.slice(0, 10).map((link, i) => (
                  <p key={i} className="text-xs text-red-600 bg-red-50 rounded px-3 py-1.5 truncate">{link.href ?? link.url}</p>
                ))}
              </div>
            )}
          </Section>

          {/* Content & readability */}
          {meta.content && (
            <Section icon={Code2} title="Content & Readability" iconColor="text-indigo-500">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                {[
                  { label: 'Word Count', value: (meta.content.plain_text_word_count ?? 0).toLocaleString() },
                  { label: 'Text/HTML Ratio', value: meta.content.plain_text_rate != null
                      ? `${Math.round(meta.content.plain_text_rate * 100)}%` : '—' },
                  { label: 'Flesch-Kincaid', value: meta.content.flesch_kincaid_readability_index != null
                      ? Math.round(meta.content.flesch_kincaid_readability_index) : '—' },
                  { label: 'Scripts', value: meta.scripts_count ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[#F5F1E9] rounded-xl p-4">
                    <p className="text-2xl font-bold text-[#092137]">{value}</p>
                    <p className="text-xs text-[#092137]/50 mt-1">{label}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="bg-white rounded-xl border border-[#EDE8DC] p-12 text-center">
          <ScanSearch size={32} className="mx-auto text-purple-400 mb-3" />
          <p className="text-sm font-medium text-[#092137]">Enter a URL and click Analyse</p>
          <p className="text-xs text-[#092137]/40 mt-1">
            {selectedClient?.website
              ? `${selectedClient.client_name}'s website is pre-filled above`
              : 'Analyses title, meta description, headings, images, links and 17 technical checks'}
          </p>
        </div>
      )}
    </div>
  )
}
