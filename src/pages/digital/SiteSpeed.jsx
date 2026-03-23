import { useState } from 'react'
import { Zap, Smartphone, Monitor, Info } from 'lucide-react'

const SAMPLE = {
  url:     'wordofmouthagency.com.au',
  mobile:  { performance: 62, accessibility: 91, bestPractices: 87, seo: 94 },
  desktop: { performance: 88, accessibility: 91, bestPractices: 91, seo: 98 },
  vitals: [
    { name: 'First Contentful Paint', mobile: '2.1s',  desktop: '0.8s',  status: 'moderate' },
    { name: 'Largest Contentful Paint',mobile: '4.2s',  desktop: '1.4s',  status: 'poor' },
    { name: 'Total Blocking Time',     mobile: '380ms', desktop: '90ms',  status: 'moderate' },
    { name: 'Cumulative Layout Shift', mobile: '0.04',  desktop: '0.02',  status: 'good' },
    { name: 'Speed Index',             mobile: '3.8s',  desktop: '1.2s',  status: 'moderate' },
  ],
}

function ScoreRing({ score, label }) {
  const color = score >= 90 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444'
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-16 h-16 rounded-full flex items-center justify-center border-4 font-bold text-lg" style={{ borderColor: color, color }}>
        {score}
      </div>
      <p className="text-xs text-[#092137]/50 text-center">{label}</p>
    </div>
  )
}

const VITAL_STATUS = { good: 'text-green-600 bg-green-50', moderate: 'text-amber-600 bg-amber-50', poor: 'text-red-600 bg-red-50' }

export default function SiteSpeed() {
  const [url, setUrl] = useState('')
  const [device, setDevice] = useState('mobile')
  const scores = SAMPLE[device]

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[#092137]">Site Speed</h1>
        <p className="text-sm text-[#092137]/50">Google PageSpeed Insights — Core Web Vitals analysis</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2 text-sm text-blue-700">
        <Info size={15} className="flex-shrink-0 mt-0.5" />
        Phase 2 — will use the free Google PageSpeed Insights API. Sample data shown below.
      </div>

      <div className="bg-white rounded-xl border border-[#EDE8DC] p-5">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Zap size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#092137]/30" />
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Enter URL to test (e.g. https://example.com.au)" className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#EDE8DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400" />
          </div>
          <button className="px-5 py-2.5 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 transition-colors flex items-center gap-1.5">
            <Zap size={15} /> Analyse
          </button>
        </div>
      </div>

      {/* Scores */}
      <div className="bg-white rounded-xl border border-[#EDE8DC] p-5">
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm font-semibold text-[#092137]">{SAMPLE.url} — Sample Results</p>
          <div className="flex bg-[#EDE8DC] rounded-full p-0.5 gap-0.5">
            {[{id:'mobile', icon: Smartphone}, {id:'desktop', icon: Monitor}].map(({id, icon: Icon}) => (
              <button key={id} onClick={() => setDevice(id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${device === id ? 'bg-white shadow-sm text-[#092137]' : 'text-[#092137]/50'}`}>
                <Icon size={12} /><span className="capitalize">{id}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[['Performance', scores.performance], ['Accessibility', scores.accessibility], ['Best Practices', scores.bestPractices], ['SEO', scores.seo]].map(([label, score]) => (
            <ScoreRing key={label} score={score} label={label} />
          ))}
        </div>

        {/* Core Web Vitals */}
        <p className="text-xs font-semibold text-[#092137]/40 uppercase tracking-wider mb-3">Core Web Vitals</p>
        <div className="space-y-2">
          {SAMPLE.vitals.map(v => (
            <div key={v.name} className="flex items-center gap-3 text-sm">
              <span className="flex-1 text-[#092137]/70">{v.name}</span>
              <span className="font-mono text-xs text-[#092137]/50">{device === 'mobile' ? v.mobile : v.desktop}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${VITAL_STATUS[v.status]}`}>{v.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
