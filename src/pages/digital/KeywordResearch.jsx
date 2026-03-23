import { useState, useEffect } from 'react'
import { Search, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'
import { useDigitalClient } from '@/lib/digitalClient'

const SAMPLE_KEYWORDS = [
  { keyword: 'digital marketing agency',    volume: 18100, difficulty: 72, cpc: '$8.40',  trend: 'up' },
  { keyword: 'social media marketing',      volume: 49500, difficulty: 65, cpc: '$6.20',  trend: 'up' },
  { keyword: 'seo agency perth',            volume: 1300,  difficulty: 48, cpc: '$12.50', trend: 'stable' },
  { keyword: 'content marketing strategy',  volume: 8100,  difficulty: 58, cpc: '$5.80',  trend: 'up' },
  { keyword: 'google ads management',       volume: 6600,  difficulty: 61, cpc: '$22.00', trend: 'down' },
  { keyword: 'brand strategy agency',       volume: 2400,  difficulty: 55, cpc: '$9.10',  trend: 'up' },
  { keyword: 'email marketing services',    volume: 12100, difficulty: 52, cpc: '$7.30',  trend: 'stable' },
]

function DifficultyBar({ score }) {
  const color = score >= 70 ? '#EF4444' : score >= 50 ? '#F59E0B' : '#10B981'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-medium" style={{ color }}>{score}</span>
    </div>
  )
}

export default function KeywordResearch() {
  const { selectedClient } = useDigitalClient()
  const [query, setQuery] = useState('')

  // Pre-fill with client domain when client changes
  useEffect(() => {
    if (selectedClient?.website) {
      const domain = selectedClient.website.replace(/^https?:\/\//, '').replace(/\/$/, '')
      setQuery(domain)
    } else {
      setQuery('')
    }
  }, [selectedClient?.id])

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[#092137]">Keyword Research</h1>
        <p className="text-sm text-[#092137]/50">
          {selectedClient
            ? `Keyword opportunities for ${selectedClient.client_name}`
            : 'Discover keyword opportunities for your clients'}
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2 text-sm text-blue-700">
        <Info size={15} className="flex-shrink-0 mt-0.5" />
        Phase 2 feature — live keyword data will be powered by the SEMRush / DataForSEO API. Sample data shown below.
      </div>

      {/* Search bar */}
      <div className="bg-white rounded-xl border border-[#EDE8DC] p-5">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#092137]/30" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Enter a keyword or domain (e.g. 'digital marketing perth')"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#EDE8DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
            />
          </div>
          <button className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
            Research
          </button>
        </div>
      </div>

      {/* Results table */}
      <div className="bg-white rounded-xl border border-[#EDE8DC] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#EDE8DC] flex items-center justify-between">
          <p className="text-sm font-semibold text-[#092137]">
            {selectedClient ? `Sample Keywords — ${selectedClient.client_name}` : 'Sample Keywords'}
          </p>
          <span className="text-xs text-[#092137]/40">{SAMPLE_KEYWORDS.length} results</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#EDE8DC]">
              {['Keyword', 'Monthly Volume', 'Difficulty', 'CPC', 'Trend'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#092137]/40 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {SAMPLE_KEYWORDS.map((row, i) => (
              <tr key={i} className="hover:bg-[#F5F1E9]/50 transition-colors">
                <td className="px-5 py-3.5 text-sm font-medium text-[#092137]">{row.keyword}</td>
                <td className="px-5 py-3.5 text-sm text-[#092137]/70">{row.volume.toLocaleString()}</td>
                <td className="px-5 py-3.5"><DifficultyBar score={row.difficulty} /></td>
                <td className="px-5 py-3.5 text-sm text-[#092137]/70">{row.cpc}</td>
                <td className="px-5 py-3.5">
                  {row.trend === 'up'     && <TrendingUp   size={16} className="text-green-500" />}
                  {row.trend === 'down'   && <TrendingDown size={16} className="text-red-400" />}
                  {row.trend === 'stable' && <Minus        size={16} className="text-gray-400" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
