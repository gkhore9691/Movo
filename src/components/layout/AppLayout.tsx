import { useState, useCallback } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { AskMovo } from '@/features/ask-movo'

const pageTitles: Record<string, string> = {
  '/': 'Pulse',
  '/revenue-radar': 'Revenue Radar',
  '/ai-receptionist': 'AI Receptionist',
  '/leads': 'Leads',
  '/bookings': 'Bookings',
  '/jobs': 'Jobs',
  '/customers': 'Customers',
  '/vehicles': 'Vehicles',
  '/payments': 'Payments',
  '/reviews': 'Reviews',
  '/automations': 'Automations',
  '/staff': 'Staff',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const basePath = '/' + (location.pathname.split('/')[1] || '')
  const title = pageTitles[basePath] || 'Movo'

  const handleMenuClick = useCallback(() => setSidebarOpen(true), [])
  const handleSidebarClose = useCallback(() => setSidebarOpen(false), [])
  const handleSearchClick = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-ask-movo'))
  }, [])

  return (
    <div className="min-h-screen">
      <AskMovo />
      <Sidebar open={sidebarOpen} onClose={handleSidebarClose} />

      <div className="lg:ml-60 min-h-screen">
        <TopBar
          title={title}
          onMenuClick={handleMenuClick}
          onSearchClick={handleSearchClick}
        />

        <main className="p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
