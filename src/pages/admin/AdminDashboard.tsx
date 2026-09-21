import { useState, useEffect } from 'react';
import { Building2, Users, Wrench, DollarSign } from 'lucide-react';
import { apiAdminGetStats } from '@/api/endpoints';

interface AdminStats {
  totalTenants: number;
  totalUsers: number;
  totalJobs: number;
  totalRevenue: number;
}

const defaultStats: AdminStats = {
  totalTenants: 0,
  totalUsers: 0,
  totalJobs: 0,
  totalRevenue: 0,
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>(defaultStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiAdminGetStats();
        setStats({
          totalTenants: data.totalTenants ?? 0,
          totalUsers: data.totalUsers ?? 0,
          totalJobs: data.totalJobs ?? 0,
          totalRevenue: data.totalRevenue ?? 0,
        });
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const cards = [
    { label: 'Total Tenants', value: stats.totalTenants, icon: Building2, color: 'text-indigo-400' },
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-emerald-400' },
    { label: 'Total Jobs', value: stats.totalJobs, icon: Wrench, color: 'text-amber-400' },
    { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`, icon: DollarSign, color: 'text-cyan-400' },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-6">Dashboard</h1>

      {loading ? (
        <div className="text-neutral-500 text-sm">Loading stats...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  {card.label}
                </span>
                <card.icon size={18} className={card.color} />
              </div>
              <p className="text-2xl font-semibold text-white">{card.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
