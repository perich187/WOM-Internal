import { useState } from 'react'
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import WOMLogoMark from '@/components/ui/WOMLogoMark'

const FEATURES = [
  'Schedule posts across Instagram, Facebook, TikTok, LinkedIn & more',
  'Manage all client social accounts in one place',
  'Content calendar with drag-and-drop scheduling',
  'Analytics and performance reporting',
]

export default function Login() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
  }

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
        <div className="flex items-center gap-3 relative z-10">
          <WOMLogoMark size={40} />
          <div>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: '#F5F1E9', fontSize: 16, lineHeight: 1.2 }}>
              WOM Social
            </p>
            <p style={{ color: 'rgba(245,241,233,0.45)', fontSize: 11, lineHeight: 1.2 }}>
              Word Of Mouth Agency
            </p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-6 max-w-md">
          <div>
            <p style={{ color: '#F0A629', fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
              Internal Staff Portal
            </p>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 38, lineHeight: 1.15, color: '#F5F1E9' }}>
              Your agency's social media command centre.
            </h2>
          </div>
          <p style={{ color: 'rgba(245,241,233,0.55)', fontSize: 15, lineHeight: 1.65 }}>
            Schedule, manage and report on social media for all your clients — all from one beautifully simple dashboard.
          </p>
          <ul className="space-y-3">
            {FEATURES.map(f => (
              <li key={f} className="flex items-start gap-3">
                <CheckCircle2 size={17} style={{ color: '#F0A629', flexShrink: 0, marginTop: 2 }} />
                <span style={{ color: 'rgba(245,241,233,0.65)', fontSize: 13.5, lineHeight: 1.5 }}>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p style={{ color: 'rgba(245,241,233,0.25)', fontSize: 12 }} className="relative z-10">
          © {new Date().getFullYear()} Word Of Mouth Agency · wordofmouthagency.com.au
        </p>
      </div>

      {/* ── Right form panel ────────────────────────────────────── */}
      <div
        className="flex items-center justify-center w-full lg:w-[480px] flex-shrink-0 p-6 relative"
        style={{ borderLeft: '1px solid rgba(245,241,233,0.08)' }}
      >
        {/* Mobile-only logo */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2.5 lg:hidden">
          <WOMLogoMark size={32} />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: '#F5F1E9', fontSize: 15 }}>
            WOM Social
          </span>
        </div>

        <div className="w-full max-w-sm">
          {/* Card */}
          <div className="rounded-2xl p-8 shadow-2xl" style={{ backgroundColor: '#F5F1E9' }}>

            {/* Heading */}
            <div className="mb-7">
              <h2
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, color: '#092137', marginBottom: 4 }}
              >
                Sign in
              </h2>
              <p style={{ color: '#092137', opacity: 0.45, fontSize: 13.5 }}>
                Use your WOM agency account to continue
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#092137' }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@wordofmouthagency.com.au"
                  required
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl"
                  style={{ backgroundColor: '#fff', border: '2px solid #EDE8DC', color: '#092137', outline: 'none' }}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#092137' }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3.5 py-2.5 pr-11 text-sm rounded-xl"
                    style={{ backgroundColor: '#fff', border: '2px solid #EDE8DC', color: '#092137', outline: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-80 transition-opacity"
                    style={{ color: '#092137', opacity: 0.4 }}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3.5 py-2.5 rounded-xl">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-full font-semibold text-sm transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#F0A629', color: '#092137', border: '2px solid #092137', marginTop: 8 }}
                onMouseEnter={e => { if (!loading) { e.target.style.backgroundColor = '#092137'; e.target.style.color = '#F5F1E9' } }}
                onMouseLeave={e => { if (!loading) { e.target.style.backgroundColor = '#F0A629'; e.target.style.color = '#092137' } }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sign In →'}
              </button>
            </form>

            {/* Footer hint */}
            <div
              className="mt-6 pt-5 text-center text-xs"
              style={{ borderTop: '1px solid #EDE8DC', color: '#092137', opacity: 0.4 }}
            >
              Forgot your password? Contact your agency admin.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
