import { useNavigate } from 'react-router-dom'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import WOMLogoMark from '@/components/ui/WOMLogoMark'

const FEATURES = [
  { heading: 'Client Management',       desc: 'Manage all clients, contacts, projects, and service records in one place.' },
  { heading: 'Social Media Publishing', desc: 'Schedule and publish content across Facebook, Instagram, and more.' },
  { heading: 'Live Reporting',          desc: 'Pull real-time data from Google Analytics, Search Console, and Meta.' },
  { heading: 'Digital Marketing',       desc: 'SEO tools, rank tracking, site speed audits, and AI overview insights.' },
  { heading: 'Performance Dashboards',  desc: 'Content calendar, report builder, and agency-wide analytics.' },
]

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#092137' }}>

      {/* ── Left branding panel ─────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between px-14 py-12 flex-1 relative overflow-hidden">

        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(240,166,41,0.12) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(240,166,41,0.07) 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />

        {/* Logo */}
        <div className="relative z-10">
          <WOMLogoMark variant="full" height={36} white />
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-6 max-w-md">
          <div>
            <p style={{ color: '#F0A629', fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
              WOM Internal App · Staff Portal
            </p>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 36, lineHeight: 1.15, color: '#F5F1E9' }}>
              The internal operations hub for Word Of Mouth Agency.
            </h2>
          </div>
          <p style={{ color: 'rgba(245,241,233,0.55)', fontSize: 15, lineHeight: 1.65 }}>
            WOM Internal App is the central platform used by our team every day — managing clients, publishing social media, tracking rankings, and reporting on performance across all accounts.
          </p>
          <ul className="space-y-4">
            {FEATURES.map(f => (
              <li key={f.heading} className="flex items-start gap-3">
                <CheckCircle2 size={17} style={{ color: '#F0A629', flexShrink: 0, marginTop: 3 }} />
                <span style={{ color: 'rgba(245,241,233,0.65)', fontSize: 13.5, lineHeight: 1.5 }}>
                  <strong style={{ color: '#F5F1E9', fontWeight: 600 }}>{f.heading}</strong>
                  {' — '}{f.desc}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center gap-4 flex-wrap">
          <p style={{ color: 'rgba(245,241,233,0.25)', fontSize: 12 }}>
            © {new Date().getFullYear()} Word Of Mouth Agency · wordofmouthagency.com.au
          </p>
          <a href="/privacy" style={{ color: 'rgba(245,241,233,0.35)', fontSize: 12 }} className="hover:underline">Privacy Policy</a>
          <a href="/terms"   style={{ color: 'rgba(245,241,233,0.35)', fontSize: 12 }} className="hover:underline">Terms of Service</a>
        </div>
      </div>

      {/* ── Right panel ─────────────────────────────────────────── */}
      <div
        className="flex items-center justify-center w-full lg:w-[480px] flex-shrink-0 p-6 relative"
        style={{ borderLeft: '1px solid rgba(245,241,233,0.08)' }}
      >
        {/* Mobile-only logo */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 lg:hidden">
          <WOMLogoMark variant="full" height={28} white />
        </div>

        <div className="w-full max-w-sm text-center">

          {/* App badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-xs font-semibold tracking-wide uppercase"
            style={{ backgroundColor: 'rgba(240,166,41,0.12)', color: '#F0A629', border: '1px solid rgba(240,166,41,0.2)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#F0A629] animate-pulse" />
            Internal Access Only
          </div>

          {/* Card */}
          <div className="rounded-2xl p-10 shadow-2xl" style={{ backgroundColor: '#F5F1E9' }}>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: '#092137' }}
            >
              <WOMLogoMark size={36} white />
            </div>

            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, color: '#092137', marginBottom: 8 }}>
              WOM Internal App
            </h1>
            <p style={{ color: '#092137', opacity: 0.5, fontSize: 14, lineHeight: 1.6, marginBottom: 32 }}>
              The daily operations dashboard for Word Of Mouth Agency staff. Authorised access only.
            </p>

            <button
              onClick={() => navigate('/login')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-full font-semibold text-sm transition-all duration-200 active:scale-95"
              style={{ backgroundColor: '#F0A629', color: '#092137', border: '2px solid #092137' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#092137'; e.currentTarget.style.color = '#F5F1E9' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#F0A629'; e.currentTarget.style.color = '#092137' }}
            >
              Sign In to WOM Internal <ArrowRight size={15} />
            </button>

            <div className="mt-6 pt-5 text-xs text-center" style={{ borderTop: '1px solid #EDE8DC', color: '#092137', opacity: 0.35 }}>
              For access, contact your agency admin.
            </div>
          </div>

          {/* Mobile footer links */}
          <div className="mt-6 flex items-center justify-center gap-4 lg:hidden">
            <a href="/privacy" style={{ color: 'rgba(245,241,233,0.4)', fontSize: 12 }} className="hover:underline">Privacy Policy</a>
            <a href="/terms"   style={{ color: 'rgba(245,241,233,0.4)', fontSize: 12 }} className="hover:underline">Terms of Service</a>
          </div>
        </div>
      </div>
    </div>
  )
}
