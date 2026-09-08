import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Calendar,
  Wrench,
  UserCircle,
  Car,
  CreditCard,
  Star,
  Bot,
  Zap,
  Users2,
  BarChart3,
  Settings,
  X,
} from 'lucide-react'

const navItems = [
  { label: 'Pulse', icon: LayoutDashboard, to: '/' },
  { label: 'Revenue Radar', icon: TrendingUp, to: '/revenue-radar' },
  { label: 'AI Receptionist', icon: Bot, to: '/ai-receptionist' },
  { label: 'Leads', icon: Users, to: '/leads' },
  { label: 'Bookings', icon: Calendar, to: '/bookings' },
  { label: 'Jobs', icon: Wrench, to: '/jobs' },
  { label: 'Customers', icon: UserCircle, to: '/customers' },
  { label: 'Vehicles', icon: Car, to: '/vehicles' },
  { label: 'Payments', icon: CreditCard, to: '/payments' },
  { label: 'Reviews', icon: Star, to: '/reviews' },
  { label: 'Automations', icon: Zap, to: '/automations' },
  { label: 'Staff', icon: Users2, to: '/staff' },
  { label: 'Analytics', icon: BarChart3, to: '/analytics' },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 flex h-screen w-60 flex-col bg-neutral-900 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Business Brand */}
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm font-semibold text-white leading-tight">Detailing Street</p>
            <p className="text-[11px] text-neutral-500 mt-0.5">Indore</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-neutral-500 hover:text-neutral-300 lg:hidden"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <ul className="space-y-0.5">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`
                  }
                >
                  <item.icon size={16} className="shrink-0" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom */}
        <div className="border-t border-neutral-800 px-2 py-2">
          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`
            }
          >
            <Settings size={16} className="shrink-0" />
            Settings
          </NavLink>
          <div className="px-3 py-3 mt-1">
            <p className="text-[10px] text-neutral-600">Powered by <span className="text-neutral-500 font-medium">Movo</span></p>
          </div>
        </div>
      </aside>
    </>
  )
}
