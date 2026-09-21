import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { apiAdminGetTenant, apiAdminUpdateTenant } from '@/api/endpoints';

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  industry: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  gstNumber: string;
  isActive: boolean;
  usersCount: number;
  jobsCount: number;
  customersCount: number;
}

export default function AdminTenantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const data = await apiAdminGetTenant(id);
        setTenant({
          id: data.id,
          name: data.name,
          slug: data.slug || '',
          industry: data.industry || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          gstNumber: data.gstNumber || '',
          isActive: data.isActive ?? true,
          usersCount: data.usersCount ?? data._count?.users ?? 0,
          jobsCount: data.jobsCount ?? data._count?.jobs ?? 0,
          customersCount: data.customersCount ?? data._count?.customers ?? 0,
        });
      } catch (err) {
        console.error('Failed to load tenant:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleToggleActive() {
    if (!tenant || !id) return;
    setToggling(true);
    try {
      await apiAdminUpdateTenant(id, { isActive: !tenant.isActive });
      setTenant((prev) => prev ? { ...prev, isActive: !prev.isActive } : prev);
    } catch (err) {
      console.error('Failed to toggle tenant:', err);
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return <div className="text-neutral-500 text-sm">Loading tenant...</div>;
  }

  if (!tenant) {
    return <div className="text-neutral-500 text-sm">Tenant not found.</div>;
  }

  const infoFields = [
    { label: 'Name', value: tenant.name },
    { label: 'Industry', value: tenant.industry },
    { label: 'Email', value: tenant.email },
    { label: 'Phone', value: tenant.phone },
    { label: 'City', value: tenant.city },
    { label: 'State', value: tenant.state },
    { label: 'Address', value: tenant.address },
    { label: 'GST Number', value: tenant.gstNumber },
  ];

  return (
    <div>
      <button
        onClick={() => navigate('/admin/tenants')}
        className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-300 transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Back to Tenants
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">{tenant.name}</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{tenant.slug}</p>
        </div>
        <button
          onClick={handleToggleActive}
          disabled={toggling}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
            tenant.isActive
              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
          }`}
        >
          {toggling
            ? 'Updating...'
            : tenant.isActive
              ? 'Deactivate'
              : 'Activate'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Users', value: tenant.usersCount },
          { label: 'Jobs', value: tenant.jobsCount },
          { label: 'Customers', value: tenant.customersCount },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
          >
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
              {stat.label}
            </p>
            <p className="text-xl font-semibold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Business Info */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="text-sm font-medium text-white mb-4">Business Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {infoFields.map((field) => (
            <div key={field.label}>
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                {field.label}
              </p>
              <p className="text-sm text-neutral-300 mt-1">{field.value || '-'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
