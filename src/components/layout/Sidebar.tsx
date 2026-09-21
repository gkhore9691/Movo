import { NavLink, useNavigate } from 'react-router-dom'
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
  Shield,
  LogOut,
} from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import { getInitials } from '@/utils/format'

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
  const { currentTenant, currentUser, logout } = useApp()
  const navigate = useNavigate()

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
            <p className="text-sm font-semibold text-white leading-tight">{currentTenant?.name ?? 'Movo'}</p>
            {(currentTenant?.city) && <p className="text-[11px] text-neutral-500 mt-0.5">{currentTenant.city}</p>}
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
          {currentUser?.role === 'admin' && (
            <NavLink
              to="/admin"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`
              }
            >
              <Shield size={16} className="shrink-0" />
              Admin Panel
            </NavLink>
          )}
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

          {currentUser && (
            <div className="flex items-center gap-2 px-3 py-2 mt-1">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-medium text-white">
                {getInitials(currentUser.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-neutral-300 truncate">{currentUser.name}</p>
              </div>
              <button
                onClick={() => {
                  logout()
                }}
                className="text-neutral-600 hover:text-neutral-400 transition-colors"
                title="Logout"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}

          <div className="px-3 py-2">
            <p className="text-[10px] text-neutral-600">Powered by <span className="text-neutral-500 font-medium">Movo</span></p>
          </div>
        </div>
      </aside>
    </>
  )
}
