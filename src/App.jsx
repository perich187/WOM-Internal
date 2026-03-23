import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuth } from './components/auth/AuthProvider'
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

function ProtectedRoutes() {
  const { session } = useAuth()

  // Still loading session
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-[#F5F1E9] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-wom-gold border-t-transparent animate-spin" />
      </div>
    )
  }

  // Not logged in → redirect to login
  if (!session) return <Navigate to="/login" replace />

  return <Layout />
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        {/* Public routes — no login required */}
        <Route path="/login"          element={<LoginGuard />} />
        <Route path="/privacy"        element={<Privacy />} />
        <Route path="/data-deletion"  element={<DataDeletion />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoutes />}>
          <Route index element={<Dashboard />} />
          <Route path="clients"   element={<Clients />} />
          <Route path="accounts"  element={<Accounts />} />
          <Route path="calendar"  element={<Calendar />} />
          <Route path="compose"   element={<Compose />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings"  element={<Settings />} />
          <Route path="*"         element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

// Redirect to home if already logged in
function LoginGuard() {
  const { session } = useAuth()
  if (session === undefined) return null
  if (session) return <Navigate to="/" replace />
  return <Login />
}
