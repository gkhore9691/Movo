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
    <div className="flex h-screen bg-[#0f1117]">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col bg-[#0f1117] border-r border-white/[0.06]">
        {/* Brand */}
        <div className="px-4 py-4">
          <p className="font-bold text-lg text-white tracking-tight" style={{ fontFamily: 'Geist, Inter, sans-serif' }}>movo</p>
          <p className="text-[13px] font-medium text-white/60 mt-0.5">System Administration</p>
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
        <div className="border-t border-white/[0.06] px-2 py-2 space-y-1">
          <button
            onClick={() => navigate('/')}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-white/40 hover:text-white/60 hover:bg-white/[0.04] transition-colors duration-150"
          >
            <ArrowLeft size={16} className="shrink-0" />
            Back to App
          </button>

          {currentUser && (
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#6366f1] text-[10px] font-medium text-white">
                {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-white truncate">{currentUser.name}</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-white/30 hover:text-white/50 transition-colors"
                title="Logout"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
