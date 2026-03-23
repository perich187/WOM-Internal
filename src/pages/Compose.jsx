import { useState, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Image, Video, Smile, Hash, Link2, Calendar as CalIcon,
  Send, Save, Eye, Check, AlertCircle, Info, Loader2,
  X, Upload, Plus, MessageSquare, Pencil,
} from 'lucide-react'
import { useClients, useSocialAccounts, useCreatePost, useUpdatePost, usePublishNow, useUploadMedia, useDeleteMedia } from '@/lib/hooks'
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

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/mov', 'video/quicktime', 'video/mpeg']
const MAX_FILE_SIZE_MB = 50

// ─── Platform toggle ──────────────────────────────────────────────────────────

function PlatformToggle({ platform, selected, connected, onChange }) {
  return (
    <button
      onClick={() => connected && onChange(platform.id)}
      disabled={!connected}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all text-sm',
        !connected && 'opacity-40 cursor-not-allowed',
        selected ? 'border-wom-gold bg-[#FEF8EC] text-wom-gold' :
        connected ? 'border-[#EDE8DC] bg-white text-[#092137]/60 hover:border-gray-300' :
        'border-[#EDE8DC] bg-[#F5F1E9] text-[#092137]/40'
      )}
    >
      <PlatformIcon platform={platform.id} size={18} />
      <span className="font-medium">{platform.label}</span>
      {selected && <Check size={14} className="ml-auto text-wom-gold" />}
      {!connected && <span className="ml-auto text-xs text-gray-300">Not connected</span>}
    </button>
  )
}

// ─── Media thumbnail ──────────────────────────────────────────────────────────

function MediaThumb({ media, onRemove, uploading }) {
  const isVideo = media.type?.startsWith('video') || media.url?.match(/\.(mp4|mov|mpeg)$/i)
  return (
    <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-[#EDE8DC] bg-[#F5F1E9] flex-shrink-0">
      {uploading ? (
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-wom-gold" />
        </div>
      ) : isVideo ? (
        <div className="w-full h-full flex items-center justify-center bg-[#092137]/10">
          <Video size={24} className="text-[#092137]/40" />
        </div>
      ) : (
        <img src={media.preview ?? media.url} alt="" className="w-full h-full object-cover" />
      )}
      {!uploading && (
        <button
          onClick={() => onRemove(media)}
          className="absolute top-0.5 right-0.5 w-5 h-5 bg-[#092137]/70 hover:bg-red-500 rounded-full flex items-center justify-center text-white transition-colors"
        >
          <X size={11} />
        </button>
      )}
    </div>
  )
}

// ─── Post preview ─────────────────────────────────────────────────────────────

function PostPreview({ content, platform, client, mediaItems }) {
  if (!platform) return null
  const charLimit = CHARACTER_LIMITS[platform] ?? 2200
  const overLimit = content.length > charLimit
  const isDark = platform === 'tiktok'
  const previewBg = { instagram: 'bg-white', facebook: 'bg-[#f0f2f5]', tiktok: 'bg-black', linkedin: 'bg-[#f3f2ef]', twitter: 'bg-white' }[platform] ?? 'bg-white'
  const clientName = client?.client_name ?? 'Client'
  const images = mediaItems.filter(m => !m.type?.startsWith('video') && !m.url?.match(/\.(mp4|mov|mpeg)$/i))

  return (
    <div className={cn('rounded-xl overflow-hidden border', isDark ? 'border-gray-700' : 'border-[#EDE8DC]')}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#EDE8DC] bg-[#F5F1E9]">
        <PlatformIcon platform={platform} size={16} />
        <span className="text-xs font-medium text-[#092137]/60 capitalize">{platform} Preview</span>
      </div>
      <div className={cn('p-4', previewBg)}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-wom-gold flex items-center justify-center text-[#092137] text-xs font-bold">
            {clientName.charAt(0)}
          </div>
          <div>
            <p className={cn('text-xs font-semibold leading-tight', isDark ? 'text-white' : 'text-[#092137]')}>{clientName}</p>
            <p className={cn('text-xs leading-tight', isDark ? 'text-gray-400' : 'text-[#092137]/50')}>Just now</p>
          </div>
        </div>

        {/* Media preview */}
        {images.length > 0 && (
          <div className={cn('mb-3 rounded-lg overflow-hidden',
            images.length === 1 ? '' : 'grid grid-cols-2 gap-0.5'
          )}>
            {images.slice(0, 4).map((m, i) => (
              <div key={i} className={cn('relative', images.length === 1 ? 'aspect-square' : 'aspect-square')}>
                <img src={m.preview ?? m.url} alt="" className="w-full h-full object-cover" />
                {i === 3 && images.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">+{images.length - 4}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {content ? (
          <p className={cn('text-sm whitespace-pre-wrap leading-relaxed', isDark ? 'text-white' : 'text-[#092137]')}>
            {content.slice(0, charLimit)}
            {overLimit && <span className="text-red-400"> [truncated]</span>}
          </p>
        ) : (
          <p className={cn('text-sm italic', isDark ? 'text-gray-500' : 'text-[#092137]/40')}>Your post will appear here...</p>
        )}

        <div className={cn('flex gap-4 mt-3 pt-3 border-t text-xs', isDark ? 'border-gray-700 text-gray-400' : 'border-[#EDE8DC] text-[#092137]/40')}>
          <span>❤️ Like</span><span>💬 Comment</span><span>↗️ Share</span>
        </div>
      </div>
      <div className={cn('px-3 py-1.5 flex justify-end bg-[#F5F1E9] border-t border-[#EDE8DC] text-xs', overLimit ? 'text-red-500' : 'text-[#092137]/40')}>
        {content.length} / {charLimit.toLocaleString()} characters
      </div>
    </div>
  )
}

// ─── Emoji picker ─────────────────────────────────────────────────────────────

const EMOJI_CATEGORIES = [
  { label: 'Smileys',  emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🥰','😍','🤩','😘','😎','🤔','🙄','😏','😌','🥳','🤗','😉','😋','😛','🥲','😤','😢','😭','😱','🤯','🤠','😴'] },
  { label: 'Hearts',   emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','🔥','✨','💫','🌟','⭐','💥','🎉','🎊','🎈','🏆','🥇','🎯','🚀','💯'] },
  { label: 'Hands',    emojis: ['👋','✌️','🤞','👍','👎','👏','🙌','🤝','🙏','💪','👊','✊','🤜','🤛','👌','🤌','🫶','🫂','💅','🤳','☝️','👆','👇','👈','👉','🖐️','✋','🤚','🤙','🤘'] },
  { label: 'Nature',   emojis: ['🌸','🌺','🌻','🌹','🌷','🌱','🌿','🍀','🌴','🌵','🌊','💧','⚡','❄️','🌈','☀️','🌙','🌍','🐶','🐱','🦋','🐝','🦄','🐬','🌮','🍕','🍔','☕','🧋','🍷'] },
  { label: 'Business', emojis: ['📱','💻','📸','🎬','🎵','🎤','📢','📣','📝','✏️','📌','📍','🔖','🏷️','💡','🔑','💎','👑','💰','💳','🛍️','🎁','📦','🔔','📊','📈','📉','🗓️','⏰','🏢','🌐','📧'] },
]

function EmojiPicker({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState(0)
  const ref = useRef(null)

  // Close on outside click
  useCallback(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-2 bg-white border border-[#EDE8DC] rounded-xl shadow-xl z-50 w-72"
      onMouseDown={e => e.preventDefault()} // prevent textarea blur
    >
      {/* Category tabs */}
      <div className="flex border-b border-[#EDE8DC] px-1 pt-1">
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button
            key={cat.label}
            onClick={() => setActiveCategory(i)}
            className={cn(
              'flex-1 py-1.5 text-xs font-medium rounded-t-lg transition-colors',
              activeCategory === i
                ? 'bg-[#FEF8EC] text-wom-gold border-b-2 border-wom-gold'
                : 'text-[#092137]/40 hover:text-[#092137]/70'
            )}
          >
            {EMOJI_CATEGORIES[i].emojis[0]}
          </button>
        ))}
      </div>
      {/* Label */}
      <div className="px-3 py-1.5 text-xs font-semibold text-[#092137]/40 uppercase tracking-wider border-b border-[#EDE8DC]">
        {EMOJI_CATEGORIES[activeCategory].label}
      </div>
      {/* Emoji grid */}
      <div className="p-2 grid grid-cols-8 gap-0.5 max-h-44 overflow-y-auto">
        {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji, i) => (
          <button
            key={i}
            onClick={() => onSelect(emoji)}
            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-[#F5F1E9] rounded-lg transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Drop zone ────────────────────────────────────────────────────────────────

function DropZone({ onFiles, disabled }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const processFiles = (files) => {
    const valid = Array.from(files).filter(f => {
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast.error(`${f.name} is too large (max ${MAX_FILE_SIZE_MB}MB)`)
        return false
      }
      if (![...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES].includes(f.type)) {
        toast.error(`${f.name} is not a supported file type`)
        return false
      }
      return true
    })
    if (valid.length) onFiles(valid)
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    processFiles(e.dataTransfer.files)
  }, [onFiles])

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
        dragging ? 'border-wom-gold bg-[#FEF8EC]' : 'border-[#EDE8DC] hover:border-wom-gold/50 hover:bg-[#F5F1E9]',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={[...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES].join(',')}
        multiple
        className="hidden"
        onChange={(e) => processFiles(e.target.files)}
        disabled={disabled}
      />
      <Upload size={24} className="mx-auto mb-2 text-[#092137]/30" />
      <p className="text-sm text-[#092137]/50 font-medium">
        {dragging ? 'Drop files here' : 'Drag & drop or click to upload'}
      </p>
      <p className="text-xs text-[#092137]/30 mt-1">JPG, PNG, GIF, WebP, MP4 · Max {MAX_FILE_SIZE_MB}MB</p>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Compose() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const editPost  = location.state?.editPost ?? null
  const isEditing = !!editPost

  const { user } = useAuth()
  const { data: profile } = useProfile(user?.id)

  const [selectedClientId, setSelectedClientId]   = useState(editPost?.client_id ?? '')
  const [selectedPlatforms, setSelectedPlatforms] = useState(editPost?.platforms ?? [])
  const [content, setContent]                     = useState(editPost?.content ?? '')
  const [firstComment, setFirstComment]           = useState(editPost?.first_comment ?? '')
  const [showFirstComment, setShowFirstComment]   = useState(!!editPost?.first_comment)
  const [scheduleType, setScheduleType]           = useState(
    editPost ? (editPost.scheduled_at ? 'schedule' : 'draft') : 'schedule'
  )
  const [scheduleDate, setScheduleDate]           = useState(
    editPost?.scheduled_at
      ? format(new Date(editPost.scheduled_at), "yyyy-MM-dd'T'HH:mm")
      : format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm")
  )
  const [previewPlatform, setPreviewPlatform]     = useState(editPost?.platforms?.[0] ?? null)
  const [step, setStep]                           = useState(isEditing ? 2 : 1)
  const [showEmojiPicker, setShowEmojiPicker]     = useState(false)

  const textareaRef = useRef(null)

  const insertAtCursor = (text) => {
    const el = textareaRef.current
    if (!el) { setContent(c => c + text); return }
    const start = el.selectionStart
    const end   = el.selectionEnd
    setContent(c => c.slice(0, start) + text + c.slice(end))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + text.length, start + text.length)
    })
  }

  // mediaItems: [{ file, preview, url, path, uploading }]
  const [mediaItems, setMediaItems] = useState(
    (editPost?.media_urls ?? []).map((url, i) => ({
      id:        `existing-${i}`,
      url,
      preview:   url,
      path:      null,
      uploading: false,
    }))
  )

  const { data: clients, isLoading: clientsLoading } = useClients()
  const { data: accounts } = useSocialAccounts(selectedClientId || undefined)
  const createPost    = useCreatePost()
  const updatePost    = useUpdatePost()
  const publishNow    = usePublishNow()
  const uploadMedia   = useUploadMedia()
  const deleteMedia   = useDeleteMedia()

  const client = (clients ?? []).find(c => c.id === selectedClientId)
  const connectedPlatformIds = (accounts ?? []).filter(a => a.connected).map(a => a.platform)
  const hasInstagram = selectedPlatforms.includes('instagram')

  const togglePlatform = (id) => {
    setSelectedPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
    if (!previewPlatform && !selectedPlatforms.includes(id)) setPreviewPlatform(id)
  }

  const canProceed1 = selectedClientId && selectedPlatforms.length > 0
  const canProceed2 = content.trim().length > 0
  const isUploading = mediaItems.some(m => m.uploading)

  // ── File upload handler ──────────────────────────────────────
  const handleFiles = async (files) => {
    const newItems = files.map(file => ({
      id:        Math.random().toString(36).slice(2),
      file,
      type:      file.type,
      preview:   URL.createObjectURL(file),
      url:       null,
      path:      null,
      uploading: true,
    }))
    setMediaItems(prev => [...prev, ...newItems])

    for (const item of newItems) {
      try {
        const result = await uploadMedia.mutateAsync({ file: item.file, clientId: selectedClientId || 'temp' })
        setMediaItems(prev => prev.map(m =>
          m.id === item.id ? { ...m, url: result.url, path: result.path, uploading: false } : m
        ))
      } catch (err) {
        toast.error(`Failed to upload ${item.file.name}: ${err.message}`)
        setMediaItems(prev => prev.filter(m => m.id !== item.id))
      }
    }
  }

  // ── Remove media ─────────────────────────────────────────────
  const handleRemoveMedia = async (media) => {
    setMediaItems(prev => prev.filter(m => m.id !== media.id))
    if (media.preview) URL.revokeObjectURL(media.preview)
    if (media.path) {
      try { await deleteMedia.mutateAsync(media.path) } catch { /* best effort */ }
    }
  }

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (isUploading) {
      toast.error('Please wait for media uploads to finish.')
      return
    }
    try {
      const mediaUrls = mediaItems.filter(m => m.url).map(m => m.url)
      const fc        = showFirstComment && firstComment.trim() ? firstComment.trim() : null

      // For "Publish Now"
      if (scheduleType === 'now') {
        let postId
        if (isEditing) {
          // Update the existing post first, then publish it
          await updatePost.mutateAsync({
            id:            editPost.id,
            platforms:     selectedPlatforms,
            content,
            status:        'publishing',
            scheduled_at:  null,
            media_urls:    mediaUrls,
            first_comment: fc,
          })
          postId = editPost.id
        } else {
          const post = await createPost.mutateAsync({
            clientId:      selectedClientId,
            platforms:     selectedPlatforms,
            content,
            status:        'publishing',
            scheduledAt:   null,
            createdByName: profile?.full_name ?? user?.email ?? 'Unknown',
            mediaUrls,
            firstComment:  fc,
          })
          postId = post.id
        }
        toast.loading('Publishing to platforms...')
        const result = await publishNow.mutateAsync(postId)
        toast.dismiss()
        const allFailed = Object.values(result.platformResults ?? {}).every(r => r.error)
        if (allFailed) {
          const firstError = Object.values(result.platformResults)[0]?.error
          toast.error(`Publish failed: ${firstError}`)
        } else {
          toast.success('Post published!')
          navigate('/calendar')
        }
        return
      }

      // For schedule / draft — just save to DB; cron handles scheduled posts
      const status      = scheduleType === 'draft' ? 'draft' : 'scheduled'
      const scheduledAt = scheduleType === 'schedule' ? new Date(scheduleDate).toISOString() : null

      if (isEditing) {
        await updatePost.mutateAsync({
          id:           editPost.id,
          platforms:    selectedPlatforms,
          content,
          status,
          scheduled_at: scheduledAt,
          media_urls:   mediaUrls,
          first_comment: fc,
        })
        toast.success(status === 'draft' ? 'Draft updated!' : 'Post updated!')
      } else {
        await createPost.mutateAsync({
          clientId:      selectedClientId,
          platforms:     selectedPlatforms,
          content,
          status,
          scheduledAt,
          createdByName: profile?.full_name ?? user?.email ?? 'Unknown',
          mediaUrls,
          firstComment:  fc,
        })
        toast.success(status === 'draft' ? 'Draft saved!' : 'Post scheduled!')
      }
      navigate('/calendar')
    } catch (err) {
      toast.error('Failed: ' + err.message)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {isEditing && (
        <div className="flex items-center gap-2 mb-4 text-sm bg-[#FEF8EC] border border-wom-gold/30 rounded-xl px-4 py-2.5">
          <Pencil size={14} className="text-wom-gold flex-shrink-0" />
          <span className="text-[#092137]/70">Editing scheduled post — make your changes and click <strong>Update Post</strong>.</span>
        </div>
      )}
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
                    isDone   ? 'bg-wom-teal text-white cursor-pointer' :
                    isActive ? 'bg-wom-gold text-[#092137]' : 'bg-[#EDE8DC] text-[#092137]/40'
                  )}
                >
                  {isDone ? <Check size={13} /> : stepNum}
                </button>
                <span className={cn('text-sm font-medium hidden sm:block', isActive ? 'text-[#092137]' : 'text-[#092137]/40')}>{label}</span>
              </div>
              {idx < 2 && <div className={cn('h-px w-8 flex-shrink-0', step > stepNum ? 'bg-wom-teal' : 'bg-gray-200')} />}
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* ── Composer ── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Step 1 — Client & Platforms */}
          {step === 1 && (
            <div className="bg-white rounded-xl border border-[#EDE8DC] p-5 space-y-4 animate-fade-in">
              <h3 className="font-semibold text-[#092137]">Select Client</h3>
              {clientsLoading ? (
                <div className="flex items-center gap-2 text-[#092137]/40 py-4"><Loader2 size={16} className="animate-spin" /> Loading clients...</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(clients ?? []).filter(c => c.status === 'Active').map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedClientId(c.id); setSelectedPlatforms([]) }}
                      className={cn('flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left',
                        selectedClientId === c.id ? 'border-wom-gold bg-[#FEF8EC]' : 'border-[#EDE8DC] hover:border-gray-300'
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg bg-wom-gold flex items-center justify-center text-[#092137] text-sm font-bold flex-shrink-0">
                        {c.client_name?.charAt(0) ?? '?'}
                      </div>
                      <span className="text-sm font-medium text-[#092137]/80 truncate">{c.client_name}</span>
                      {selectedClientId === c.id && <Check size={14} className="ml-auto text-wom-gold flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}

              {selectedClientId && (
                <>
                  <h3 className="font-semibold text-[#092137] pt-2">Select Platforms</h3>
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

          {/* Step 2 — Write Content */}
          {step === 2 && (
            <div className="bg-white rounded-xl border border-[#EDE8DC] p-5 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#092137]">Write Your Post</h3>
                <div className="flex gap-1">
                  {selectedPlatforms.map(p => (
                    <button key={p} onClick={() => setPreviewPlatform(p)} className={cn('rounded-lg p-1 transition-colors', previewPlatform === p ? 'bg-[#FEF8EC]' : 'hover:bg-[#EDE8DC]')}>
                      <PlatformIcon platform={p} size={20} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-[#092137]/40">Posting to:</span>
                {selectedPlatforms.map(p => {
                  const platform = PLATFORMS.find(pl => pl.id === p)
                  return (
                    <span key={p} className="flex items-center gap-1 text-xs bg-[#EDE8DC] px-2 py-0.5 rounded-full">
                      <PlatformIcon platform={p} size={12} /> {platform?.label}
                    </span>
                  )
                })}
              </div>

              {/* Caption textarea */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Write your caption here... Use # for hashtags, @ to mention accounts"
                  rows={6}
                  className="w-full p-4 text-sm border border-[#EDE8DC] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-wom-gold/30 focus:border-wom-gold leading-relaxed"
                />
                <div className="absolute bottom-3 right-3 text-xs text-gray-300">{content.length} chars</div>
              </div>

              {/* Character limit warnings */}
              {selectedPlatforms.map(p => {
                const limit = CHARACTER_LIMITS[p]
                if (content.length > limit) return (
                  <div key={p} className="flex items-center gap-2 text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                    <AlertCircle size={13} /> Content exceeds {p} limit ({limit.toLocaleString()} chars). It will be truncated.
                  </div>
                )
                return null
              })}

              {/* Toolbar */}
              <div className="flex items-center gap-1 relative">
                {/* Emoji picker */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(v => !v)}
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                      showEmojiPicker ? 'bg-[#FEF8EC] text-wom-gold' : 'hover:bg-[#EDE8DC] text-[#092137]/40 hover:text-[#092137]/60'
                    )}
                    title="Insert emoji"
                  >
                    <Smile size={16} />
                  </button>
                  {showEmojiPicker && (
                    <EmojiPicker
                      onSelect={(emoji) => { insertAtCursor(emoji); setShowEmojiPicker(false) }}
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  )}
                </div>
                {/* Hashtag helper */}
                <button
                  type="button"
                  onClick={() => insertAtCursor(' #')}
                  className="w-8 h-8 rounded-lg hover:bg-[#EDE8DC] flex items-center justify-center text-[#092137]/40 hover:text-[#092137]/60 transition-colors"
                  title="Add hashtag"
                >
                  <Hash size={16} />
                </button>
                {/* @ mention helper */}
                <button
                  type="button"
                  onClick={() => insertAtCursor(' @')}
                  className="w-8 h-8 rounded-lg hover:bg-[#EDE8DC] flex items-center justify-center text-[#092137]/40 hover:text-[#092137]/60 transition-colors font-bold text-sm"
                  title="Add mention"
                >
                  @
                </button>
                <button
                  type="button"
                  onClick={() => insertAtCursor('\n\n')}
                  className="w-8 h-8 rounded-lg hover:bg-[#EDE8DC] flex items-center justify-center text-[#092137]/40 hover:text-[#092137]/60 transition-colors text-xs font-mono"
                  title="Add line break"
                >
                  ↵
                </button>
              </div>

              {/* Media section */}
              <div className="space-y-3 pt-1 border-t border-[#EDE8DC]">
                <p className="text-xs font-semibold text-[#092137]/60 uppercase tracking-wider pt-1">Media</p>

                {mediaItems.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {mediaItems.map(m => (
                      <MediaThumb key={m.id} media={m} onRemove={handleRemoveMedia} uploading={m.uploading} />
                    ))}
                    {/* Add more button */}
                    {mediaItems.length < 10 && (
                      <label className="w-20 h-20 rounded-lg border-2 border-dashed border-[#EDE8DC] hover:border-wom-gold/50 flex items-center justify-center cursor-pointer transition-colors flex-shrink-0">
                        <input
                          type="file"
                          accept={[...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES].join(',')}
                          multiple
                          className="hidden"
                          onChange={(e) => handleFiles(Array.from(e.target.files))}
                        />
                        <Plus size={20} className="text-[#092137]/30" />
                      </label>
                    )}
                  </div>
                )}

                {mediaItems.length === 0 && (
                  <DropZone onFiles={handleFiles} disabled={!selectedClientId} />
                )}

                {isUploading && (
                  <p className="text-xs text-[#092137]/40 flex items-center gap-1">
                    <Loader2 size={12} className="animate-spin" /> Uploading media...
                  </p>
                )}
              </div>

              {/* First comment (Instagram) */}
              {hasInstagram && (
                <div className="pt-1 border-t border-[#EDE8DC]">
                  <button
                    onClick={() => setShowFirstComment(v => !v)}
                    className="flex items-center gap-2 text-xs text-[#092137]/60 hover:text-[#092137] transition-colors"
                  >
                    <MessageSquare size={13} />
                    {showFirstComment ? 'Remove first comment' : '+ Add first comment (Instagram)'}
                  </button>
                  {showFirstComment && (
                    <div className="mt-2">
                      <textarea
                        value={firstComment}
                        onChange={e => setFirstComment(e.target.value)}
                        placeholder="First comment (great for hashtags on Instagram)..."
                        rows={3}
                        maxLength={2200}
                        className="w-full p-3 text-sm border border-[#EDE8DC] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-wom-gold/30 focus:border-wom-gold leading-relaxed"
                      />
                      <p className="text-xs text-[#092137]/30 text-right mt-1">{firstComment.length} / 2,200</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)} className="btn-secondary">← Back</button>
                <button disabled={!canProceed2 || isUploading} onClick={() => setStep(3)} className="btn-primary flex-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed">
                  {isUploading ? <><Loader2 size={14} className="animate-spin" /> Uploading...</> : 'Continue to Schedule →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Schedule & Publish */}
          {step === 3 && (
            <div className="bg-white rounded-xl border border-[#EDE8DC] p-5 space-y-4 animate-fade-in">
              <h3 className="font-semibold text-[#092137]">When to Publish?</h3>

              <div className="space-y-2">
                {[
                  { value: 'now',      label: 'Publish immediately', desc: 'Goes live right now across all selected platforms', icon: Send },
                  { value: 'schedule', label: 'Schedule for later',  desc: 'Set a specific date and time',                     icon: CalIcon },
                  { value: 'draft',    label: 'Save as draft',       desc: 'Save without publishing or scheduling',             icon: Save },
                ].map(({ value, label, desc, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setScheduleType(value)}
                    className={cn('w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all',
                      scheduleType === value ? 'border-wom-gold bg-[#FEF8EC]' : 'border-[#EDE8DC] hover:border-gray-300'
                    )}
                  >
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                      scheduleType === value ? 'bg-wom-gold text-[#092137]' : 'bg-[#EDE8DC] text-[#092137]/50'
                    )}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-[#092137]">{label}</p>
                      <p className="text-xs text-[#092137]/40 mt-0.5">{desc}</p>
                    </div>
                    {scheduleType === value && <Check size={16} className="ml-auto text-wom-gold flex-shrink-0 mt-0.5" />}
                  </button>
                ))}
              </div>

              {scheduleType === 'schedule' && (
                <div>
                  <label className="block text-sm font-medium text-[#092137]/80 mb-1.5">Date & Time (AEST)</label>
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#EDE8DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-wom-gold/30 focus:border-wom-gold"
                  />
                </div>
              )}

              {/* Post summary */}
              <div className="bg-[#F5F1E9] rounded-xl p-4 text-sm space-y-2">
                <p className="font-semibold text-[#092137]/80">Post Summary</p>
                <div className="flex items-center gap-2 text-[#092137]/60">
                  <span className="text-[#092137]/40 w-20 text-xs">Client:</span>
                  <span className="font-medium">{client?.client_name}</span>
                </div>
                <div className="flex items-center gap-2 text-[#092137]/60">
                  <span className="text-[#092137]/40 w-20 text-xs">Platforms:</span>
                  <div className="flex gap-1">{selectedPlatforms.map(p => <PlatformIcon key={p} platform={p} size={16} />)}</div>
                </div>
                {mediaItems.length > 0 && (
                  <div className="flex items-center gap-2 text-[#092137]/60">
                    <span className="text-[#092137]/40 w-20 text-xs">Media:</span>
                    <span>{mediaItems.filter(m => !m.uploading).length} file{mediaItems.length !== 1 ? 's' : ''} attached</span>
                  </div>
                )}
                <div className="flex items-start gap-2 text-[#092137]/60">
                  <span className="text-[#092137]/40 w-20 text-xs flex-shrink-0">Caption:</span>
                  <span className="text-xs line-clamp-2">{content}</span>
                </div>
                {firstComment && showFirstComment && (
                  <div className="flex items-start gap-2 text-[#092137]/60">
                    <span className="text-[#092137]/40 w-20 text-xs flex-shrink-0">1st comment:</span>
                    <span className="text-xs line-clamp-2">{firstComment}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="btn-secondary">← Back</button>
                <button onClick={handleSubmit} disabled={createPost.isPending || publishNow.isPending || isUploading} className="btn-primary flex-1 justify-center">
                  {(createPost.isPending || updatePost.isPending || publishNow.isPending) ? <Loader2 size={15} className="animate-spin" /> :
                   isEditing                   ? <><Pencil size={15} />  Update Post</> :
                   scheduleType === 'now'      ? <><Send size={15} />    Publish Now</> :
                   scheduleType === 'schedule' ? <><CalIcon size={15} /> Schedule Post</> :
                                                 <><Save size={15} />    Save Draft</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Preview panel ── */}
        <div className="lg:col-span-2 space-y-3">
          <div className="sticky top-24">
            <h3 className="font-semibold text-[#092137]/80 text-sm mb-3 flex items-center gap-2"><Eye size={15} /> Live Preview</h3>
            {selectedPlatforms.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-[#EDE8DC] p-8 text-center text-[#092137]/40">
                <Eye size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Select platforms to see a preview</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-1 bg-[#EDE8DC] rounded-full p-1">
                  {selectedPlatforms.map(p => (
                    <button
                      key={p}
                      onClick={() => setPreviewPlatform(p)}
                      className={cn('flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-medium transition-all',
                        previewPlatform === p ? 'bg-white shadow-sm text-[#092137]' : 'text-[#092137]/50 hover:text-[#092137]/80'
                      )}
                    >
                      <PlatformIcon platform={p} size={13} />
                      <span className="hidden sm:inline capitalize">{p}</span>
                    </button>
                  ))}
                </div>
                <PostPreview
                  content={content}
                  platform={previewPlatform ?? selectedPlatforms[0]}
                  client={client}
                  mediaItems={mediaItems.filter(m => !m.uploading)}
                />
              </div>
            )}

            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1"><Info size={12} /> Posting Tips</p>
              <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
                <li>Best time to post: Tue–Thu 9am–11am AEST</li>
                <li>Use 3–5 hashtags on Instagram for best reach</li>
                <li>LinkedIn posts with images get 2x more engagement</li>
                <li>TikTok videos under 30s get highest completion rates</li>
                <li>Square images (1:1) perform best on Instagram</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
