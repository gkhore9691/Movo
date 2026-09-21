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
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 flex h-screen w-60 flex-col bg-[#0f1117] border-r border-white/[0.06] transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo / Brand */}
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <p className="font-bold text-lg text-white tracking-tight" style={{ fontFamily: 'Geist, Inter, sans-serif' }}>movo</p>
            {currentTenant?.name && (
              <p className="text-[13px] font-medium text-white/60 leading-tight mt-0.5">{currentTenant.name}</p>
            )}
            {currentTenant?.city && (
              <p className="text-[11px] text-white/30 mt-0.5">{currentTenant.city}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-white/40 hover:text-white/60 lg:hidden"
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
                    `relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors duration-150 ${
                      isActive
                        ? 'bg-[#6366f1]/10 text-[#6366f1] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-0.5 before:bg-[#6366f1] before:rounded-full'
                        : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
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
        <div className="border-t border-white/[0.06] px-2 py-2">
          {currentUser?.role === 'admin' && (
            <NavLink
              to="/admin"
              onClick={onClose}
              className={({ isActive }) =>
                `relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-[#6366f1]/10 text-[#6366f1] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-0.5 before:bg-[#6366f1] before:rounded-full'
                    : 'text-[#6366f1] hover:bg-white/[0.04]'
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
              `relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-[#6366f1]/10 text-[#6366f1] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-0.5 before:bg-[#6366f1] before:rounded-full'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
              }`
            }
          >
            <Settings size={16} className="shrink-0" />
            Settings
          </NavLink>

          {currentUser && (
            <div className="flex items-center gap-2 px-3 py-2 mt-1">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#6366f1] text-[10px] font-medium text-white">
                {getInitials(currentUser.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-white truncate">{currentUser.name}</p>
                <p className="text-[11px] text-white/30">{currentUser.role}</p>
              </div>
              <button
                onClick={() => {
                  logout()
                }}
                className="text-white/30 hover:text-white/50 transition-colors text-xs"
                title="Logout"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}

          <div className="px-3 py-2">
            <p className="text-[10px] text-white/20">Powered by <span className="font-medium">Movo</span></p>
          </div>
        </div>
      </aside>
    </>
  )
}
