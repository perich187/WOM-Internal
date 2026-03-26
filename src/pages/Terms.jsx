import WOMLogoMark from '@/components/ui/WOMLogoMark'

const LAST_UPDATED = 'March 2026'

export default function Terms() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F1E9' }}>

      {/* Header */}
      <header style={{ backgroundColor: '#092137', borderBottom: '1px solid rgba(245,241,233,0.1)' }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <WOMLogoMark size={36} />
          <div>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: '#F5F1E9', fontSize: 15, lineHeight: 1.2 }}>
              WOM Internal App
            </p>
            <p style={{ color: 'rgba(245,241,233,0.45)', fontSize: 11 }}>Word Of Mouth Agency</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">

        <div className="mb-10">
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 32, color: '#092137', marginBottom: 8 }}>
            Terms of Service
          </h1>
          <p style={{ color: '#092137', opacity: 0.45, fontSize: 14 }}>Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: '#092137' }}>

          <Section title="1. About This Platform">
            <p>
              WOM Internal App is the internal agency operations dashboard operated by{' '}
              <strong>Word Of Mouth Agency</strong> ("we", "us", "our"), an Australian digital
              marketing agency. It is the central hub used by our team for daily agency operations,
              including client management, social media publishing and scheduling, digital marketing
              reporting, Google Analytics and Search Console integration, campaign tracking, and
              performance reporting across all client accounts.
            </p>
            <p className="mt-3">
              By accessing or using this platform, you agree to be bound by these Terms of Service.
              Access is strictly limited to authorised Word Of Mouth Agency staff.
            </p>
          </Section>

          <Section title="2. Authorised Use">
            <p>This platform is for internal agency use only. You agree to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-[#092137]/70">
              <li>Use the platform only for legitimate agency work on behalf of clients</li>
              <li>Keep your login credentials secure and not share them with others</li>
              <li>Only access client accounts and data within the scope of your role</li>
              <li>Not attempt to reverse-engineer, copy, or misuse any part of the platform</li>
              <li>Report any suspected unauthorised access or security issues to your agency admin</li>
            </ul>
          </Section>

          <Section title="3. Platform Features & Daily Operations">
            <p>WOM Internal App is used for the following day-to-day agency operations:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-[#092137]/70">
              <li><strong>Client Management</strong> — adding, editing, and managing client records, industries, and service notes</li>
              <li><strong>Social Media Management</strong> — publishing, scheduling, and managing posts across Facebook and Instagram</li>
              <li><strong>Analytics & Reporting</strong> — viewing live data from Google Analytics 4, Search Console, and Meta platforms</li>
              <li><strong>Digital Marketing</strong> — keyword research, rank tracking, site speed, and SEO audit tools</li>
              <li><strong>Content Calendar</strong> — planning and scheduling content across client accounts</li>
              <li><strong>Performance Reporting</strong> — generating and sharing client-facing reports</li>
            </ul>
          </Section>

          <Section title="4. Connected Platform Integrations">
            <p>
              WOM Internal App integrates with Meta (Facebook and Instagram), Google Analytics,
              and Google Search Console via OAuth 2.0. By connecting these accounts you confirm:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-[#092137]/70">
              <li>You have the authority to connect the relevant client accounts on their behalf</li>
              <li>Access tokens are stored securely and used only for authorised agency operations</li>
              <li>All Google integrations are read-only and used solely for internal reporting</li>
              <li>Connections can be revoked at any time via the Connected Accounts page or directly within the third-party platform</li>
            </ul>
          </Section>

          <Section title="5. Data Usage">
            <p>
              All data accessed through connected integrations — including analytics, post performance,
              client records, and account information — is used solely for internal agency operations
              and client reporting purposes. No client data is sold, shared, or disclosed to any
              third party outside of the services required to operate this platform.
            </p>
            <p className="mt-3">
              For full details on how data is collected and stored, refer to our{' '}
              <a href="/privacy" className="text-[#F0A629] hover:underline">Privacy Policy</a>.
            </p>
          </Section>

          <Section title="6. Intellectual Property">
            <p>
              All content, design, code, and branding within WOM Internal App is the property of
              Word Of Mouth Agency. Unauthorised reproduction or distribution is prohibited.
              Client data and assets remain the property of the respective client.
            </p>
          </Section>

          <Section title="7. Limitation of Liability">
            <p>
              WOM Internal App is provided as an internal operational tool. Word Of Mouth Agency
              is not liable for any disruption to service, data loss, or third-party platform
              outages that may affect platform availability. We take reasonable measures to
              maintain uptime and data integrity but do not guarantee uninterrupted access.
            </p>
          </Section>

          <Section title="8. Changes to These Terms">
            <p>
              We may update these Terms of Service from time to time. Any changes will be reflected
              on this page with an updated date. Continued use of the WOM Internal App constitutes
              acceptance of the updated terms.
            </p>
          </Section>

          <Section title="9. Contact Us">
            <p>If you have any questions about these terms, please contact us:</p>
            <div className="mt-3 p-4 bg-white rounded-xl border border-[#EDE8DC]">
              <p className="font-semibold text-[#092137]">Word Of Mouth Agency</p>
              <p className="text-[#092137]/60 mt-1">
                Website:{' '}
                <a href="https://wordofmouthagency.com.au" target="_blank" rel="noreferrer" className="text-[#F0A629] hover:underline">
                  wordofmouthagency.com.au
                </a>
              </p>
              <p className="text-[#092137]/60">
                Email:{' '}
                <a href="mailto:hello@wordofmouthagency.com.au" className="text-[#F0A629] hover:underline">
                  hello@wordofmouthagency.com.au
                </a>
              </p>
            </div>
          </Section>

        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-3xl mx-auto px-6 py-8 border-t border-[#EDE8DC]">
        <p style={{ color: '#092137', opacity: 0.35, fontSize: 12 }}>
          © {new Date().getFullYear()} Word Of Mouth Agency · ABN — All rights reserved
        </p>
      </footer>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section>
      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 17, color: '#092137', marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #EDE8DC' }}>
        {title}
      </h2>
      <div style={{ color: 'rgba(9,33,55,0.7)', lineHeight: 1.75 }}>
        {children}
      </div>
    </section>
  )
}
