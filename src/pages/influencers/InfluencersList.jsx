import { useState, useRef, useMemo } from 'react'
import {
  Search, Upload, Plus, Loader2, Star, Trash2, Pencil, X,
  Instagram, Music2, Facebook, Mail, ExternalLink, CheckCircle2,
} from 'lucide-react'
import {
  useInfluencers,
  useCreateInfluencer,
  useUpdateInfluencer,
  useDeleteInfluencer,
  useBulkInsertInfluencers,
} from '@/lib/hooks'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ── CSV parsing ─────────────────────────────────────────────────────────────

// Quote-aware CSV line splitter
function splitCsvLine(line) {
  const out = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (c === ',' && !inQuotes) {
      out.push(cur); cur = ''
    } else {
      cur += c
    }
  }
  out.push(cur)
  return out
}

function toNum(v) {
  if (v == null || v === '' || v === 'NaN' || v === 'N/A') return null
  const n = Number(String(v).replace(/[, ]/g, ''))
  return Number.isFinite(n) ? n : null
}

function cleanHandle(v) {
  if (!v) return null
  const h = String(v).trim().replace(/^@+/, '').replace(/\s+/g, '')
  if (!h || h.toUpperCase() === 'N/A') return null
  return h
}

function cleanText(v) {
  if (v == null) return null
  const t = String(v).trim()
  return t && t !== 'NaN' && t !== 'N/A' ? t : null
}

// Parses the WOM influencer master CSV shape:
// Instagram Handle, TikTok Handle, Account name, Name, TikTok Followers, Avg Views,
// Avg Likes, IG Followers, Avg Views, Avg Likes, Score, Used Recently, Email Adress
function parseWomCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length)
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0]).map(h => h.trim().toLowerCase())

  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i])
    const row = {}
    headers.forEach((h, idx) => { row[h] = cells[idx] ?? '' })

    const ig = cleanHandle(row['instagram handle'])
    const tt = cleanHandle(row['tiktok handle'])
    if (!ig && !tt) continue

    // The WOM sheet has two "avg views" and two "avg likes" columns — the first pair
    // belongs to TikTok, the second to Instagram. splitCsvLine preserves order, so
    // read them positionally.
    const igFollowersIdx = headers.indexOf('ig followers')
    const igAvgViewsIdx  = igFollowersIdx + 1
    const igAvgLikesIdx  = igFollowersIdx + 2

    const ttFollowersIdx = headers.indexOf('tiktok followers')
    const ttAvgViewsIdx  = ttFollowersIdx + 1
    const ttAvgLikesIdx  = ttFollowersIdx + 2

    rows.push({
      display_name:     cleanText(row['account name']),
      first_name:       cleanText(row['name']),
      email:            cleanText(row['email adress']),
      instagram_handle: ig,
      tiktok_handle:    tt,
      ig_followers:     toNum(cells[igFollowersIdx]),
      ig_avg_views:     toNum(cells[igAvgViewsIdx]),
      ig_avg_likes:     toNum(cells[igAvgLikesIdx]),
      tt_followers:     toNum(cells[ttFollowersIdx]),
      tt_avg_views:     toNum(cells[ttAvgViewsIdx]),
      tt_avg_likes:     toNum(cells[ttAvgLikesIdx]),
      score:            toNum(row['score']),
      used_recently:    String(row['used recently']).toLowerCase() === 'true',
      source:           'csv',
    })
  }
  return rows
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatNum(n) {
  if (n == null) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

function totalFollowers(i) {
  return (i.ig_followers ?? 0) + (i.tt_followers ?? 0) + (i.fb_followers ?? 0)
}

// ── Add/edit modal ──────────────────────────────────────────────────────────

function InfluencerModal({ influencer, onClose }) {
  const isEdit   = !!influencer
  const create   = useCreateInfluencer()
  const update   = useUpdateInfluencer()
  const pending  = create.isPending || update.isPending

  const [form, setForm] = useState({
    display_name:     influencer?.display_name     ?? '',
    first_name:       influencer?.first_name       ?? '',
    email:            influencer?.email            ?? '',
    location:         influencer?.location         ?? '',
    niche:            influencer?.niche            ?? '',
    instagram_handle: influencer?.instagram_handle ?? '',
    tiktok_handle:    influencer?.tiktok_handle    ?? '',
    facebook_handle:  influencer?.facebook_handle  ?? '',
    ig_followers:     influencer?.ig_followers     ?? '',
    tt_followers:     influencer?.tt_followers     ?? '',
    fb_followers:     influencer?.fb_followers     ?? '',
    notes:            influencer?.notes            ?? '',
    used_recently:    influencer?.used_recently    ?? false,
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      instagram_handle: cleanHandle(form.instagram_handle),
      tiktok_handle:    cleanHandle(form.tiktok_handle),
      facebook_handle:  cleanHandle(form.facebook_handle),
      ig_followers:     toNum(form.ig_followers),
      tt_followers:     toNum(form.tt_followers),
      fb_followers:     toNum(form.fb_followers),
    }
    try {
      if (isEdit) {
        await update.mutateAsync({ id: influencer.id, ...payload })
        toast.success('Influencer updated')
      } else {
        await create.mutateAsync(payload)
        toast.success('Influencer added')
      }
      onClose()
    } catch (err) {
      toast.error(err.message ?? 'Save failed')
    }
  }

  const field = 'w-full px-3 py-2 text-sm rounded-lg border border-[#EDE8DC] bg-white focus:outline-none focus:ring-2 focus:ring-wom-gold/30 focus:border-wom-gold'
  const label = 'block text-xs font-semibold text-[#092137]/60 uppercase tracking-wider mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#092137]">
            {isEdit ? 'Edit Influencer' : 'Add Influencer'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F5F1E9] flex items-center justify-center text-[#092137]/50 hover:bg-[#EDE8DC]">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Display name</label>
              <input className={field} value={form.display_name} onChange={e => set('display_name', e.target.value)} />
            </div>
            <div>
              <label className={label}>First name</label>
              <input className={field} value={form.first_name} onChange={e => set('first_name', e.target.value)} />
            </div>
            <div>
              <label className={label}>Email</label>
              <input className={field} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className={label}>Location</label>
              <input className={field} placeholder="Perth, WA" value={form.location} onChange={e => set('location', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={label}>Niche</label>
              <input className={field} placeholder="Food, Travel, Lifestyle..." value={form.niche} onChange={e => set('niche', e.target.value)} />
            </div>
          </div>

          <div className="pt-2 border-t border-[#EDE8DC]">
            <p className="text-xs font-semibold text-[#092137]/60 uppercase tracking-wider mb-2">Handles & Followers</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}><Instagram size={12} className="inline -mt-0.5" /> Instagram</label>
                <input className={field} placeholder="handle" value={form.instagram_handle} onChange={e => set('instagram_handle', e.target.value)} />
              </div>
              <div>
                <label className={label}>IG Followers</label>
                <input className={field} type="number" value={form.ig_followers} onChange={e => set('ig_followers', e.target.value)} />
              </div>
              <div>
                <label className={label}><Music2 size={12} className="inline -mt-0.5" /> TikTok</label>
                <input className={field} placeholder="handle" value={form.tiktok_handle} onChange={e => set('tiktok_handle', e.target.value)} />
              </div>
              <div>
                <label className={label}>TT Followers</label>
                <input className={field} type="number" value={form.tt_followers} onChange={e => set('tt_followers', e.target.value)} />
              </div>
              <div>
                <label className={label}><Facebook size={12} className="inline -mt-0.5" /> Facebook</label>
                <input className={field} placeholder="page handle" value={form.facebook_handle} onChange={e => set('facebook_handle', e.target.value)} />
              </div>
              <div>
                <label className={label}>FB Followers</label>
                <input className={field} type="number" value={form.fb_followers} onChange={e => set('fb_followers', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <label className={label}>Notes</label>
            <textarea className={field + ' resize-none'} rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm text-[#092137]/80">
            <input type="checkbox" checked={form.used_recently} onChange={e => set('used_recently', e.target.checked)} />
            Used recently
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={pending} className="btn-primary flex-1 justify-center disabled:opacity-60">
              {pending ? <Loader2 size={15} className="animate-spin" /> : (isEdit ? 'Save Changes' : 'Add Influencer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function InfluencersList() {
  const { data: influencers, isLoading } = useInfluencers()
  const deleteMutation = useDeleteInfluencer()
  const bulkInsert     = useBulkInsertInfluencers()
  const fileRef        = useRef(null)

  const [search,       setSearch]       = useState('')
  const [platform,     setPlatform]     = useState('All')
  const [modalTarget,  setModalTarget]  = useState(null) // null closed, {} new, obj edit

  const filtered = useMemo(() => {
    const list = influencers ?? []
    return list.filter(i => {
      if (platform === 'Instagram' && !i.instagram_handle) return false
      if (platform === 'TikTok'    && !i.tiktok_handle)    return false
      if (platform === 'Facebook'  && !i.facebook_handle)  return false
      if (!search) return true
      const q = search.toLowerCase()
      return (
        (i.display_name     ?? '').toLowerCase().includes(q) ||
        (i.first_name       ?? '').toLowerCase().includes(q) ||
        (i.instagram_handle ?? '').toLowerCase().includes(q) ||
        (i.tiktok_handle    ?? '').toLowerCase().includes(q) ||
        (i.facebook_handle  ?? '').toLowerCase().includes(q) ||
        (i.email            ?? '').toLowerCase().includes(q) ||
        (i.niche            ?? '').toLowerCase().includes(q)
      )
    })
  }, [influencers, search, platform])

  const stats = useMemo(() => ({
    total: influencers?.length ?? 0,
    ig:    influencers?.filter(i => i.instagram_handle).length ?? 0,
    tt:    influencers?.filter(i => i.tiktok_handle).length ?? 0,
    fb:    influencers?.filter(i => i.facebook_handle).length ?? 0,
  }), [influencers])

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const rows = parseWomCsv(text)
      if (!rows.length) { toast.error('No valid rows found in CSV'); return }
      const { inserted, skipped } = await bulkInsert.mutateAsync(rows)
      toast.success(`Imported ${inserted} influencer${inserted === 1 ? '' : 's'}${skipped ? ` · ${skipped} skipped (duplicates)` : ''}`)
    } catch (err) {
      toast.error(err.message ?? 'CSV import failed')
    }
  }

  const handleDelete = async (inf) => {
    if (!confirm(`Delete ${inf.display_name ?? inf.instagram_handle ?? 'this influencer'}?`)) return
    try {
      await deleteMutation.mutateAsync(inf.id)
      toast.success('Deleted')
    } catch (err) {
      toast.error(err.message ?? 'Delete failed')
    }
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#092137]/40" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search handle, name, email, niche..."
            className="pl-9 pr-4 py-2.5 text-sm bg-white border border-[#EDE8DC] rounded-full w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-wom-gold/30 focus:border-wom-gold"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {['All', 'Instagram', 'TikTok', 'Facebook'].map(p => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors',
                platform === p ? 'bg-wom-gold text-[#092137]' : 'bg-[#EDE8DC] text-[#092137]/60 hover:bg-gray-200'
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={bulkInsert.isPending}
            className="btn-secondary whitespace-nowrap disabled:opacity-60"
          >
            {bulkInsert.isPending
              ? <Loader2 size={16} className="animate-spin" />
              : <Upload size={16} />}
            Import CSV
          </button>
          <button onClick={() => setModalTarget({})} className="btn-primary whitespace-nowrap">
            <Plus size={16} /> Add Influencer
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total',     value: stats.total, icon: Star,      color: '#F0A629' },
          { label: 'Instagram', value: stats.ig,    icon: Instagram, color: '#E1306C' },
          { label: 'TikTok',    value: stats.tt,    icon: Music2,    color: '#161616' },
          { label: 'Facebook',  value: stats.fb,    icon: Facebook,  color: '#1877F2' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-[#EDE8DC] p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-bold text-[#092137]">{isLoading ? '—' : value}</p>
              <p className="text-xs text-[#092137]/50">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-[#092137]/40 gap-2">
          <Loader2 size={20} className="animate-spin" /> Loading influencers...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-[#EDE8DC] text-[#092137]/50">
          <Star size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {influencers?.length ? 'No influencers match your filters.' : 'No influencers yet.'}
          </p>
          {!influencers?.length && (
            <p className="text-xs mt-1">Import your existing spreadsheet or use Find Influencers to discover new creators.</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#EDE8DC] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F1E9] text-xs font-semibold text-[#092137]/60 uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">Influencer</th>
                  <th className="text-left px-4 py-3">Handles</th>
                  <th className="text-right px-4 py-3">Total Reach</th>
                  <th className="text-right px-4 py-3">Score</th>
                  <th className="text-center px-4 py-3">Used</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDE8DC]">
                {filtered.map(i => (
                  <tr key={i.id} className="hover:bg-[#FEF8EC]/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#F5F1E9] flex items-center justify-center overflow-hidden flex-shrink-0">
                          {i.ig_profile_pic || i.tt_profile_pic || i.fb_profile_pic ? (
                            <img src={i.ig_profile_pic ?? i.tt_profile_pic ?? i.fb_profile_pic} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-[#092137]/50">
                              {(i.display_name ?? i.instagram_handle ?? '?').charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-[#092137] truncate">{i.display_name ?? i.first_name ?? '—'}</p>
                          {i.email && (
                            <a href={`mailto:${i.email}`} className="text-xs text-[#092137]/50 flex items-center gap-1 hover:text-wom-gold">
                              <Mail size={10} /> {i.email}
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        {i.instagram_handle && (
                          <a href={`https://instagram.com/${i.instagram_handle}`} target="_blank" rel="noreferrer" className="text-xs flex items-center gap-1 text-[#E1306C] hover:underline">
                            <Instagram size={11} /> @{i.instagram_handle}
                            <span className="text-[#092137]/40 ml-1">{formatNum(i.ig_followers)}</span>
                          </a>
                        )}
                        {i.tiktok_handle && (
                          <a href={`https://www.tiktok.com/@${i.tiktok_handle}`} target="_blank" rel="noreferrer" className="text-xs flex items-center gap-1 text-[#161616] hover:underline">
                            <Music2 size={11} /> @{i.tiktok_handle}
                            <span className="text-[#092137]/40 ml-1">{formatNum(i.tt_followers)}</span>
                          </a>
                        )}
                        {i.facebook_handle && (
                          <a href={`https://facebook.com/${i.facebook_handle}`} target="_blank" rel="noreferrer" className="text-xs flex items-center gap-1 text-[#1877F2] hover:underline">
                            <Facebook size={11} /> {i.facebook_handle}
                            <span className="text-[#092137]/40 ml-1">{formatNum(i.fb_followers)}</span>
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[#092137]">
                      {formatNum(totalFollowers(i))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {i.score != null
                        ? <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-[#FEF8EC] text-wom-gold font-semibold">{Number(i.score).toFixed(2)}</span>
                        : <span className="text-[#092137]/30">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {i.used_recently
                        ? <CheckCircle2 size={16} className="inline text-green-600" />
                        : <span className="text-[#092137]/20">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setModalTarget(i)} className="p-1.5 rounded hover:bg-[#F5F1E9]" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(i)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalTarget !== null && (
        <InfluencerModal
          influencer={Object.keys(modalTarget).length ? modalTarget : null}
          onClose={() => setModalTarget(null)}
        />
      )}
    </div>
  )
}
