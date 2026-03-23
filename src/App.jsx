import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuth } from './components/auth/AuthProvider'
import { WorkspaceProvider } from './lib/workspaces'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Privacy from './pages/Privacy'
import DataDeletion from './pages/DataDeletion'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Accounts from './pages/Accounts'
import Calendar from './pages/Calendar'
import Compose from './pages/Compose'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import DigitalHome from './pages/digital/DigitalHome'
import KeywordResearch from './pages/digital/KeywordResearch'
import RankTracking from './pages/digital/RankTracking'
import AIOverview from './pages/digital/AIOverview'
import SiteSpeed from './pages/digital/SiteSpeed'
import SiteAudit from './pages/digital/SiteAudit'
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
          <Route path="/login"         element={<LoginGuard />} />
          <Route path="/privacy"       element={<Privacy />} />
          <Route path="/data-deletion" element={<DataDeletion />} />

          <Route element={<ProtectedRoutes />}>
            {/* Social workspace */}
            <Route index                element={<Dashboard />} />
            <Route path="clients"       element={<Clients />} />
            <Route path="accounts"      element={<Accounts />} />
            <Route path="calendar"      element={<Calendar />} />
            <Route path="compose"       element={<Compose />} />
            <Route path="analytics"     element={<Analytics />} />
            <Route path="settings"      element={<Settings />} />

            {/* Digital workspace */}
            <Route path="digital"                    element={<DigitalHome />} />
            <Route path="digital/keywords"           element={<KeywordResearch />} />
            <Route path="digital/rank-tracking"      element={<RankTracking />} />
            <Route path="digital/ai-overview"        element={<AIOverview />} />
            <Route path="digital/site-speed"         element={<SiteSpeed />} />
            <Route path="digital/site-audit"         element={<SiteAudit />} />

            {/* Other workspaces — placeholders */}
            <Route path="web"       element={<WorkspacePlaceholder workspaceId="web" />} />
            <Route path="creative"  element={<WorkspacePlaceholder workspaceId="creative" />} />
            <Route path="reporting" element={<WorkspacePlaceholder workspaceId="reporting" />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </WorkspaceProvider>
    </BrowserRouter>
  )
}

function LoginGuard() {
  const { session } = useAuth()
  if (session === undefined) return null
  if (session) return <Navigate to="/" replace />
  return <Login />
}
