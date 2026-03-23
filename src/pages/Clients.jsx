import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Link2, CalendarDays, BarChart3, Building2, Loader2 } from 'lucide-react'
import { useClients, useSocialAccounts, useSocialPosts } from '@/lib/hooks'
import { cn } from '@/lib/utils'

const INDUSTRY_FILTERS = ['All']

function AddClientModal({ onClose }) {
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
        <h2 className="text-lg font-bold text-[#092137] mb-5">Add New Client</h2>
        <p className="text-sm text-[#092137]/50 mb-5">
          Clients are managed in the WOM Dashboard. New clients added there will appear here automatically.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Close</button>
          <a
            href="https://ofjaxchkkemsrbbcdwnh.supabase.co"
            target="_blank"
            rel="noreferrer"
            className="btn-primary flex-1 justify-center"
          >
            Open Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}

// Pick a consistent colour from client name
function clientColor(name) {
  const COLORS = ['#F0A629', '#0693e3', '#00d084', '#f97316', '#cf2e2e', '#0A66C2', '#E60023']
  let hash = 0
  for (let i = 0; i < (name?.length ?? 0); i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

export default function Clients() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [showAdd, setShowAdd] = useState(false)

  const { data: clients, isLoading } = useClients()
  const { data: accounts } = useSocialAccounts()
  const { data: posts } = useSocialPosts()

  // Build per-client stats from real data
  const clientStats = {}
  accounts?.forEach(a => {
    if (!clientStats[a.client_id]) clientStats[a.client_id] = { accounts: 0, scheduled: 0 }
    if (a.connected) clientStats[a.client_id].accounts++
  })
  posts?.forEach(p => {
    if (!clientStats[p.client_id]) clientStats[p.client_id] = { accounts: 0, scheduled: 0 }
    if (p.status === 'scheduled') clientStats[p.client_id].scheduled++
  })

  // Derive unique industries for filter
  const industries = ['All', ...new Set((clients ?? []).map(c => c.industry).filter(Boolean))]

  const filtered = (clients ?? []).filter(c => {
    const matchSearch = c.client_name?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'All' || c.industry === filter
    return matchSearch && matchFilter
  })

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#092137]/40" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="pl-9 pr-4 py-2.5 text-sm bg-white border border-[#EDE8DC] rounded-full w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-wom-gold/30 focus:border-wom-gold"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {industries.map(ind => (
            <button
              key={ind}
              onClick={() => setFilter(ind)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors',
                filter === ind ? 'bg-wom-gold text-[#092137]' : 'bg-[#EDE8DC] text-[#092137]/60 hover:bg-gray-200'
              )}
            >
              {ind}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary ml-auto whitespace-nowrap">
          <Plus size={16} /> Add Client
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Clients', value: clients?.length ?? '—', icon: Building2 },
          { label: 'Active', value: clients?.filter(c => c.status === 'Active').length ?? '—', icon: Building2 },
          { label: 'Connected Accounts', value: accounts?.filter(a => a.connected).length ?? '—', icon: Link2 },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-[#EDE8DC] p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-[#FEF8EC] rounded-xl flex items-center justify-center">
              <Icon size={18} className="text-wom-gold" />
            </div>
            <div>
              <p className="text-xl font-bold text-[#092137]">{isLoading ? '—' : value}</p>
              <p className="text-xs text-[#092137]/50">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-[#092137]/40 gap-2">
          <Loader2 size={20} className="animate-spin" /> Loading clients...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#092137]/40">
          <Building2 size={36} className="mx-auto mb-3 opacity-30" />
          <p>{clients?.length ? 'No clients match your search.' : 'No clients yet — add them in the WOM Dashboard.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(client => {
            const color = clientColor(client.client_name)
            const stats = clientStats[client.id] ?? { accounts: 0, scheduled: 0 }
            return (
              <div key={client.id} className="bg-white rounded-xl border border-[#EDE8DC] p-5 card-hover">
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {client.client_name?.charAt(0) ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[#092137] truncate">{client.client_name}</h3>
                    <p className="text-xs text-[#092137]/40">{client.industry ?? '—'}</p>
                  </div>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0',
                    client.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-[#EDE8DC] text-[#092137]/50'
                  )}>
                    {client.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-[#F5F1E9] rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-[#092137]">{stats.accounts}</p>
                    <p className="text-xs text-[#092137]/50">Connected</p>
                  </div>
                  <div className="bg-[#F5F1E9] rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-[#092137]">{stats.scheduled}</p>
                    <p className="text-xs text-[#092137]/50">Scheduled</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => navigate(`/accounts?client=${client.id}`)} className="btn-ghost text-xs flex-1 justify-center">
                    <Link2 size={14} /> Accounts
                  </button>
                  <button onClick={() => navigate(`/calendar?client=${client.id}`)} className="btn-ghost text-xs flex-1 justify-center">
                    <CalendarDays size={14} /> Calendar
                  </button>
                  <button onClick={() => navigate(`/analytics?client=${client.id}`)} className="btn-ghost text-xs flex-1 justify-center">
                    <BarChart3 size={14} /> Analytics
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showAdd && <AddClientModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
