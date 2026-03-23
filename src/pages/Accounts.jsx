import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2, XCircle, RefreshCw, Unlink,
  Lock, ChevronDown, ChevronUp, Loader2, Clock, Check,
} from 'lucide-react'
import { useClients, useSocialAccounts, useDisconnectAccount, useMetaPendingSession, useConfirmMetaPages } from '@/lib/hooks'
import { PLATFORMS, formatNumber, cn } from '@/lib/utils'
import PlatformIcon from '@/components/ui/PlatformIcon'
import { startMetaOAuth, isMetaPlatform } from '@/lib/meta'
import { toast } from 'sonner'

// ─── Page selection modal ─────────────────────────────────────────────────────

function PageSelectModal({ sessionId, clientId, clientName, onClose }) {
  const { data: session, isLoading } = useMetaPendingSession(sessionId)
  const confirmPages = useConfirmMetaPages()
  const [selected, setSelected] = useState([])

  const pages = session?.pages ?? []

  useEffect(() => {
    // Pre-select all by default
    if (pages.length > 0 && selected.length === 0) {
      setSelected(pages.map(p => p.fb_page_id))
    }
  }, [pages.length])

  const toggle = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleConfirm = async () => {
    const chosenPages = pages.filter(p => selected.includes(p.fb_page_id))
    if (chosenPages.length === 0) {
      toast.error('Select at least one Page to connect.')
      return
    }
    try {
      const count = await confirmPages.mutateAsync({ sessionId, clientId, selectedPages: chosenPages })
      toast.success(`${count} account(s) connected to ${clientName}!`)
      onClose()
    } catch (err) {
      toast.error('Failed to save: ' + err.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in">
        <h2 className="font-semibold text-[#092137] text-lg mb-1">Select Pages to Connect</h2>
        <p className="text-sm text-[#092137]/50 mb-5">
          Choose which Facebook Page(s) and Instagram account(s) to link to <strong>{clientName}</strong>.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-[#092137]/40 gap-2">
            <Loader2 size={18} className="animate-spin" /> Loading pages...
          </div>
        ) : pages.length === 0 ? (
          <p className="text-sm text-[#092137]/50 text-center py-6">No pages found in this session.</p>
        ) : (
          <div className="space-y-3 mb-6 max-h-72 overflow-y-auto">
            {pages.map(page => {
              const isSelected = selected.includes(page.fb_page_id)
              return (
                <button
                  key={page.fb_page_id}
                  onClick={() => toggle(page.fb_page_id)}
                  className={cn(
                    'w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all',
                    isSelected ? 'border-wom-gold bg-[#FEF8EC]' : 'border-[#EDE8DC] hover:border-gray-300'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all',
                    isSelected ? 'bg-wom-gold border-wom-gold' : 'border-[#EDE8DC]'
                  )}>
                    {isSelected && <Check size={11} className="text-[#092137]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <PlatformIcon platform="facebook" size={16} />
                      <span className="font-medium text-sm text-[#092137]">{page.fb_page_name}</span>
                    </div>
                    {page.ig_username ? (
                      <div className="flex items-center gap-2">
                        <PlatformIcon platform="instagram" size={14} />
                        <span className="text-xs text-[#092137]/50">
                          @{page.ig_username}
                          {page.ig_followers ? ` · ${formatNumber(page.ig_followers)} followers` : ''}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-[#092137]/30">No Instagram Business account linked to this Page</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={confirmPages.isPending || selected.length === 0}
            className="btn-primary flex-1 justify-center disabled:opacity-40"
          >
            {confirmPages.isPending
              ? <Loader2 size={14} className="animate-spin" />
              : `Connect ${selected.length} Page${selected.length !== 1 ? 's' : ''}`
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Connect button logic per platform ────────────────────────────────────────

function handleConnect(platform, clientId) {
  if (isMetaPlatform(platform)) {
    const ok = startMetaOAuth(clientId)
    if (!ok) {
      toast.error('Meta App ID not configured. Add VITE_META_APP_ID to your environment variables.')
    }
    return
  }
  // Other platforms — show coming soon
  const label = PLATFORMS.find(p => p.id === platform)?.label ?? platform
  toast.info(`${label} integration coming soon.`)
}

// ─── Account row ──────────────────────────────────────────────────────────────

function AccountRow({ account }) {
  const platform         = PLATFORMS.find(p => p.id === account.platform)
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

  const isMeta    = isMetaPlatform(account.platform)
  const isRealRow = !account.id?.startsWith('placeholder-')

  return (
    <div className={cn(
      'flex items-center gap-4 p-4 rounded-xl border transition-colors',
      account.connected
        ? 'border-[#EDE8DC] bg-white hover:border-wom-gold/20'
        : 'border-dashed border-[#EDE8DC] bg-[#F5F1E9]/50'
    )}>
      <PlatformIcon platform={account.platform} size={36} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-[#092137] text-sm">{platform?.label ?? account.platform}</p>
          {account.connected ? (
            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              <CheckCircle2 size={11} /> Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-[#092137]/40 bg-[#EDE8DC] px-2 py-0.5 rounded-full">
              <XCircle size={11} /> Not connected
            </span>
          )}
          {/* "Live" badge for Meta platforms that are actually wired up */}
          {isMeta && !account.connected && (
            <span className="flex items-center gap-1 text-xs text-[#F0A629] bg-[#FEF8EC] border border-[#F0A629]/30 px-2 py-0.5 rounded-full font-medium">
              Ready to connect
            </span>
          )}
          {!isMeta && !account.connected && (
            <span className="flex items-center gap-1 text-xs text-[#092137]/30 bg-[#EDE8DC] px-2 py-0.5 rounded-full">
              <Clock size={10} /> Coming soon
            </span>
          )}
        </div>

        {account.connected ? (
          <p className="text-xs text-[#092137]/40 mt-0.5">
            {account.username ?? account.account_name ?? 'Connected'}
            {account.followers ? ` · ${formatNumber(account.followers)} followers` : ''}
          </p>
        ) : (
          <p className="text-xs text-[#092137]/40 mt-0.5">
            {isMeta
              ? 'Click Connect → you\'ll be redirected to Facebook to authorise'
              : 'OAuth integration coming soon'}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {account.connected ? (
          <>
            <button
              title="Refresh token"
              className="w-8 h-8 rounded-lg bg-[#EDE8DC] hover:bg-[#d6d0c4] flex items-center justify-center text-[#092137]/50 transition-colors"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={handleDisconnect}
              disabled={disconnectMutation.isPending || !isRealRow}
              className="btn-danger text-xs py-1.5 px-3"
            >
              {disconnectMutation.isPending
                ? <Loader2 size={13} className="animate-spin" />
                : <><Unlink size={13} /> Disconnect</>
              }
            </button>
          </>
        ) : (
          <button
            onClick={() => handleConnect(account.platform, account.client_id)}
            disabled={!isMeta}
            className={cn(
              'text-xs py-1.5 px-4 rounded-full font-medium transition-all duration-200',
              isMeta
                ? 'btn-primary'
                : 'bg-[#EDE8DC] text-[#092137]/30 cursor-not-allowed border-0'
            )}
          >
            Connect
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Client section ───────────────────────────────────────────────────────────

function ClientSection({ client, allAccounts }) {
  const [open, setOpen] = useState(true)

  const accountsByPlatform = Object.fromEntries(allAccounts.map(a => [a.platform, a]))
  const fullList = PLATFORMS.map(p => accountsByPlatform[p.id] ?? {
    id:        `placeholder-${client.id}-${p.id}`,
    client_id: client.id,
    platform:  p.id,
    connected: false,
    followers: 0,
    username:  null,
  })

  const connectedCount = allAccounts.filter(a => a.connected).length

  return (
    <div className="bg-white rounded-xl border border-[#EDE8DC] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 hover:bg-[#F5F1E9] transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-wom-gold flex items-center justify-center text-[#092137] font-bold text-sm flex-shrink-0">
          {client.client_name?.charAt(0) ?? '?'}
        </div>
        <div className="flex-1 text-left">
          <p className="font-semibold text-[#092137]">{client.client_name}</p>
          <p className="text-xs text-[#092137]/40">
            {client.industry ?? '—'} · {connectedCount}/{PLATFORMS.length} platforms connected
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 mr-4">
          <div className="w-24 h-1.5 bg-[#EDE8DC] rounded-full overflow-hidden">
            <div
              className="h-full bg-wom-gold rounded-full transition-all duration-500"
              style={{ width: `${(connectedCount / PLATFORMS.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-[#092137]/40">{connectedCount}/{PLATFORMS.length}</span>
        </div>
        {open
          ? <ChevronUp   size={18} className="text-[#092137]/40 flex-shrink-0" />
          : <ChevronDown size={18} className="text-[#092137]/40 flex-shrink-0" />
        }
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-[#EDE8DC]">
          {/* Meta section — live */}
          <div className="pt-4 mb-3">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-semibold text-[#092137]/40 uppercase tracking-wider">
                Meta Platforms
              </p>
              <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium">
                Live
              </span>
            </div>
            {fullList
              .filter(a => isMetaPlatform(a.platform))
              .map(account => (
                <div key={account.id} className="mb-2.5">
                  <AccountRow account={account} />
                </div>
              ))
            }
          </div>

          {/* Other platforms — coming soon */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-semibold text-[#092137]/40 uppercase tracking-wider">
                Other Platforms
              </p>
              <span className="text-xs bg-[#EDE8DC] text-[#092137]/40 px-2 py-0.5 rounded-full">
                Coming soon
              </span>
            </div>
            {fullList
              .filter(a => !isMetaPlatform(a.platform))
              .map(account => (
                <div key={account.id} className="mb-2.5">
                  <AccountRow account={account} />
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Accounts() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: clients,  isLoading: clientsLoading  } = useClients()
  const { data: accounts, isLoading: accountsLoading } = useSocialAccounts()

  const qc = useQueryClient()
  const clientFilter    = searchParams.get('client')
  const sessionId       = searchParams.get('session')
  const filteredClients = clientFilter
    ? (clients ?? []).filter(c => c.id === clientFilter)
    : (clients ?? []).filter(c => c.status === 'Active')

  // The client whose session we're selecting pages for
  const sessionClient = sessionId && clientFilter
    ? (clients ?? []).find(c => c.id === clientFilter)
    : null

  // Handle OAuth callback errors
  useEffect(() => {
    const error = searchParams.get('error')
    if (error) {
      toast.error(`Connection failed: ${decodeURIComponent(error)}`)
      setSearchParams({})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = clientsLoading || accountsLoading

  return (
    <>
    {sessionId && sessionClient && (
      <PageSelectModal
        sessionId={sessionId}
        clientId={clientFilter}
        clientName={sessionClient.client_name}
        onClose={() => setSearchParams({})}
      />
    )}
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Info banner */}
      <div className="bg-gradient-to-r from-[#FEF8EC] to-blue-50 border border-[#F0A629]/30 rounded-xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 bg-wom-gold rounded-xl flex items-center justify-center flex-shrink-0">
          <Lock size={18} className="text-[#092137]" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-[#092137] mb-1">Connecting Social Media Accounts</h3>
          <p className="text-sm text-[#092137]/60">
            Click <strong>Connect</strong> next to any platform. You'll be redirected to that
            platform's login to grant access — we never see your passwords. Tokens are stored
            securely in Supabase.
          </p>
          <div className="flex flex-wrap gap-3 mt-3 text-xs">
            <span className="flex items-center gap-1.5 text-green-600 font-medium">
              <CheckCircle2 size={13} /> Facebook Pages — Live
            </span>
            <span className="flex items-center gap-1.5 text-green-600 font-medium">
              <CheckCircle2 size={13} /> Instagram Business — Live
            </span>
            <span className="flex items-center gap-1.5 text-[#092137]/40">
              <Clock size={13} /> TikTok, LinkedIn, Twitter — Coming soon
            </span>
          </div>
        </div>
      </div>

      {/* Client sections */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-[#092137]/40 gap-2">
          <Loader2 size={20} className="animate-spin" /> Loading accounts...
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-16 text-[#092137]/40">
          <p className="font-medium">No active clients found.</p>
          <p className="text-sm mt-1">Add a client first, then connect their social accounts here.</p>
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
    </div>
    </>
  )
}
