import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Loader2, Plus, X, Search, Trash2, Instagram, Music2, Facebook,
  ExternalLink, Check,
} from 'lucide-react'
import {
  useInfluencerCampaign,
  useInfluencers,
  useAddInfluencersToCampaign,
  useUpdateCampaignInfluencer,
  useRemoveCampaignInfluencer,
} from '@/lib/hooks'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const CI_STATUSES = [
  { id: 'shortlisted', label: 'Shortlisted', color: 'bg-gray-100 text-gray-700' },
  { id: 'invited',     label: 'Invited',     color: 'bg-yellow-100 text-yellow-800' },
  { id: 'accepted',    label: 'Accepted',    color: 'bg-blue-100 text-blue-700' },
  { id: 'declined',    label: 'Declined',    color: 'bg-red-100 text-red-700' },
  { id: 'posted',      label: 'Posted',      color: 'bg-green-100 text-green-700' },
  { id: 'paid',        label: 'Paid',        color: 'bg-purple-100 text-purple-700' },
]

function formatNum(n) {
  if (n == null) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

function totalFollowers(i) {
  return (i.ig_followers ?? 0) + (i.tt_followers ?? 0) + (i.fb_followers ?? 0)
}

// ── Add-influencers modal ───────────────────────────────────────────────────

function AddInfluencersModal({ campaignId, existingIds, onClose }) {
  const { data: influencers } = useInfluencers()
  const addMutation = useAddInfluencersToCampaign()
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState(new Set())

  const available = useMemo(() => {
    const list = (influencers ?? []).filter(i => !existingIds.has(i.id))
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter(i =>
      (i.display_name ?? '').toLowerCase().includes(q) ||
      (i.instagram_handle ?? '').toLowerCase().includes(q) ||
      (i.tiktok_handle ?? '').toLowerCase().includes(q) ||
      (i.facebook_handle ?? '').toLowerCase().includes(q)
    )
  }, [influencers, existingIds, search])

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAdd = async () => {
    if (!selected.size) return
    try {
      await addMutation.mutateAsync({ campaignId, influencerIds: Array.from(selected) })
      toast.success(`Added ${selected.size} influencer${selected.size === 1 ? '' : 's'}`)
      onClose()
    } catch (err) {
      toast.error(err.message ?? 'Add failed')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#092137]">Add Influencers</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F5F1E9] flex items-center justify-center text-[#092137]/50 hover:bg-[#EDE8DC]">
            <X size={16} />
          </button>
        </div>

        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#092137]/40" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search influencers..."
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-[#EDE8DC] focus:outline-none focus:ring-2 focus:ring-wom-gold/30 focus:border-wom-gold"
          />
        </div>

        <div className="flex-1 overflow-y-auto border border-[#EDE8DC] rounded-lg divide-y divide-[#EDE8DC]">
          {available.length === 0 ? (
            <div className="text-center py-10 text-sm text-[#092137]/40">No influencers available</div>
          ) : (
            available.map(i => {
              const isSel = selected.has(i.id)
              return (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => toggle(i.id)}
                  className={cn(
                    'w-full text-left px-4 py-3 flex items-center gap-3 transition-colors',
                    isSel ? 'bg-[#FEF8EC]' : 'hover:bg-[#F5F1E9]/40'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                    isSel ? 'bg-wom-gold border-wom-gold' : 'border-[#EDE8DC]'
                  )}>
                    {isSel && <Check size={12} className="text-[#092137]" />}
                  </div>
                  <div className="w-9 h-9 rounded-full bg-[#F5F1E9] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {(i.ig_profile_pic || i.tt_profile_pic) ? (
                      <img src={i.ig_profile_pic ?? i.tt_profile_pic} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-[#092137]/50">{(i.display_name ?? '?').charAt(0)}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-[#092137] truncate">{i.display_name ?? i.instagram_handle}</p>
                    <p className="text-xs text-[#092137]/50 truncate">
                      {[i.instagram_handle && `@${i.instagram_handle}`, i.tiktok_handle && `@${i.tiktok_handle}`]
                        .filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#092137]/70 flex-shrink-0">
                    {formatNum(totalFollowers(i))}
                  </span>
                </button>
              )
            })
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selected.size || addMutation.isPending}
            className="btn-primary flex-1 justify-center disabled:opacity-60"
          >
            {addMutation.isPending
              ? <Loader2 size={15} className="animate-spin" />
              : `Add ${selected.size || ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main detail page ────────────────────────────────────────────────────────

export default function CampaignDetail() {
  const { id } = useParams()
  const { data: campaign, isLoading } = useInfluencerCampaign(id)
  const updateCi   = useUpdateCampaignInfluencer()
  const removeCi   = useRemoveCampaignInfluencer()
  const [addOpen, setAddOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#092137]/40 gap-2">
        <Loader2 size={20} className="animate-spin" /> Loading campaign...
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="text-center py-16 text-[#092137]/50">
        <p>Campaign not found.</p>
        <Link to="/influencers/campaigns" className="text-wom-gold underline mt-2 inline-block">Back to campaigns</Link>
      </div>
    )
  }

  const existingIds = new Set((campaign.campaign_influencers ?? []).map(ci => ci.influencer_id))

  const handleStatusChange = async (ci, status) => {
    try {
      await updateCi.mutateAsync({ id: ci.id, status })
    } catch (err) {
      toast.error(err.message ?? 'Update failed')
    }
  }

  const handleFeeChange = async (ci, fee) => {
    try {
      await updateCi.mutateAsync({ id: ci.id, fee: fee === '' ? null : Number(fee) })
    } catch (err) {
      toast.error(err.message ?? 'Update failed')
    }
  }

  const handleRemove = async (ci) => {
    if (!confirm(`Remove ${ci.influencers?.display_name ?? 'this influencer'} from campaign?`)) return
    try {
      await removeCi.mutateAsync(ci.id)
      toast.success('Removed')
    } catch (err) {
      toast.error(err.message ?? 'Remove failed')
    }
  }

  return (
    <div className="space-y-5">
      <Link to="/influencers/campaigns" className="text-sm text-[#092137]/50 hover:text-[#092137] inline-flex items-center gap-1.5">
        <ArrowLeft size={14} /> Back to campaigns
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-[#EDE8DC] p-6">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-[#092137]">{campaign.name}</h1>
            <p className="text-sm text-[#092137]/50 mt-1">
              {campaign.clients?.client_name ?? 'Internal'}
              {' · '}
              {campaign.start_date ?? 'TBC'} → {campaign.end_date ?? 'TBC'}
              {campaign.budget != null && ` · $${Number(campaign.budget).toLocaleString()}`}
            </p>
            {campaign.brief && <p className="text-sm text-[#092137]/70 mt-3 whitespace-pre-wrap">{campaign.brief}</p>}
          </div>
          <span className="text-xs px-3 py-1 rounded-full font-medium bg-[#FEF8EC] text-wom-gold capitalize">
            {campaign.status}
          </span>
        </div>
      </div>

      {/* Influencers */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#092137]">
          Influencers · <span className="text-[#092137]/40">{campaign.campaign_influencers?.length ?? 0}</span>
        </h2>
        <button onClick={() => setAddOpen(true)} className="btn-primary whitespace-nowrap">
          <Plus size={16} /> Add Influencers
        </button>
      </div>

      {!campaign.campaign_influencers?.length ? (
        <div className="text-center py-12 bg-white rounded-xl border border-[#EDE8DC] text-[#092137]/50">
          <p className="text-sm">No influencers assigned to this campaign yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#EDE8DC] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F1E9] text-xs font-semibold text-[#092137]/60 uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">Influencer</th>
                  <th className="text-left px-4 py-3">Platforms</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Fee</th>
                  <th className="text-left px-4 py-3">Post</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDE8DC]">
                {campaign.campaign_influencers.map(ci => {
                  const inf = ci.influencers
                  if (!inf) return null
                  return (
                    <tr key={ci.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#F5F1E9] flex items-center justify-center overflow-hidden flex-shrink-0">
                            {(inf.ig_profile_pic || inf.tt_profile_pic) ? (
                              <img src={inf.ig_profile_pic ?? inf.tt_profile_pic} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-[#092137]/50">{(inf.display_name ?? '?').charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-[#092137]">{inf.display_name ?? inf.instagram_handle}</p>
                            {inf.email && <p className="text-xs text-[#092137]/50">{inf.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {inf.instagram_handle && <Instagram size={14} className="text-[#E1306C]" />}
                          {inf.tiktok_handle    && <Music2    size={14} className="text-[#161616]" />}
                          {inf.facebook_handle  && <Facebook  size={14} className="text-[#1877F2]" />}
                          <span className="text-xs text-[#092137]/50 ml-1">{formatNum(totalFollowers(inf))}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={ci.status}
                          onChange={e => handleStatusChange(ci, e.target.value)}
                          className="text-xs px-2 py-1 rounded-md border border-[#EDE8DC] bg-white focus:outline-none focus:ring-2 focus:ring-wom-gold/30"
                        >
                          {CI_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={ci.fee ?? ''}
                          onBlur={e => handleFeeChange(ci, e.target.value)}
                          placeholder="—"
                          className="w-24 text-right text-xs px-2 py-1 rounded-md border border-[#EDE8DC] bg-white focus:outline-none focus:ring-2 focus:ring-wom-gold/30"
                        />
                      </td>
                      <td className="px-4 py-3">
                        {ci.post_url ? (
                          <a href={ci.post_url} target="_blank" rel="noreferrer" className="text-xs text-wom-gold hover:underline inline-flex items-center gap-1">
                            View <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span className="text-xs text-[#092137]/30">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleRemove(ci)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Remove">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {addOpen && (
        <AddInfluencersModal
          campaignId={campaign.id}
          existingIds={existingIds}
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  )
}
