import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuth } from './components/auth/AuthProvider'
import { WorkspaceProvider } from './lib/workspaces'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import DataDeletion from './pages/DataDeletion'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Accounts from './pages/Accounts'
import Calendar from './pages/Calendar'
import Compose from './pages/Compose'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import InfluencersLayout from './pages/influencers/InfluencersLayout'
import InfluencersList from './pages/influencers/InfluencersList'
import FindInfluencers from './pages/influencers/FindInfluencers'
import Campaigns from './pages/influencers/Campaigns'
import CampaignDetail from './pages/influencers/CampaignDetail'
import DigitalLayout from './pages/digital/DigitalLayout'
import DigitalHome from './pages/digital/DigitalHome'
import KeywordResearch from './pages/digital/KeywordResearch'
import RankTracking from './pages/digital/RankTracking'
import RankTracker from './pages/digital/RankTracker'
import AIOverview from './pages/digital/AIOverview'
import SiteSpeed from './pages/digital/SiteSpeed'
import SiteAudit from './pages/digital/SiteAudit'
import ReportingLayout from './pages/reporting/ReportingLayout'
import ReportingHome from './pages/reporting/ReportingHome'
import ReportBuilder from './pages/reporting/ReportBuilder'
import LiveData from './pages/reporting/LiveData'
import PublicReport from './pages/reporting/PublicReport'
import WorkspacePlaceholder from './pages/WorkspacePlaceholder'

function ProtectedRoutes() {
  const { session } = useAuth()
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-[#F5F1E9] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-wom-gold border-t-transparent animate-spin" />
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  return <Layout />
}

export default function App() {
  return (
    <BrowserRouter>
      <WorkspaceProvider>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/"              element={<HomeGuard />} />
          <Route path="/login"         element={<LoginGuard />} />
          <Route path="/privacy"       element={<Privacy />} />
          <Route path="/terms"         element={<Terms />} />
          <Route path="/data-deletion" element={<DataDeletion />} />
          <Route path="/report/:token" element={<PublicReport />} />

          <Route element={<ProtectedRoutes />}>
            {/* Social workspace */}
            <Route path="dashboard"     element={<Dashboard />} />
            <Route path="clients"       element={<Clients />} />
            <Route path="accounts"      element={<Accounts />} />
            <Route path="calendar"      element={<Calendar />} />
            <Route path="compose"       element={<Compose />} />
            <Route path="analytics"     element={<Analytics />} />
            <Route path="settings"      element={<Settings />} />

            {/* Influencers */}
            <Route path="influencers" element={<InfluencersLayout />}>
              <Route index                 element={<InfluencersList />} />
              <Route path="discover"       element={<FindInfluencers />} />
              <Route path="campaigns"      element={<Campaigns />} />
              <Route path="campaigns/:id"  element={<CampaignDetail />} />
            </Route>

            {/* Digital workspace */}
            <Route path="digital" element={<DigitalLayout />}>
              <Route index                  element={<DigitalHome />} />
              <Route path="keywords"        element={<KeywordResearch />} />
              <Route path="rank-tracker"    element={<RankTracker />} />
              <Route path="rank-tracking"   element={<RankTracking />} />
              <Route path="ai-overview"     element={<AIOverview />} />
              <Route path="site-speed"      element={<SiteSpeed />} />
              <Route path="site-audit"      element={<SiteAudit />} />
            </Route>

            {/* Reporting workspace */}
            <Route path="reporting" element={<ReportingLayout />}>
              <Route index element={<ReportingHome />} />
              <Route path="builder/:id"          element={<ReportBuilder />} />
              <Route path="live-data/:platform"  element={<LiveData />} />
            </Route>

            {/* Other workspaces — placeholders */}
            <Route path="web"       element={<WorkspacePlaceholder workspaceId="web" />} />
            <Route path="creative"  element={<WorkspacePlaceholder workspaceId="creative" />} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </WorkspaceProvider>
    </BrowserRouter>
  )
}

function LoginGuard() {
  const { session } = useAuth()
  if (session === undefined) return null
  if (session) return <Navigate to="/dashboard" replace />
  return <Login />
}

function HomeGuard() {
  const { session } = useAuth()
  if (session === undefined) return null
  if (session) return <Navigate to="/dashboard" replace />
  return <Home />
}
