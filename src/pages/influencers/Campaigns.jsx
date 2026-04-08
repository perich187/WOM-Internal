import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Loader2, X, Megaphone, Users, Calendar, Trash2, Pencil } from 'lucide-react'
import {
  useInfluencerCampaigns,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
  useClients,
} from '@/lib/hooks'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const STATUSES = [
  { id: 'draft',     label: 'Draft',     color: 'bg-gray-100 text-gray-700' },
  { id: 'active',    label: 'Active',    color: 'bg-green-100 text-green-700' },
  { id: 'paused',    label: 'Paused',    color: 'bg-yellow-100 text-yellow-800' },
  { id: 'completed', label: 'Completed', color: 'bg-blue-100 text-blue-700' },
]

function CampaignModal({ campaign, onClose }) {
  const isEdit  = !!campaign
  const create  = useCreateCampaign()
  const update  = useUpdateCampaign()
  const pending = create.isPending || update.isPending
  const { data: clients } = useClients()

  const [form, setForm] = useState({
    name:       campaign?.name       ?? '',
    client_id:  campaign?.client_id  ?? '',
    brief:      campaign?.brief      ?? '',
    status:     campaign?.status     ?? 'draft',
    start_date: campaign?.start_date ?? '',
    end_date:   campaign?.end_date   ?? '',
    budget:     campaign?.budget     ?? '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      client_id:  form.client_id || null,
      start_date: form.start_date || null,
      end_date:   form.end_date || null,
      budget:     form.budget === '' ? null : Number(form.budget),
    }
    try {
      if (isEdit) {
        await update.mutateAsync({ id: campaign.id, ...payload })
        toast.success('Campaign updated')
      } else {
        await create.mutateAsync(payload)
        toast.success('Campaign created')
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#092137]">{isEdit ? 'Edit Campaign' : 'New Campaign'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F5F1E9] flex items-center justify-center text-[#092137]/50 hover:bg-[#EDE8DC]">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={label}>Campaign name *</label>
            <input required className={field} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Spring Menu Launch" />
          </div>
          <div>
            <label className={label}>Client</label>
            <select className={field} value={form.client_id} onChange={e => set('client_id', e.target.value)}>
              <option value="">No client (internal)</option>
              {(clients ?? []).map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Brief</label>
            <textarea className={field + ' resize-none'} rows={3} value={form.brief} onChange={e => set('brief', e.target.value)} placeholder="Deliverables, messaging, hashtags..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Start date</label>
              <input type="date" className={field} value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div>
              <label className={label}>End date</label>
              <input type="date" className={field} value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </div>
            <div>
              <label className={label}>Budget (AUD)</label>
              <input type="number" step="0.01" className={field} value={form.budget} onChange={e => set('budget', e.target.value)} />
            </div>
            <div>
              <label className={label}>Status</label>
              <select className={field} value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={pending} className="btn-primary flex-1 justify-center disabled:opacity-60">
              {pending ? <Loader2 size={15} className="animate-spin" /> : (isEdit ? 'Save' : 'Create Campaign')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Campaigns() {
  const navigate = useNavigate()
  const { data: campaigns, isLoading } = useInfluencerCampaigns()
  const deleteMutation = useDeleteCampaign()
  const [modalTarget, setModalTarget] = useState(null)

  const handleDelete = async (e, c) => {
    e.stopPropagation()
    if (!confirm(`Delete campaign "${c.name}"?`)) return
    try {
      await deleteMutation.mutateAsync(c.id)
      toast.success('Campaign deleted')
    } catch (err) {
      toast.error(err.message ?? 'Delete failed')
    }
  }

  const handleEdit = (e, c) => {
    e.stopPropagation()
    setModalTarget(c)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#092137]">Campaigns</h2>
          <p className="text-sm text-[#092137]/50">Manage influencer collaborations for your clients.</p>
        </div>
        <button onClick={() => setModalTarget({})} className="btn-primary whitespace-nowrap">
          <Plus size={16} /> New Campaign
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-[#092137]/40 gap-2">
          <Loader2 size={20} className="animate-spin" /> Loading campaigns...
        </div>
      ) : !campaigns?.length ? (
        <div className="text-center py-16 bg-white rounded-xl border border-[#EDE8DC] text-[#092137]/50">
          <Megaphone size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No campaigns yet</p>
          <p className="text-xs mt-1">Create your first campaign to start assigning influencers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map(c => {
            const status = STATUSES.find(s => s.id === c.status) ?? STATUSES[0]
            const count  = c.campaign_influencers?.length ?? 0
            return (
              <div
                key={c.id}
                onClick={() => navigate(`/influencers/campaigns/${c.id}`)}
                className="bg-white rounded-xl border border-[#EDE8DC] p-5 card-hover cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-[#092137] truncate">{c.name}</h3>
                    <p className="text-xs text-[#092137]/50 truncate">{c.clients?.client_name ?? 'Internal'}</p>
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0', status.color)}>
                    {status.label}
                  </span>
                </div>

                {c.brief && <p className="text-xs text-[#092137]/60 line-clamp-2 mb-3">{c.brief}</p>}

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-[#F5F1E9] rounded-lg p-2.5 flex items-center gap-2">
                    <Users size={14} className="text-wom-gold" />
                    <div>
                      <p className="text-sm font-bold text-[#092137] leading-none">{count}</p>
                      <p className="text-[10px] text-[#092137]/50">Influencers</p>
                    </div>
                  </div>
                  <div className="bg-[#F5F1E9] rounded-lg p-2.5 flex items-center gap-2">
                    <Calendar size={14} className="text-wom-gold" />
                    <div>
                      <p className="text-[11px] font-semibold text-[#092137] leading-none">
                        {c.start_date ?? '—'}
                      </p>
                      <p className="text-[10px] text-[#092137]/50">Start</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#092137]/50">
                    {c.budget != null ? `$${Number(c.budget).toLocaleString()}` : 'No budget'}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={(e) => handleEdit(e, c)} className="p-1.5 rounded hover:bg-[#F5F1E9]" title="Edit">
                      <Pencil size={13} />
                    </button>
                    <button onClick={(e) => handleDelete(e, c)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalTarget !== null && (
        <CampaignModal
          campaign={Object.keys(modalTarget).length ? modalTarget : null}
          onClose={() => setModalTarget(null)}
        />
      )}
    </div>
  )
}
