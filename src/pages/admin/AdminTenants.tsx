import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiAdminGetTenants } from '@/api/endpoints';

interface TenantRow {
  id: string;
  name: string;
  city: string;
  isActive: boolean;
  usersCount: number;
  jobsCount: number;
  createdAt: string;
}

export default function AdminTenants() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const data = await apiAdminGetTenants();
        setTenants(
          data.map((t: any) => ({
            id: t.id,
            name: t.name,
            city: t.city || '',
            isActive: t.isActive ?? true,
            usersCount: t.userCount ?? t.usersCount ?? 0,
            jobsCount: t.jobCount ?? t.jobsCount ?? 0,
            createdAt: t.createdAt,
          }))
        );
      } catch (err) {
        console.error('Failed to load tenants:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold text-white tracking-tight mb-6" style={{ fontFamily: 'Geist, Inter, sans-serif' }}>Tenants</h1>

      {loading ? (
        <div className="text-white/40 text-sm">Loading tenants...</div>
      ) : tenants.length === 0 ? (
        <div className="text-white/40 text-sm">No tenants found.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">City</th>
                <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">Users</th>
                <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">Jobs</th>
                <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">Created</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr
                  key={tenant.id}
                  onClick={() => navigate(`/admin/tenants/${tenant.id}`)}
                  className="border-b border-white/[0.04] bg-[#181b25] hover:bg-white/[0.04] cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-medium text-white">{tenant.name}</td>
                  <td className="px-4 py-3 text-sm text-white/50">{tenant.city || '-'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        tenant.isActive
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {tenant.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-white/50">{tenant.usersCount}</td>
                  <td className="px-4 py-3 text-sm text-white/50">{tenant.jobsCount}</td>
                  <td className="px-4 py-3 text-sm text-white/30">
                    {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
