import { useState, useEffect } from 'react'
import { Sparkles, Globe, Info } from 'lucide-react'
import { useDigitalClient } from '@/lib/digitalClient'

const SAMPLE_INSIGHTS = [
  { category: 'Title Tag',        status: 'warning', message: 'Title is 71 characters — trim to under 60 for best display in SERPs.' },
  { category: 'Meta Description', status: 'good',    message: 'Well-written and within the 155-character limit.' },
  { category: 'H1 Tags',          status: 'good',    message: 'Single H1 found, clearly describes page content.' },
  { category: 'Page Speed',       status: 'error',   message: 'Mobile score of 48 — images need compression and lazy loading.' },
  { category: 'Backlink Profile', status: 'warning', message: '142 referring domains — growing but below industry average of 300+.' },
  { category: 'Content Depth',    status: 'good',    message: '1,840 words — comprehensive content likely to rank well.' },
]

const STATUS_STYLES = {
  good:    { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500',  label: 'Good' },
  warning: { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500',  label: 'Warning' },
  error:   { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500',    label: 'Issue' },
}

export default function AIOverview() {
  const { selectedClient } = useDigitalClient()
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (selectedClient?.website) {
      setUrl(selectedClient.website.startsWith('http') ? selectedClient.website : `https://${selectedClient.website}`)
    } else {
      setUrl('')
    }
  }, [selectedClient?.id])

  const displayDomain = selectedClient?.website
    ? selectedClient.website.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : 'wordofmouthagency.com.au'

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[#092137]">AI Overview</h1>
        <p className="text-sm text-[#092137]/50">
          {selectedClient
            ? `AI-powered SEO analysis for ${selectedClient.client_name}`
            : 'AI-powered SEO analysis and recommendations'}
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2 text-sm text-blue-700">
        <Info size={15} className="flex-shrink-0 mt-0.5" />
        Phase 2 feature — will use Claude AI to analyse any URL or domain. Sample output shown below.
      </div>

      <div className="bg-white rounded-xl border border-[#EDE8DC] p-5">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#092137]/30" />
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="Enter URL or domain to analyse"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#EDE8DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
            />
          </div>
          <button className="px-5 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-1.5">
            <Sparkles size={15} /> Analyse
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#EDE8DC] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#EDE8DC] flex items-center gap-2">
          <Sparkles size={15} className="text-purple-500" />
          <p className="text-sm font-semibold text-[#092137]">AI Analysis — {displayDomain}</p>
          <span className="ml-auto text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">Sample</span>
        </div>
        <div className="p-5 space-y-3">
          {SAMPLE_INSIGHTS.map((insight, i) => {
            const s = STATUS_STYLES[insight.status]
            return (
              <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl ${s.bg}`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${s.dot}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={`text-xs font-semibold ${s.text}`}>{insight.category}</p>
                    <span className={`text-xs ${s.text} opacity-60`}>{s.label}</span>
                  </div>
                  <p className={`text-xs ${s.text} opacity-80 leading-relaxed`}>{insight.message}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
