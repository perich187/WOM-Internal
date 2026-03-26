import WOMLogoMark from '@/components/ui/WOMLogoMark'

const LAST_UPDATED = 'March 2026'

export default function Privacy() {
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
            Privacy Policy
          </h1>
          <p style={{ color: '#092137', opacity: 0.45, fontSize: 14 }}>Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: '#092137' }}>

          <Section title="1. Overview">
            <p>
              WOM Internal App is the internal agency operations dashboard operated by{' '}
              <strong>Word Of Mouth Agency</strong> ("we", "us", "our"), an Australian digital
              marketing agency. This application is used exclusively by Word Of Mouth Agency staff
              to manage the day-to-day operations of the agency, including client management,
              social media publishing, digital marketing reporting, analytics, and campaign oversight.
            </p>
            <p className="mt-3">
              This Privacy Policy explains how we collect, use, store, and protect information
              when our staff use the WOM Internal App, including information obtained via
              third-party platform integrations such as Meta (Facebook and Instagram),
              Google Analytics, and Google Search Console.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <p className="font-semibold text-[#092137] mb-2">Staff accounts</p>
            <ul className="list-disc pl-5 space-y-1 text-[#092137]/70">
              <li>Name and email address (used for login via Supabase Auth)</li>
              <li>Role within the agency (e.g. staff, admin)</li>
            </ul>

            <p className="font-semibold text-[#092137] mt-4 mb-2">Client data</p>
            <ul className="list-disc pl-5 space-y-1 text-[#092137]/70">
              <li>Client names, industries, and contact details entered by agency staff</li>
              <li>Campaign notes, project details, and service records</li>
              <li>NPS scores and performance data associated with client accounts</li>
            </ul>

            <p className="font-semibold text-[#092137] mt-4 mb-2">Connected platform data (via OAuth)</p>
            <ul className="list-disc pl-5 space-y-1 text-[#092137]/70">
              <li>Facebook Page names, IDs, and access tokens</li>
              <li>Instagram Business account usernames, IDs, and follower counts</li>
              <li>Google Analytics 4 property data — sessions, users, pageviews, traffic channels, and top pages</li>
              <li>Google Search Console data — keyword rankings, impressions, and clicks</li>
              <li>OAuth access tokens used to read and publish content on connected accounts</li>
              <li>Post content, scheduling details, and media created within the platform</li>
              <li>Analytics and performance metrics from all connected platforms</li>
            </ul>
          </Section>

          <Section title="3. How We Use This Information">
            <p>We use the collected information solely to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-[#092137]/70">
              <li>Authenticate agency staff and manage role-based access to the platform</li>
              <li>Manage client accounts, projects, and service records within the agency</li>
              <li>Connect to client social media accounts via OAuth 2.0 and publish content on their behalf</li>
              <li>Schedule and manage social media posts across Facebook and Instagram</li>
              <li>Pull live reporting data from Google Analytics and Google Search Console</li>
              <li>Display analytics and performance metrics across all connected platforms</li>
              <li>Generate internal reports and campaign performance summaries</li>
            </ul>
            <p className="mt-3">
              We do not sell, share, or disclose any personal data, client data, or platform
              information to third parties for advertising or marketing purposes.
            </p>
          </Section>

          <Section title="4. Meta Platform Data (Facebook & Instagram)">
            <p>
              WOM Internal App connects to Facebook Pages and Instagram Business accounts through the
              Meta Graph API using OAuth 2.0. By connecting a client's account, we are granted
              access to the following permissions:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-[#092137]/70">
              <li><code className="bg-[#EDE8DC] px-1.5 py-0.5 rounded text-xs">pages_manage_posts</code> — publish and manage posts on Facebook Pages</li>
              <li><code className="bg-[#EDE8DC] px-1.5 py-0.5 rounded text-xs">pages_read_engagement</code> — read Page insights and engagement data</li>
              <li><code className="bg-[#EDE8DC] px-1.5 py-0.5 rounded text-xs">pages_show_list</code> — list the Pages a user manages</li>
              <li><code className="bg-[#EDE8DC] px-1.5 py-0.5 rounded text-xs">read_insights</code> — read Facebook Page insights and analytics</li>
              <li><code className="bg-[#EDE8DC] px-1.5 py-0.5 rounded text-xs">instagram_basic</code> — read basic Instagram account information</li>
              <li><code className="bg-[#EDE8DC] px-1.5 py-0.5 rounded text-xs">instagram_content_publish</code> — publish content to Instagram</li>
              <li><code className="bg-[#EDE8DC] px-1.5 py-0.5 rounded text-xs">instagram_manage_insights</code> — read Instagram analytics</li>
            </ul>
            <p className="mt-3">
              Access tokens are stored securely and used only to perform actions on behalf of clients
              as instructed by authorised agency staff. We do not access personal Facebook profiles —
              only Pages and Business accounts explicitly connected through the platform.
            </p>
            <p className="mt-3">Access can be revoked at any time by:</p>
            <ul className="list-disc pl-5 mt-1.5 space-y-1 text-[#092137]/70">
              <li>Disconnecting the account within the WOM Internal App (Connected Accounts page)</li>
              <li>Removing the app from Facebook → Settings → Apps and Websites</li>
            </ul>
          </Section>

          <Section title="5. Google Platform Data (Analytics & Search Console)">
            <p>
              WOM Internal App connects to Google Analytics 4 and Google Search Console via Google
              OAuth 2.0. This allows agency staff to view live performance data for client websites
              directly within the dashboard. The following read-only permissions are requested:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-[#092137]/70">
              <li><code className="bg-[#EDE8DC] px-1.5 py-0.5 rounded text-xs">analytics.readonly</code> — read Google Analytics 4 reporting data</li>
              <li><code className="bg-[#EDE8DC] px-1.5 py-0.5 rounded text-xs">webmasters.readonly</code> — read Google Search Console data</li>
              <li><code className="bg-[#EDE8DC] px-1.5 py-0.5 rounded text-xs">userinfo.email</code> — identify the connected Google account</li>
            </ul>
            <p className="mt-3">
              All Google data is read-only and used solely for internal reporting purposes.
              No data is modified, exported, or shared outside of the platform.
            </p>
          </Section>

          <Section title="6. Data Storage & Security">
            <p>
              All data is stored in a Supabase PostgreSQL database hosted on AWS infrastructure
              in the ap-southeast-2 (Sydney) region. Access is protected by:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-[#092137]/70">
              <li>Row Level Security (RLS) — only authenticated agency staff can access data</li>
              <li>TLS encryption in transit for all API communications</li>
              <li>Encrypted storage for OAuth access tokens</li>
              <li>Access limited to authorised Word Of Mouth Agency staff only</li>
            </ul>
            <p className="mt-3">
              We retain data for as long as it is needed to deliver our services. Access tokens
              and account data are deleted when an account is disconnected from the platform.
            </p>
          </Section>

          <Section title="7. Third-Party Services">
            <p>WOM Internal App integrates with the following third-party services:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-[#092137]/70">
              <li><strong>Meta (Facebook / Instagram)</strong> — social media publishing and analytics via Graph API</li>
              <li><strong>Google Analytics</strong> — website traffic and performance reporting via Analytics Data API</li>
              <li><strong>Google Search Console</strong> — keyword rankings and search performance via Webmasters API</li>
              <li><strong>Supabase</strong> — database, authentication, and file storage</li>
              <li><strong>Vercel</strong> — application hosting and serverless functions</li>
            </ul>
            <p className="mt-3">
              Each of these services operates under their own privacy policies and data processing
              agreements. We use them solely to operate this internal platform.
            </p>
          </Section>

          <Section title="8. Your Rights">
            <p>
              As an internal tool used exclusively by Word Of Mouth Agency staff, this platform
              is not intended for use by members of the public. However, individuals whose data
              may be referenced within the platform may contact us to:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-[#092137]/70">
              <li>Request access to data we hold about them</li>
              <li>Request correction or deletion of their data</li>
              <li>Revoke consent for social media or analytics account access</li>
            </ul>
          </Section>

          <Section title="9. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. Any changes will be reflected
              on this page with an updated date. Continued use of the WOM Internal App constitutes
              acceptance of the updated policy.
            </p>
          </Section>

          <Section title="10. Contact Us">
            <p>
              If you have any questions about this Privacy Policy or how we handle data, please
              contact us:
            </p>
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
