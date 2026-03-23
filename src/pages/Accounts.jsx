import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle, RefreshCw, Unlink, Lock, ChevronDown, ChevronUp, Loader2, Info } from 'lucide-react'
import { useClients, useSocialAccounts, useDisconnectAccount } from '@/lib/hooks'
import { PLATFORMS, formatNumber, cn } from '@/lib/utils'
import PlatformIcon from '@/components/ui/PlatformIcon'
import { toast } from 'sonner'

const OAUTH_INFO = {
  instagram: { description: 'Connect via Meta Login. Requires a Business/Creator account linked to a Facebook Page.', scopes: ['instagram_basic', 'instagram_content_publish', 'instagram_manage_insights'] },
  facebook: { description: 'Connect a Facebook Page to publish posts and access Page insights.', scopes: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list'] },
  tiktok: { description: 'Connect a TikTok Business account to schedule videos and view analytics.', scopes: ['video.publish', 'video.upload', 'user.info.basic'] },
  linkedin: { description: 'Connect a LinkedIn Company Page to publish posts and view impressions.', scopes: ['w_member_social', 'r_organization_social', 'rw_organization_admin'] },
  twitter: { description: 'Connect a Twitter/X account to schedule tweets and view engagement.', scopes: ['tweet.read', 'tweet.write', 'users.read'] },
  pinterest: { description: 'Connect a Pinterest Business account to schedule pins.', scopes: ['boards:read', 'pins:write', 'user_accounts:read'] },
  youtube: { description: 'Connect a YouTube channel via Google OAuth to schedule videos.', scopes: ['youtube.upload', 'youtube.readonly'] },
  google: { description: 'Connect a Google Business Profile to post updates.', scopes: ['https://www.googleapis.com/auth/business.manage'] },
}

function OAuthInfoModal({ platform, onClose }) {
  const info = OAUTH_INFO[platform]
  const p = PLATFORMS.find(p => p.id === platform)
  if (!info) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <PlatformIcon platform={platform} size={32} />
          <div>
            <h2 className="font-bold text-gray-900">{p?.label} OAuth</h2>
            <p className="text-xs text-gray-400">How the connection works</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-4">{info.description}</p>
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Required Permissions</p>
          <ul className="space-y-1">
            {info.scopes.map(scope => (
              <li key={scope} className="flex items-center gap-2 text-xs text-gray-600">
                <CheckCircle2 size={12} className="text-wom-teal" />
                <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200">{scope}</code>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-5">
          <Lock size={11} /> Tokens are stored securely in Supabase and never exposed to the browser.
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Close</button>
          <button onClick={onClose} className="btn-primary flex-1">Connect Now</button>
        </div>
      </div>
    </div>
  )
}

function AccountRow({ account, onDisconnect }) {
  const platform = PLATFORMS.find(p => p.id === account.platform)
  const disconnectMutation = useDisconnectAccount()

  const handleDisconnect = async () => {
    if (!confirm(`Disconnect ${platform?.label} for this client?`)) return
    try {
      await disconnectMutation.mutateAsync(account.id)
      toast.success(`${platform?.label} disconnected`)
    } catch {
      toast.error('Failed to disconnect account')
    }
  }

  return (
    <div className={cn(
      'flex items-center gap-4 p-4 rounded-xl border transition-colors',
      account.connected ? 'border-gray-100 bg-white hover:border-wom-purple/20' : 'border-dashed border-gray-200 bg-gray-50/50'
    )}>
      <PlatformIcon platform={account.platform} size={36} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-gray-800 text-sm">{platform?.label ?? account.platform}</p>
          {account.connected ? (
            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              <CheckCircle2 size={11} /> Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              <XCircle size={11} /> Not connected
            </span>
          )}
        </div>
        {account.connected ? (
          <p className="text-xs text-gray-400 mt-0.5">
            {account.username ?? account.account_name ?? 'Connected'}
            {account.followers ? ` · ${formatNumber(account.followers)} followers` : ''}
          </p>
        ) : (
          <p className="text-xs text-gray-400 mt-0.5">Click "Connect" to authorise via OAuth</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {account.connected ? (
          <>
            <button title="Refresh token" className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
              <RefreshCw size={14} />
            </button>
            <button onClick={handleDisconnect} disabled={disconnectMutation.isPending} className="btn-danger text-xs py-1.5 px-3">
              {disconnectMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <><Unlink size={13} /> Disconnect</>}
            </button>
          </>
        ) : (
          <button className="btn-primary text-xs py-1.5 px-4">Connect</button>
        )}
      </div>
    </div>
  )
}

function ClientSection({ client, allAccounts }) {
  const [open, setOpen] = useState(true)

  // Build full list — one slot per platform, using DB data where it exists
  const accountsByPlatform = Object.fromEntries(allAccounts.map(a => [a.platform, a]))
  const fullList = PLATFORMS.map(p => accountsByPlatform[p.id] ?? {
    id: `placeholder-${client.id}-${p.id}`,
    client_id: client.id,
    platform: p.id,
    connected: false,
    followers: 0,
    username: null,
  })

  const connectedCount = allAccounts.filter(a => a.connected).length

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-wom-purple flex items-center justify-center text-[#092137] font-bold text-sm flex-shrink-0">
          {client.client_name?.charAt(0) ?? '?'}
        </div>
        <div className="flex-1 text-left">
          <p className="font-semibold text-gray-900">{client.client_name}</p>
          <p className="text-xs text-gray-400">{client.industry ?? '—'} · {connectedCount}/{PLATFORMS.length} platforms connected</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 mr-4">
          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-wom-purple rounded-full transition-all duration-500" style={{ width: `${(connectedCount / PLATFORMS.length) * 100}%` }} />
          </div>
          <span className="text-xs text-gray-400">{connectedCount}/{PLATFORMS.length}</span>
        </div>
        {open ? <ChevronUp size={18} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={18} className="text-gray-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2.5 border-t border-gray-50">
          <div className="pt-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Platform Connections</p>
          </div>
          {fullList.map(account => (
            <AccountRow key={account.id} account={account} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Accounts() {
  const [searchParams] = useSearchParams()
  const clientFilter = searchParams.get('client')
  const [infoPanel, setInfoPanel] = useState(null)

  const { data: clients, isLoading: clientsLoading } = useClients()
  const { data: accounts, isLoading: accountsLoading } = useSocialAccounts()

  const filteredClients = clientFilter
    ? (clients ?? []).filter(c => c.id === clientFilter)
    : (clients ?? []).filter(c => c.status === 'Active')

  const isLoading = clientsLoading || accountsLoading

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* OAuth explainer */}
      <div className="bg-gradient-to-r from-[#FEF8EC] to-blue-50 border border-[#F0A629]/30 rounded-xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 bg-wom-purple rounded-xl flex items-center justify-center flex-shrink-0">
          <Lock size={18} className="text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">Connecting Social Media Accounts via OAuth 2.0</h3>
          <p className="text-sm text-gray-600">
            Each platform uses secure OAuth 2.0 authorisation. The client is redirected to the platform's
            login page, grants permissions, then returns. Access tokens are stored encrypted in Supabase —
            <strong> we never see passwords</strong>.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => setInfoPanel(p.id)}
                className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 px-2.5 py-1 rounded-full hover:border-wom-purple/40 hover:bg-[#FEF8EC] transition-colors"
              >
                <PlatformIcon platform={p.id} size={14} />
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Client sections */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
          <Loader2 size={20} className="animate-spin" /> Loading accounts...
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>No active clients found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClients.map(client => (
            <ClientSection
              key={client.id}
              client={client}
              allAccounts={(accounts ?? []).filter(a => a.client_id === client.id)}
            />
          ))}
        </div>
      )}

      {infoPanel && <OAuthInfoModal platform={infoPanel} onClose={() => setInfoPanel(null)} />}
    </div>
  )
}
