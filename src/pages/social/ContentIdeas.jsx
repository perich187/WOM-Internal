import { useState } from 'react'
import {
  Sparkles, Loader2, Copy, Check, ChevronDown, ChevronUp,
  Music, Hash, Target, Clock, Clapperboard, FileText, Lightbulb,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', color: '#E1306C' },
  { id: 'tiktok',    label: 'TikTok',    color: '#161616' },
  { id: 'facebook',  label: 'Facebook',  color: '#1877F2' },
  { id: 'linkedin',  label: 'LinkedIn',  color: '#0A66C2' },
]

const CONTENT_TYPES = [
  { id: 'organic',  label: 'Organic' },
  { id: 'paid ad',  label: 'Paid Ad' },
]

const TONES = [
  'Educational', 'Humorous', 'Inspirational',
  'Behind-the-scenes', 'Promotional', 'Storytelling', 'Trending',
]

const TONE_COLORS = {
  Educational:         'bg-blue-50 text-blue-700 border-blue-200',
  Humorous:            'bg-yellow-50 text-yellow-700 border-yellow-200',
  Inspirational:       'bg-purple-50 text-purple-700 border-purple-200',
  'Behind-the-scenes': 'bg-green-50 text-green-700 border-green-200',
  Promotional:         'bg-orange-50 text-orange-700 border-orange-200',
  Storytelling:        'bg-pink-50 text-pink-700 border-pink-200',
  Trending:            'bg-red-50 text-red-700 border-red-200',
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text, className }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className={cn(
        'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors',
        copied
          ? 'bg-green-50 text-green-700 border-green-200'
          : 'bg-white text-[#092137]/60 border-[#EDE8DC] hover:border-[#092137]/30 hover:text-[#092137]',
        className
      )}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

// ── Storyboard scene ──────────────────────────────────────────────────────────

function StoryboardScene({ scene }) {
  return (
    <div className="flex gap-3 items-start p-3 rounded-xl bg-[#F5F1E9] border border-[#EDE8DC]">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#092137] text-white text-xs font-bold flex items-center justify-center">
        {scene.scene}
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#092137]/40">Visual</span>
          <p className="text-sm text-[#092137]">{scene.visual}</p>
        </div>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#092137]/40">Audio</span>
          <p className="text-sm text-[#092137]">{scene.audio}</p>
        </div>
        {scene.duration && (
          <span className="inline-flex items-center gap-1 text-[10px] text-[#092137]/50 font-medium">
            <Clock size={10} /> {scene.duration}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Idea card ─────────────────────────────────────────────────────────────────

function IdeaCard({ idea, index }) {
  const [tab, setTab] = useState('overview')
  const [expanded, setExpanded] = useState(index === 0)

  const tabs = ['overview', 'storyboard', 'script']

  return (
    <div className="bg-white rounded-2xl border border-[#EDE8DC] overflow-hidden">
      {/* Card header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-[#F5F1E9]/50 transition-colors"
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-[#F0A629]/20 text-[#F0A629] font-bold text-sm flex items-center justify-center">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#092137]">{idea.title}</p>
          <p className="text-sm text-[#092137]/60 mt-0.5">{idea.angle}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {idea.tone && (
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', TONE_COLORS[idea.tone] ?? 'bg-gray-50 text-gray-600 border-gray-200')}>
                {idea.tone}
              </span>
            )}
            {idea.duration && (
              <span className="text-xs text-[#092137]/50 flex items-center gap-1">
                <Clock size={11} /> {idea.duration}
              </span>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="flex-shrink-0 text-[#092137]/40 mt-1" /> : <ChevronDown size={16} className="flex-shrink-0 text-[#092137]/40 mt-1" />}
      </button>

      {expanded && (
        <div className="border-t border-[#EDE8DC]">
          {/* Tabs */}
          <div className="flex border-b border-[#EDE8DC] px-5">
            {tabs.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'px-4 py-2.5 text-xs font-semibold capitalize transition-colors border-b-2 -mb-px',
                  tab === t
                    ? 'border-[#F0A629] text-[#092137]'
                    : 'border-transparent text-[#092137]/40 hover:text-[#092137]/70'
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-4">
            {/* Overview tab */}
            {tab === 'overview' && (
              <div className="space-y-4">
                {/* Hook */}
                {idea.hook && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#092137]/40 mb-1.5 flex items-center gap-1.5">
                      <Lightbulb size={11} /> Hook
                    </p>
                    <div className="bg-[#F5F1E9] rounded-xl p-3">
                      <p className="text-sm font-medium text-[#092137] italic">"{idea.hook}"</p>
                    </div>
                  </div>
                )}

                {/* CTA */}
                {idea.cta && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#092137]/40 mb-1.5 flex items-center gap-1.5">
                      <Target size={11} /> Call to Action
                    </p>
                    <p className="text-sm text-[#092137]">{idea.cta}</p>
                  </div>
                )}

                {/* Music */}
                {idea.musicMood && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#092137]/40 mb-1.5 flex items-center gap-1.5">
                      <Music size={11} /> Music Mood
                    </p>
                    <p className="text-sm text-[#092137]">{idea.musicMood}</p>
                  </div>
                )}

                {/* Hashtags */}
                {idea.hashtags?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#092137]/40 mb-1.5 flex items-center gap-1.5">
                      <Hash size={11} /> Hashtags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {idea.hashtags.map((tag, i) => (
                        <span key={i} className="text-xs bg-[#F5F1E9] text-[#092137]/70 px-2 py-0.5 rounded-full border border-[#EDE8DC]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Storyboard tab */}
            {tab === 'storyboard' && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#092137]/40 flex items-center gap-1.5">
                  <Clapperboard size={11} /> Scene-by-Scene Breakdown
                </p>
                {idea.storyboard?.length > 0
                  ? idea.storyboard.map((scene, i) => <StoryboardScene key={i} scene={scene} />)
                  : <p className="text-sm text-[#092137]/40">No storyboard generated.</p>
                }
              </div>
            )}

            {/* Script tab */}
            {tab === 'script' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#092137]/40 flex items-center gap-1.5">
                    <FileText size={11} /> Full Script
                  </p>
                  {idea.script && <CopyButton text={idea.script} />}
                </div>
                {idea.script
                  ? (
                    <div className="bg-[#F5F1E9] rounded-xl p-4 text-sm text-[#092137] whitespace-pre-wrap leading-relaxed font-mono border border-[#EDE8DC]">
                      {idea.script}
                    </div>
                  )
                  : <p className="text-sm text-[#092137]/40">No script generated.</p>
                }
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ContentIdeas() {
  const [platform,    setPlatform]    = useState('instagram')
  const [contentType, setContentType] = useState('organic')
  const [industry,    setIndustry]    = useState('')
  const [clientName,  setClientName]  = useState('')
  const [topic,       setTopic]       = useState('')
  const [tone,        setTone]        = useState('')
  const [loading,     setLoading]     = useState(false)
  const [ideas,       setIdeas]       = useState(null)
  const [error,       setError]       = useState(null)

  const activePlatform = PLATFORMS.find(p => p.id === platform)

  const handleGenerate = async () => {
    if (!industry.trim()) return
    setLoading(true)
    setError(null)
    setIdeas(null)
    try {
      const res = await fetch('/api/ai-overview?action=content-ideas', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ platform, contentType, industry, clientName, topic, tone }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error ?? 'Failed to generate ideas')
      setIdeas(data.ideas ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#092137]">Content Ideas</h1>
        <p className="text-sm text-[#092137]/50 mt-0.5">
          Generate platform-optimised content concepts with full storyboards and scripts
        </p>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-2xl border border-[#EDE8DC] p-6 space-y-5">
        {/* Platform picker */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#092137]/50 mb-2">Platform</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-semibold border transition-all',
                  platform === p.id
                    ? 'text-white border-transparent shadow-sm'
                    : 'bg-white text-[#092137]/60 border-[#EDE8DC] hover:border-[#092137]/30'
                )}
                style={platform === p.id ? { backgroundColor: p.color, borderColor: p.color } : {}}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content type */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#092137]/50 mb-2">Content Type</label>
          <div className="flex gap-2">
            {CONTENT_TYPES.map(ct => (
              <button
                key={ct.id}
                onClick={() => setContentType(ct.id)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-semibold border transition-all',
                  contentType === ct.id
                    ? 'bg-[#092137] text-white border-[#092137]'
                    : 'bg-white text-[#092137]/60 border-[#EDE8DC] hover:border-[#092137]/30'
                )}
              >
                {ct.label}
              </button>
            ))}
          </div>
        </div>

        {/* Industry + Client name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#092137]/50 mb-1.5">
              Industry / Niche <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              placeholder="e.g. Veterinary clinic, Café, Real estate"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#EDE8DC] text-sm text-[#092137] placeholder-[#092137]/30 focus:outline-none focus:border-[#092137]/40 focus:ring-1 focus:ring-[#092137]/10"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#092137]/50 mb-1.5">
              Client Name <span className="text-[#092137]/30">(optional)</span>
            </label>
            <input
              type="text"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="e.g. Vetwest Animal Hospitals"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#EDE8DC] text-sm text-[#092137] placeholder-[#092137]/30 focus:outline-none focus:border-[#092137]/40 focus:ring-1 focus:ring-[#092137]/10"
            />
          </div>
        </div>

        {/* Topic + Tone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#092137]/50 mb-1.5">
              Topic / Theme <span className="text-[#092137]/30">(optional)</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Summer promotion, Pet wellness tips"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#EDE8DC] text-sm text-[#092137] placeholder-[#092137]/30 focus:outline-none focus:border-[#092137]/40 focus:ring-1 focus:ring-[#092137]/10"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#092137]/50 mb-1.5">
              Preferred Tone <span className="text-[#092137]/30">(optional)</span>
            </label>
            <select
              value={tone}
              onChange={e => setTone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#EDE8DC] text-sm text-[#092137] bg-white focus:outline-none focus:border-[#092137]/40 focus:ring-1 focus:ring-[#092137]/10"
            >
              <option value="">Any tone</option>
              {TONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={loading || !industry.trim()}
          className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
          style={{
            backgroundColor: activePlatform?.color ?? '#092137',
            color: '#fff',
          }}
        >
          {loading
            ? <><Loader2 size={16} className="animate-spin" /> Generating ideas…</>
            : <><Sparkles size={16} /> Generate 3 Content Ideas</>
          }
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-[#EDE8DC] p-5 animate-pulse">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-xl bg-[#F5F1E9]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#F5F1E9] rounded w-1/2" />
                  <div className="h-3 bg-[#F5F1E9] rounded w-3/4" />
                  <div className="h-3 bg-[#F5F1E9] rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {ideas && !loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[#092137]">
              {ideas.length} idea{ideas.length !== 1 ? 's' : ''} generated
              <span className="font-normal text-[#092137]/50 ml-1.5">for {industry}</span>
            </p>
            <button
              onClick={handleGenerate}
              className="text-xs text-[#092137]/50 hover:text-[#092137] transition-colors flex items-center gap-1"
            >
              <Sparkles size={11} /> Regenerate
            </button>
          </div>

          {ideas.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#EDE8DC] p-10 text-center">
              <Sparkles size={28} className="mx-auto text-[#092137]/20 mb-2" />
              <p className="text-sm text-[#092137]/40">No ideas were generated. Try adjusting your inputs.</p>
            </div>
          ) : (
            ideas.map((idea, i) => <IdeaCard key={idea.id ?? i} idea={idea} index={i} />)
          )}
        </div>
      )}
    </div>
  )
}
