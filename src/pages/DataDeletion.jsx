import { CheckCircle2, Mail } from 'lucide-react'
import WOMLogoMark from '@/components/ui/WOMLogoMark'

export default function DataDeletion() {
  const params = new URLSearchParams(window.location.search)
  const code   = params.get('code')

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F1E9' }}>

      {/* Header */}
      <header style={{ backgroundColor: '#092137', borderBottom: '1px solid rgba(245,241,233,0.1)' }}>
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
          <WOMLogoMark size={36} />
          <div>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: '#F5F1E9', fontSize: 15, lineHeight: 1.2 }}>
              WOM Social
            </p>
            <p style={{ color: 'rgba(245,241,233,0.45)', fontSize: 11 }}>Word Of Mouth Agency</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-14">

        {code ? (
          /* ── Deletion confirmed ── */
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 26, color: '#092137', marginBottom: 10 }}>
              Data Deletion Request Received
            </h1>
            <p style={{ color: '#092137', opacity: 0.55, fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
              Your data deletion request has been processed. Any Facebook and Instagram account
              data associated with your account has been removed from our systems.
            </p>
            <div className="bg-white rounded-xl border border-[#EDE8DC] p-5 text-left inline-block mx-auto">
              <p className="text-xs font-semibold text-[#092137]/40 uppercase tracking-wider mb-1">Confirmation Code</p>
              <code className="text-sm font-mono text-[#092137] font-bold">{code}</code>
            </div>
            <p className="text-xs text-[#092137]/40 mt-5">
              Keep this confirmation code for your records.
            </p>
          </div>
        ) : (
          /* ── Deletion instructions ── */
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 28, color: '#092137', marginBottom: 8 }}>
              Data Deletion Request
            </h1>
            <p style={{ color: '#092137', opacity: 0.5, fontSize: 14, marginBottom: 32 }}>
              Word Of Mouth Agency · WOM Social platform
            </p>

            <div className="space-y-5">
              <div className="bg-white rounded-xl border border-[#EDE8DC] p-6">
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16, color: '#092137', marginBottom: 10 }}>
                  What data do we hold?
                </h2>
                <ul className="space-y-2 text-sm" style={{ color: '#092137', opacity: 0.65 }}>
                  <li>• Facebook Page names, IDs, and access tokens</li>
                  <li>• Instagram Business account usernames and IDs</li>
                  <li>• Social media posts created through our platform</li>
                  <li>• Agency staff login accounts (name and email)</li>
                </ul>
              </div>

              <div className="bg-white rounded-xl border border-[#EDE8DC] p-6">
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16, color: '#092137', marginBottom: 10 }}>
                  How to request deletion
                </h2>
                <p className="text-sm mb-4" style={{ color: '#092137', opacity: 0.65, lineHeight: 1.7 }}>
                  You can request deletion of your data in two ways:
                </p>
                <div className="space-y-3">
                  <div className="bg-[#F5F1E9] rounded-lg p-4">
                    <p className="text-sm font-semibold text-[#092137] mb-1">Option 1 — Via Facebook</p>
                    <p className="text-sm text-[#092137]/60">
                      Go to <strong>Facebook Settings → Apps and Websites → WOM Social → Remove</strong>.
                      Facebook will automatically notify us and we will delete your data within 30 days.
                    </p>
                  </div>
                  <div className="bg-[#F5F1E9] rounded-lg p-4">
                    <p className="text-sm font-semibold text-[#092137] mb-1">Option 2 — Contact us directly</p>
                    <p className="text-sm text-[#092137]/60 mb-3">
                      Email us and we will manually remove your data within 30 days.
                    </p>
                    <a
                      href="mailto:hello@wordofmouthagency.com.au?subject=Data Deletion Request - WOM Social"
                      className="inline-flex items-center gap-2 btn-primary text-sm"
                    >
                      <Mail size={14} /> Email Us
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-[#EDE8DC] p-6">
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16, color: '#092137', marginBottom: 10 }}>
                  Contact
                </h2>
                <p className="text-sm" style={{ color: '#092137', opacity: 0.65 }}>
                  Word Of Mouth Agency<br />
                  <a href="https://wordofmouthagency.com.au" target="_blank" rel="noreferrer" className="text-[#F0A629] hover:underline">
                    wordofmouthagency.com.au
                  </a><br />
                  <a href="mailto:hello@wordofmouthagency.com.au" className="text-[#F0A629] hover:underline">
                    hello@wordofmouthagency.com.au
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
