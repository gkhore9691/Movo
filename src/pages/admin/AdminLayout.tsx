import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, ArrowLeft, LogOut } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

const adminNav = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/admin', end: true },
  { label: 'Tenants', icon: Building2, to: '/admin/tenants', end: false },
];

export default function AdminLayout() {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
  }

  return (
    <div className="flex h-screen bg-neutral-950">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col bg-neutral-900 border-r border-neutral-800">
        {/* Brand */}
        <div className="px-4 py-4">
          <p className="text-sm font-semibold text-white leading-tight">Movo Admin</p>
          <p className="text-[11px] text-neutral-500 mt-0.5">System Administration</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <ul className="space-y-0.5">
            {adminNav.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
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
        <div className="border-t border-neutral-800 px-2 py-2 space-y-1">
          <button
            onClick={() => navigate('/')}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-neutral-500 hover:text-neutral-300 transition-colors duration-150"
          >
            <ArrowLeft size={16} className="shrink-0" />
            Back to App
          </button>

          {currentUser && (
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-medium text-white">
                {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-neutral-300 truncate">{currentUser.name}</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-neutral-600 hover:text-neutral-400 transition-colors"
                title="Logout"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
