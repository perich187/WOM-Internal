import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Image, Video, Smile, Hash, Link2, Calendar as CalIcon, Send, Save, Eye, Check, AlertCircle, Info, Loader2 } from 'lucide-react'
import { useClients, useSocialAccounts, useCreatePost } from '@/lib/hooks'
import { useAuth } from '@/components/auth/AuthProvider'
import { useProfile } from '@/lib/hooks'
import { PLATFORMS, cn } from '@/lib/utils'
import PlatformIcon from '@/components/ui/PlatformIcon'
import { format, addDays } from 'date-fns'
import { toast } from 'sonner'

const CHARACTER_LIMITS = {
  instagram: 2200, facebook: 63206, tiktok: 2200, linkedin: 3000,
  twitter: 280, pinterest: 500, youtube: 5000, google: 1500,
}

function PlatformToggle({ platform, selected, connected, onChange }) {
  return (
    <button
      onClick={() => connected && onChange(platform.id)}
      disabled={!connected}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all text-sm',
        !connected && 'opacity-40 cursor-not-allowed',
        selected ? 'border-wom-purple bg-[#FEF8EC] text-wom-purple' :
        connected ? 'border-gray-200 bg-white text-gray-600 hover:border-gray-300' :
        'border-gray-100 bg-gray-50 text-gray-400'
      )}
    >
      <PlatformIcon platform={platform.id} size={18} />
      <span className="font-medium">{platform.label}</span>
      {selected && <Check size={14} className="ml-auto text-wom-purple" />}
      {!connected && <span className="ml-auto text-xs text-gray-300">Not connected</span>}
    </button>
  )
}

function PostPreview({ content, platform, client }) {
  if (!platform) return null
  const charLimit = CHARACTER_LIMITS[platform] ?? 2200
  const overLimit = content.length > charLimit
  const isDark = platform === 'tiktok'
  const previewBg = { instagram: 'bg-white', facebook: 'bg-[#f0f2f5]', tiktok: 'bg-black', linkedin: 'bg-[#f3f2ef]', twitter: 'bg-white' }[platform] ?? 'bg-white'
  const clientName = client?.client_name ?? 'Client'

  return (
    <div className={cn('rounded-xl overflow-hidden border', isDark ? 'border-gray-700' : 'border-gray-200')}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
        <PlatformIcon platform={platform} size={16} />
        <span className="text-xs font-medium text-gray-600 capitalize">{platform} Preview</span>
      </div>
      <div className={cn('p-4', previewBg)}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-wom-purple flex items-center justify-center text-[#092137] text-xs font-bold">
            {clientName.charAt(0)}
          </div>
          <div>
            <p className={cn('text-xs font-semibold leading-tight', isDark ? 'text-white' : 'text-gray-900')}>{clientName}</p>
            <p className={cn('text-xs leading-tight', isDark ? 'text-gray-400' : 'text-gray-500')}>Just now</p>
          </div>
        </div>
        {content ? (
          <p className={cn('text-sm whitespace-pre-wrap leading-relaxed', isDark ? 'text-white' : 'text-gray-800')}>
            {content.slice(0, charLimit)}
            {overLimit && <span className="text-red-400"> [truncated]</span>}
          </p>
        ) : (
          <p className={cn('text-sm italic', isDark ? 'text-gray-500' : 'text-gray-400')}>Your post will appear here...</p>
        )}
        <div className={cn('flex gap-4 mt-3 pt-3 border-t text-xs', isDark ? 'border-gray-700 text-gray-400' : 'border-gray-100 text-gray-400')}>
          <span>❤️ Like</span><span>💬 Comment</span><span>↗️ Share</span>
        </div>
      </div>
      <div className={cn('px-3 py-1.5 flex justify-end bg-gray-50 border-t border-gray-100 text-xs', overLimit ? 'text-red-500' : 'text-gray-400')}>
        {content.length} / {charLimit.toLocaleString()} characters
      </div>
    </div>
  )
}

export default function Compose() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: profile } = useProfile(user?.id)

  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState([])
  const [content, setContent] = useState('')
  const [scheduleType, setScheduleType] = useState('schedule')
  const [scheduleDate, setScheduleDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm"))
  const [previewPlatform, setPreviewPlatform] = useState(null)
  const [step, setStep] = useState(1)

  const { data: clients, isLoading: clientsLoading } = useClients()
  const { data: accounts } = useSocialAccounts(selectedClientId || undefined)
  const createPost = useCreatePost()

  const client = (clients ?? []).find(c => c.id === selectedClientId)
  const connectedPlatformIds = (accounts ?? []).filter(a => a.connected).map(a => a.platform)

  const togglePlatform = (id) => {
    setSelectedPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
    if (!previewPlatform && !selectedPlatforms.includes(id)) setPreviewPlatform(id)
  }

  const canProceed1 = selectedClientId && selectedPlatforms.length > 0
  const canProceed2 = content.trim().length > 0

  const handleSubmit = async () => {
    try {
      const status = scheduleType === 'draft' ? 'draft' : scheduleType === 'now' ? 'published' : 'scheduled'
      const scheduledAt = scheduleType === 'schedule' ? new Date(scheduleDate).toISOString() : null

      await createPost.mutateAsync({
        clientId: selectedClientId,
        platforms: selectedPlatforms,
        content,
        status,
        scheduledAt,
        createdByName: profile?.full_name ?? user?.email ?? 'Unknown',
      })

      toast.success(
        status === 'draft' ? 'Draft saved!' :
        status === 'published' ? 'Post published!' :
        'Post scheduled!'
      )
      navigate('/calendar')
    } catch (err) {
      toast.error('Failed to save post: ' + err.message)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {['Select Client & Platforms', 'Write Content', 'Schedule & Publish'].map((label, idx) => {
          const stepNum = idx + 1
          const isActive = step === stepNum
          const isDone = step > stepNum
          return (
            <div key={stepNum} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => stepNum < step && setStep(stepNum)}
                  className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                    isDone ? 'bg-wom-teal text-white cursor-pointer' :
                    isActive ? 'bg-wom-purple text-[#092137]' : 'bg-gray-100 text-gray-400'
                  )}
                >
                  {isDone ? <Check size={13} /> : stepNum}
                </button>
                <span className={cn('text-sm font-medium hidden sm:block', isActive ? 'text-gray-900' : 'text-gray-400')}>{label}</span>
              </div>
              {idx < 2 && <div className={cn('h-px w-8 flex-shrink-0', step > stepNum ? 'bg-wom-teal' : 'bg-gray-200')} />}
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Composer */}
        <div className="lg:col-span-3 space-y-4">

          {/* Step 1 */}
          {step === 1 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4 animate-fade-in">
              <h3 className="font-semibold text-gray-900">Select Client</h3>
              {clientsLoading ? (
                <div className="flex items-center gap-2 text-gray-400 py-4"><Loader2 size={16} className="animate-spin" /> Loading clients...</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(clients ?? []).filter(c => c.status === 'Active').map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedClientId(c.id); setSelectedPlatforms([]) }}
                      className={cn('flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left',
                        selectedClientId === c.id ? 'border-wom-purple bg-[#FEF8EC]' : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg bg-wom-purple flex items-center justify-center text-[#092137] text-sm font-bold flex-shrink-0">
                        {c.client_name?.charAt(0) ?? '?'}
                      </div>
                      <span className="text-sm font-medium text-gray-700 truncate">{c.client_name}</span>
                      {selectedClientId === c.id && <Check size={14} className="ml-auto text-wom-purple flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}

              {selectedClientId && (
                <>
                  <h3 className="font-semibold text-gray-900 pt-2">Select Platforms</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {PLATFORMS.map(platform => (
                      <PlatformToggle
                        key={platform.id}
                        platform={platform}
                        selected={selectedPlatforms.includes(platform.id)}
                        connected={connectedPlatformIds.includes(platform.id)}
                        onChange={togglePlatform}
                      />
                    ))}
                  </div>
                  {connectedPlatformIds.length === 0 && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-xl px-4 py-3">
                      <AlertCircle size={16} />
                      No platforms connected for this client.{' '}
                      <button onClick={() => navigate('/accounts')} className="underline">Connect accounts →</button>
                    </div>
                  )}
                </>
              )}

              <div className="pt-2">
                <button disabled={!canProceed1} onClick={() => setStep(2)} className="btn-primary w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed">
                  Continue to Content →
                </button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Write Your Post</h3>
                <div className="flex gap-1">
                  {selectedPlatforms.map(p => (
                    <button key={p} onClick={() => setPreviewPlatform(p)} className={cn('rounded-lg p-1 transition-colors', previewPlatform === p ? 'bg-purple-100' : 'hover:bg-gray-100')}>
                      <PlatformIcon platform={p} size={20} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400">Posting to:</span>
                {selectedPlatforms.map(p => {
                  const platform = PLATFORMS.find(pl => pl.id === p)
                  return (
                    <span key={p} className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                      <PlatformIcon platform={p} size={12} /> {platform?.label}
                    </span>
                  )
                })}
              </div>

              <div className="relative">
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="What would you like to share? Write your post here..."
                  rows={8}
                  className="w-full p-4 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-wom-purple/30 focus:border-wom-purple leading-relaxed"
                />
                <div className="absolute bottom-3 right-3 text-xs text-gray-300">{content.length} chars</div>
              </div>

              {selectedPlatforms.map(p => {
                const limit = CHARACTER_LIMITS[p]
                if (content.length > limit) return (
                  <div key={p} className="flex items-center gap-2 text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                    <AlertCircle size={13} /> Content exceeds {p} limit ({limit.toLocaleString()} chars). It will be truncated.
                  </div>
                )
                return null
              })}

              <div className="flex items-center gap-1 pt-1 border-t border-gray-100">
                {[{ icon: Image, title: 'Add image' }, { icon: Video, title: 'Add video' }, { icon: Smile, title: 'Add emoji' }, { icon: Hash, title: 'Add hashtag' }, { icon: Link2, title: 'Add link' }].map(({ icon: Icon, title }) => (
                  <button key={title} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors" title={title}>
                    <Icon size={16} />
                  </button>
                ))}
                <span className="text-xs text-gray-300 ml-auto">Media upload via Supabase Storage (coming soon)</span>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)} className="btn-secondary">← Back</button>
                <button disabled={!canProceed2} onClick={() => setStep(3)} className="btn-primary flex-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed">
                  Continue to Schedule →
                </button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4 animate-fade-in">
              <h3 className="font-semibold text-gray-900">When to Publish?</h3>

              <div className="space-y-2">
                {[
                  { value: 'now', label: 'Publish immediately', desc: 'Goes live right now across all selected platforms', icon: Send },
                  { value: 'schedule', label: 'Schedule for later', desc: 'Set a specific date and time', icon: CalIcon },
                  { value: 'draft', label: 'Save as draft', desc: 'Save without publishing or scheduling', icon: Save },
                ].map(({ value, label, desc, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setScheduleType(value)}
                    className={cn('w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all',
                      scheduleType === value ? 'border-wom-purple bg-[#FEF8EC]' : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                      scheduleType === value ? 'bg-wom-purple text-[#092137]' : 'bg-gray-100 text-gray-500'
                    )}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-800">{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                    </div>
                    {scheduleType === value && <Check size={16} className="ml-auto text-wom-purple flex-shrink-0 mt-0.5" />}
                  </button>
                ))}
              </div>

              {scheduleType === 'schedule' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date & Time (AEST)</label>
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-wom-purple/30 focus:border-wom-purple"
                  />
                </div>
              )}

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
                <p className="font-semibold text-gray-700">Post Summary</p>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="text-gray-400 w-20 text-xs">Client:</span>
                  <span className="font-medium">{client?.client_name}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="text-gray-400 w-20 text-xs">Platforms:</span>
                  <div className="flex gap-1">{selectedPlatforms.map(p => <PlatformIcon key={p} platform={p} size={16} />)}</div>
                </div>
                <div className="flex items-start gap-2 text-gray-600">
                  <span className="text-gray-400 w-20 text-xs flex-shrink-0">Content:</span>
                  <span className="text-xs line-clamp-2">{content}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="btn-secondary">← Back</button>
                <button onClick={handleSubmit} disabled={createPost.isPending} className="btn-primary flex-1 justify-center">
                  {createPost.isPending ? <Loader2 size={15} className="animate-spin" /> :
                   scheduleType === 'now' ? <><Send size={15} /> Publish Now</> :
                   scheduleType === 'schedule' ? <><CalIcon size={15} /> Schedule Post</> :
                   <><Save size={15} /> Save Draft</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="lg:col-span-2 space-y-3">
          <div className="sticky top-24">
            <h3 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2"><Eye size={15} /> Live Preview</h3>
            {selectedPlatforms.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center text-gray-400">
                <Eye size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Select platforms to see a preview</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-1 bg-gray-100 rounded-full p-1">
                  {selectedPlatforms.map(p => (
                    <button
                      key={p}
                      onClick={() => setPreviewPlatform(p)}
                      className={cn('flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-medium transition-all',
                        previewPlatform === p ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                      )}
                    >
                      <PlatformIcon platform={p} size={13} />
                      <span className="hidden sm:inline capitalize">{p}</span>
                    </button>
                  ))}
                </div>
                <PostPreview content={content} platform={previewPlatform ?? selectedPlatforms[0]} client={client} />
              </div>
            )}

            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1"><Info size={12} /> Posting Tips</p>
              <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
                <li>Best time to post: Tue–Thu 9am–11am AEST</li>
                <li>Use 3–5 hashtags on Instagram for best reach</li>
                <li>LinkedIn posts with images get 2x more engagement</li>
                <li>TikTok videos under 30s get highest completion rates</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
