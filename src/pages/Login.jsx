import { useState } from 'react'
import { Eye, EyeOff, Loader2, Megaphone } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: '#092137' }}
    >
      {/* Subtle gold glow orbs */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: 'rgba(240,166,41,0.08)' }} />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: 'rgba(240,166,41,0.05)' }} />

      <div className="relative w-full max-w-sm">
        {/* Brand mark */}
        <div className="text-center mb-8">
          <div
            className="inline-flex w-14 h-14 rounded-xl items-center justify-center mb-4 shadow-lg"
            style={{ backgroundColor: '#F0A629' }}
          >
            <Megaphone size={26} style={{ color: '#092137' }} />
          </div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#F5F1E9' }}
          >
            WOM Social
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(245,241,233,0.5)' }}>
            Word Of Mouth Agency
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-7 shadow-2xl" style={{ backgroundColor: '#F5F1E9' }}>
          <h2
            className="text-lg font-bold mb-1"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#092137' }}
          >
            Sign in
          </h2>
          <p className="text-sm mb-6" style={{ color: '#092137', opacity: 0.5 }}>
            Use your WOM agency account
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#092137' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@wordofmouthagency.com.au"
                required
                className="w-full px-3.5 py-2.5 text-sm rounded-xl"
                style={{
                  backgroundColor: '#fff',
                  border: '2px solid #EDE8DC',
                  color: '#092137',
                }}
              />
            </div>

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
                  className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-xl"
                  style={{
                    backgroundColor: '#fff',
                    border: '2px solid #EDE8DC',
                    color: '#092137',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-80"
                  style={{ color: '#092137', opacity: 0.4 }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3.5 py-2.5 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <p className="text-xs text-center mt-5" style={{ color: '#092137', opacity: 0.4 }}>
            Forgot your password? Contact your agency admin.
          </p>
        </div>
      </div>
    </div>
  )
}
