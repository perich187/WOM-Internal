import { useState } from 'react'
import { Bell, Shield, Users, Key, Globe, Moon, Save, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MOCK_STAFF } from '@/lib/mockData'

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: Users },
  { id: 'team', label: 'Team Members', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'api', label: 'API & Integrations', icon: Key },
  { id: 'security', label: 'Security', icon: Shield },
]

export default function Settings() {
  const [activeSection, setActiveSection] = useState('profile')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">

        {/* Sidebar nav */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-xl border border-[#EDE8DC] p-2 space-y-0.5">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors',
                  activeSection === id
                    ? 'bg-wom-gold text-[#092137]'
                    : 'text-[#092137]/60 hover:bg-[#F5F1E9]'
                )}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="md:col-span-3 space-y-4">

          {activeSection === 'profile' && (
            <div className="bg-white rounded-xl border border-[#EDE8DC] p-6 space-y-5 animate-fade-in">
              <h3 className="font-semibold text-[#092137] text-base">Your Profile</h3>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-wom-gold flex items-center justify-center text-[#092137] text-xl font-bold">
                  SJ
                </div>
                <div>
                  <button className="btn-secondary text-xs">Change Avatar</button>
                  <p className="text-xs text-[#092137]/40 mt-1">JPG, PNG or GIF — max 2MB</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'First Name', value: 'Sarah' },
                  { label: 'Last Name', value: 'Johnson' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <label className="block text-sm font-medium text-[#092137]/80 mb-1.5">{label}</label>
                    <input
                      defaultValue={value}
                      className="w-full px-3.5 py-2.5 text-sm border border-[#EDE8DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-wom-gold/30 focus:border-wom-gold"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#092137]/80 mb-1.5">Email</label>
                <input
                  defaultValue="sarah@wordofmouthagency.com.au"
                  type="email"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#EDE8DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-wom-gold/30 focus:border-wom-gold"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#092137]/80 mb-1.5">Role</label>
                <select className="w-full px-3.5 py-2.5 text-sm border border-[#EDE8DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-wom-gold/30 bg-white">
                  <option>Social Media Manager</option>
                  <option>Content Creator</option>
                  <option>Account Manager</option>
                  <option>Admin</option>
                </select>
              </div>

              <button onClick={handleSave} className="btn-primary">
                <Save size={15} />
                {saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          )}

          {activeSection === 'team' && (
            <div className="bg-white rounded-xl border border-[#EDE8DC] p-6 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#092137] text-base">Team Members</h3>
                <button className="btn-primary text-sm">+ Invite Member</button>
              </div>
              <div className="space-y-3">
                {MOCK_STAFF.map(member => (
                  <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl border border-[#EDE8DC]">
                    <div className="w-10 h-10 rounded-xl bg-wom-gold flex items-center justify-center text-[#092137] text-sm font-bold flex-shrink-0">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#092137]">{member.name}</p>
                      <p className="text-xs text-[#092137]/40">{member.email}</p>
                    </div>
                    <span className="text-xs bg-[#FEF8EC] text-wom-gold px-2.5 py-1 rounded-full font-medium">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'api' && (
            <div className="bg-white rounded-xl border border-[#EDE8DC] p-6 space-y-5 animate-fade-in">
              <h3 className="font-semibold text-[#092137] text-base">API Keys & Integrations</h3>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                <p className="font-medium mb-1">⚠️ Keep these secret</p>
                <p className="text-xs">API keys must be stored in Supabase environment variables or a secrets manager — never in frontend code.</p>
              </div>

              {[
                { platform: 'Meta (Instagram + Facebook)', key: 'META_APP_ID, META_APP_SECRET', status: 'configured' },
                { platform: 'TikTok for Business', key: 'TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET', status: 'not-configured' },
                { platform: 'LinkedIn Marketing', key: 'LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET', status: 'not-configured' },
                { platform: 'Twitter / X', key: 'TWITTER_API_KEY, TWITTER_API_SECRET', status: 'not-configured' },
                { platform: 'Pinterest', key: 'PINTEREST_APP_ID, PINTEREST_APP_SECRET', status: 'not-configured' },
              ].map(({ platform, key, status }) => (
                <div key={platform} className="flex items-center gap-3 p-4 border border-[#EDE8DC] rounded-xl">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#092137]">{platform}</p>
                    <p className="text-xs text-[#092137]/40 font-mono mt-0.5">{key}</p>
                  </div>
                  <span className={cn(
                    'text-xs px-2.5 py-1 rounded-full font-medium',
                    status === 'configured' ? 'bg-green-50 text-green-600' : 'bg-[#EDE8DC] text-[#092137]/40'
                  )}>
                    {status === 'configured' ? '✓ Configured' : 'Not set'}
                  </span>
                  <button className="text-xs text-wom-gold hover:underline">Configure →</button>
                </div>
              ))}
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="bg-white rounded-xl border border-[#EDE8DC] p-6 space-y-4 animate-fade-in">
              <h3 className="font-semibold text-[#092137] text-base">Notification Preferences</h3>
              {[
                { label: 'Post published successfully', desc: 'Notify when a scheduled post goes live' },
                { label: 'Post failed to publish', desc: 'Alert when a post fails due to an API error' },
                { label: 'New client connected account', desc: 'When a client connects a social account' },
                { label: 'Weekly performance summary', desc: 'Email digest every Monday morning' },
                { label: 'Token expiry warning', desc: '7 days before an OAuth token expires' },
              ].map(({ label, desc }) => (
                <div key={label} className="flex items-start justify-between gap-4 py-3 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[#092137]">{label}</p>
                    <p className="text-xs text-[#092137]/40 mt-0.5">{desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-10 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-wom-gold/30 rounded-full peer peer-checked:bg-wom-gold transition-colors" />
                    <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all peer-checked:translate-x-5" />
                  </label>
                </div>
              ))}
              <button onClick={handleSave} className="btn-primary">
                <Save size={15} /> {saved ? 'Saved!' : 'Save Preferences'}
              </button>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="bg-white rounded-xl border border-[#EDE8DC] p-6 space-y-5 animate-fade-in">
              <h3 className="font-semibold text-[#092137] text-base">Security</h3>
              <div>
                <label className="block text-sm font-medium text-[#092137]/80 mb-1.5">Current Password</label>
                <input type="password" placeholder="••••••••" className="w-full px-3.5 py-2.5 text-sm border border-[#EDE8DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-wom-gold/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#092137]/80 mb-1.5">New Password</label>
                <input type="password" placeholder="••••••••" className="w-full px-3.5 py-2.5 text-sm border border-[#EDE8DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-wom-gold/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#092137]/80 mb-1.5">Confirm New Password</label>
                <input type="password" placeholder="••••••••" className="w-full px-3.5 py-2.5 text-sm border border-[#EDE8DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-wom-gold/30" />
              </div>
              <button className="btn-primary"><Shield size={15} /> Update Password</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
