import { Routes, Route } from 'react-router-dom'
import { AppProvider } from '@/contexts/AppContext'
import AppLayout from '@/components/layout/AppLayout'

import Pulse from '@/pages/Pulse'
import RevenueRadar from '@/pages/RevenueRadar'
import Leads from '@/pages/Leads'
import Bookings from '@/pages/Bookings'
import Jobs from '@/pages/Jobs'
import Customers from '@/pages/Customers'
import CustomerDetail from '@/pages/CustomerDetail'
import Vehicles from '@/pages/Vehicles'
import VehicleDetail from '@/pages/VehicleDetail'
import Payments from '@/pages/Payments'
import Reviews from '@/pages/Reviews'
import Automations from '@/pages/Automations'
import Staff from '@/pages/Staff'
import Analytics from '@/pages/Analytics'
import AIReceptionist from '@/pages/AIReceptionist'
import Settings from '@/pages/Settings'

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Pulse />} />
          <Route path="revenue-radar" element={<RevenueRadar />} />
          <Route path="leads" element={<Leads />} />
          <Route path="ai-receptionist" element={<AIReceptionist />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="vehicles/:id" element={<VehicleDetail />} />
          <Route path="payments" element={<Payments />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="automations" element={<Automations />} />
          <Route path="staff" element={<Staff />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </AppProvider>
  )
}
