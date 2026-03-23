import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus, Plus, Info } from 'lucide-react'

const SAMPLE_RANKINGS = [
  { domain: 'wordofmouthagency.com.au', keyword: 'digital marketing agency perth', position: 3,  change: +2,  url: '/services' },
  { domain: 'wordofmouthagency.com.au', keyword: 'social media agency perth',      position: 5,  change: -1,  url: '/social-media' },
  { domain: 'wordofmouthagency.com.au', keyword: 'content marketing perth',        position: 8,  change: +5,  url: '/content' },
  { domain: 'wordofmouthagency.com.au', keyword: 'brand strategy agency',          position: 12, change: 0,   url: '/branding' },
  { domain: 'wordofmouthagency.com.au', keyword: 'seo agency perth',               position: 18, change: -3,  url: '/seo' },
]

function PositionBadge({ position }) {
  const color = position <= 3 ? '#10B981' : position <= 10 ? '#3B82F6' : position <= 20 ? '#F59E0B' : '#9CA3AF'
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: color }}>
      {position}
    </div>
  )
}

export default function RankTracking() {
  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[#092137]">Rank Tracking</h1>
        <p className="text-sm text-[#092137]/50">Monitor client keyword positions in Google search results</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2 text-sm text-blue-700">
        <Info size={15} className="flex-shrink-0 mt-0.5" />
        Phase 2 feature — live rank data via SERP API. Sample data shown below.
      </div>

      {/* Add tracking */}
      <div className="bg-white rounded-xl border border-[#EDE8DC] p-5">
        <div className="flex gap-3">
          <input placeholder="Domain (e.g. example.com.au)" className="flex-1 px-4 py-2.5 text-sm border border-[#EDE8DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400" />
          <input placeholder="Keyword to track" className="flex-1 px-4 py-2.5 text-sm border border-[#EDE8DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400" />
          <button className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-1.5">
            <Plus size={15} /> Track
          </button>
        </div>
      </div>

      {/* Rankings table */}
      <div className="bg-white rounded-xl border border-[#EDE8DC] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#EDE8DC]">
          <p className="text-sm font-semibold text-[#092137]">Tracked Keywords</p>
        </div>
        <div className="divide-y divide-gray-50">
          {SAMPLE_RANKINGS.map((row, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-[#F5F1E9]/50 transition-colors">
              <PositionBadge position={row.position} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#092137] truncate">{row.keyword}</p>
                <p className="text-xs text-[#092137]/40 truncate">{row.domain}{row.url}</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium">
                {row.change > 0  && <><TrendingUp   size={14} className="text-green-500" /><span className="text-green-500">+{row.change}</span></>}
                {row.change < 0  && <><TrendingDown size={14} className="text-red-400" /><span className="text-red-400">{row.change}</span></>}
                {row.change === 0 && <><Minus        size={14} className="text-gray-400" /><span className="text-gray-400">–</span></>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
