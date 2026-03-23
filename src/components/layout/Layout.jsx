import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const sidebarWidth = collapsed ? 64 : 240

  return (
    // Cream page background — matches WOM website
    <div className="min-h-screen" style={{ backgroundColor: '#F5F1E9' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <Header sidebarWidth={sidebarWidth} />
      <main
        className="transition-all duration-200 pt-16"
        style={{ marginLeft: sidebarWidth }}
      >
        <div className="p-6 min-h-[calc(100vh-64px)]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
