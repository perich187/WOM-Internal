import { useNavigate } from 'react-router-dom'
import { Search, TrendingUp, Sparkles, Zap, ClipboardCheck, ArrowRight } from 'lucide-react'

const FEATURES = [
  {
    to:          '/digital/keywords',
    icon:        Search,
    label:       'Keyword Research',
    description: 'Discover high-value keywords, search volumes, difficulty scores and competitor gaps.',
    phase:       2,
    color:       '#3B82F6',
  },
  {
    to:          '/digital/rank-tracking',
    icon:        TrendingUp,
    label:       'Rank Tracking',
    description: 'Monitor your clients\' Google rankings for target keywords over time.',
    phase:       2,
    color:       '#10B981',
  },
  {
    to:          '/digital/ai-overview',
    icon:        Sparkles,
    label:       'AI Overview',
    description: 'AI-powered SEO analysis and content recommendations for any URL or domain.',
    phase:       2,
    color:       '#8B5CF6',
  },
  {
    to:          '/digital/site-speed',
    icon:        Zap,
    label:       'Site Speed',
    description: 'Google PageSpeed Insights data — Core Web Vitals, performance scores, and fix suggestions.',
    phase:       2,
    color:       '#F59E0B',
  },
  {
    to:          '/digital/site-audit',
    icon:        ClipboardCheck,
    label:       'Site Audit',
    description: 'Crawl any website and surface SEO issues: broken links, missing meta, duplicate content and more.',
    phase:       2,
    color:       '#EF4444',
  },
]

export default function DigitalHome() {
  const navigate = useNavigate()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <TrendingUp size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Digital Workspace</h1>
            <p className="text-blue-100 text-sm">SEO & Digital Marketing Tools</p>
          </div>
        </div>
        <p className="text-blue-50 text-sm max-w-xl leading-relaxed">
          Your all-in-one SEO command centre — research keywords, track rankings, audit sites and get AI-powered recommendations for all your clients.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1.5 text-xs font-medium">
          <span className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse" />
          Phase 2 — Building out now
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map(({ to, icon: Icon, label, description, color }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="bg-white rounded-xl border border-[#EDE8DC] p-5 text-left hover:shadow-md hover:border-blue-200 transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: color + '15' }}
              >
                <Icon size={20} style={{ color }} />
              </div>
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                Phase 2
              </span>
            </div>
            <h3 className="font-semibold text-[#092137] mb-1.5 group-hover:text-blue-600 transition-colors">
              {label}
            </h3>
            <p className="text-xs text-[#092137]/50 leading-relaxed mb-4">{description}</p>
            <div className="flex items-center gap-1 text-xs font-medium text-blue-500 group-hover:gap-2 transition-all">
              Preview <ArrowRight size={12} />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
