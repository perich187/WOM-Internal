import { useState } from 'react'
import {
  Instagram, Facebook, Music2, Search, Loader2, Sparkles,
  ExternalLink, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { useDiscoverInfluencers } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: '#E1306C', placeholder: 'perthfood' },
  { id: 'facebook',  label: 'Facebook',  icon: Facebook,  color: '#1877F2', placeholder: 'Perth cafe' },
  { id: 'tiktok',    label: 'TikTok',    icon: Music2,    color: '#161616', placeholder: 'perthfoodie' },
]

function formatNum(n) {
  if (n == null) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

export default function FindInfluencers() {
  const [platform, setPlatform] = useState('instagram')
  const [query,    setQuery]    = useState('')
  const [limit,    setLimit]    = useState(20)
  const [result,   setResult]   = useState(null)

  const discover = useDiscoverInfluencers()

  const current = PLATFORMS.find(p => p.id === platform)

  const handleSearch = async (e) => {
    e?.preventDefault()
    if (!query.trim()) return
    try {
      const data = await discover.mutateAsync({ platform, query: query.trim(), limit })
      setResult(data)
      toast.success(
        `Saved ${data.count} ${current.label} creator${data.count === 1 ? '' : 's'}${data.fromCache ? ' (from cache)' : ''}`
      )
    } catch (err) {
      toast.error(err.message ?? 'Discovery failed')
      setResult(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="bg-white rounded-xl border border-[#EDE8DC] p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FEF8EC] flex items-center justify-center flex-shrink-0">
            <Sparkles size={20} className="text-wom-gold" />
          </div>
          <div>
            <h2 className="font-bold text-[#092137]">Discover new creators</h2>
            <p className="text-sm text-[#092137]/60 mt-0.5">
              Search a hashtag or keyword — results are pulled from Apify and automatically saved to your Influencers database.
            </p>
          </div>
        </div>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="bg-white rounded-xl border border-[#EDE8DC] p-5 space-y-4">
        {/* Platform picker */}
        <div>
          <label className="block text-xs font-semibold text-[#092137]/60 uppercase tracking-wider mb-2">Platform</label>
          <div className="grid grid-cols-3 gap-2">
            {PLATFORMS.map(p => {
              const Icon = p.icon
              const active = platform === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlatform(p.id)}
                  className={cn(
                    'flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                    active
                      ? 'border-wom-gold bg-[#FEF8EC] text-[#092137]'
                      : 'border-[#EDE8DC] text-[#092137]/60 hover:border-[#092137]/20'
                  )}
                >
                  <Icon size={16} style={{ color: active ? p.color : undefined }} />
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Query input */}
        <div>
          <label className="block text-xs font-semibold text-[#092137]/60 uppercase tracking-wider mb-2">
            {platform === 'facebook' ? 'Search term' : 'Hashtag or keyword'}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#092137]/40" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={current.placeholder}
                className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-[#EDE8DC] bg-white focus:outline-none focus:ring-2 focus:ring-wom-gold/30 focus:border-wom-gold"
              />
            </div>
            <select
              value={limit}
              onChange={e => setLimit(Number(e.target.value))}
              className="px-3 py-3 text-sm rounded-xl border border-[#EDE8DC] bg-white focus:outline-none focus:ring-2 focus:ring-wom-gold/30 focus:border-wom-gold"
            >
              <option value={10}>10 results</option>
              <option value={20}>20 results</option>
              <option value={30}>30 results</option>
              <option value={50}>50 results</option>
            </select>
            <button
              type="submit"
              disabled={discover.isPending || !query.trim()}
              className="btn-primary px-6 disabled:opacity-60"
            >
              {discover.isPending ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Search
            </button>
          </div>
          <p className="text-xs text-[#092137]/40 mt-2">
            {platform === 'facebook'
              ? 'Facebook scraping is less reliable than Insta/TikTok — results may be sparse.'
              : 'Don\'t include the # — just the tag name.'}
          </p>
        </div>
      </form>

      {/* Results */}
      {discover.isPending && (
        <div className="flex items-center justify-center gap-3 py-16 text-[#092137]/50">
          <Loader2 size={24} className="animate-spin" />
          <span>Searching Apify · this can take 30-60 seconds…</span>
        </div>
      )}

      {result && !discover.isPending && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <CheckCircle2 size={18} className="text-green-600" />
            <p className="text-[#092137]/70">
              <span className="font-semibold text-[#092137]">{result.count}</span> creators saved to database
              {result.fromCache && <span className="text-[#092137]/40 ml-2">(cached result, &lt; 7 days old)</span>}
            </p>
          </div>

          {result.results.length === 0 ? (
            <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-900">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">No creators returned</p>
                <p className="mt-1">Try a broader search term, or check the Apify console to make sure the actor run succeeded.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.results.map(c => {
                const handle = c.instagram_handle ?? c.tiktok_handle ?? c.facebook_handle
                const followers = c.ig_followers ?? c.tt_followers ?? c.fb_followers
                const url = c.ig_profile_url ?? c.tt_profile_url ?? c.fb_page_url
                const pic = c.ig_profile_pic ?? c.tt_profile_pic ?? c.fb_profile_pic
                return (
                  <div key={c.id} className="bg-white rounded-xl border border-[#EDE8DC] p-4 flex gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#F5F1E9] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {pic
                        ? <img src={pic} alt="" className="w-full h-full object-cover" />
                        : <span className="text-sm font-bold text-[#092137]/50">{(c.display_name ?? handle ?? '?').charAt(0).toUpperCase()}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#092137] truncate">{c.display_name ?? handle}</p>
                      <p className="text-xs text-[#092137]/50 truncate">@{handle}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-medium text-[#092137]/70">
                          {formatNum(followers)} followers
                        </span>
                        {url && (
                          <a href={url} target="_blank" rel="noreferrer" className="text-xs text-wom-gold hover:underline flex items-center gap-1">
                            View <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
