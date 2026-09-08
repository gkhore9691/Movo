import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '@/contexts/AppContext'
import { Card, Badge, Avatar, Stat, SearchInput, Button, Modal, Input } from '@/components/ui'
import { formatCurrency, formatRelativeDate } from '@/utils/format'
import { Users, UserPlus, ArrowRight, Crown, Sparkles, Clock } from 'lucide-react'

type FilterType = 'all' | 'premium' | 'new' | 'inactive'

export default function Customers() {
  const { customers, vehicles, jobs, addCustomer } = useApp()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')

  const handleAddCustomer = () => {
    if (!newName.trim()) return
    addCustomer({
      id: 'cust-' + Date.now(),
      name: newName.trim(),
      phone: newPhone.trim() || '+91 00000 00000',
      email: newEmail.trim(),
      address: '',
      customerSince: new Date().toISOString(),
      lifetimeSpend: 0,
      notes: '',
      tags: ['new'],
    })
    setNewName('')
    setNewPhone('')
    setNewEmail('')
    setShowAddModal(false)
  }

  const customerVehicles = useMemo(() => {
    const map: Record<string, typeof vehicles> = {}
    for (const v of vehicles) {
      if (!map[v.customerId]) map[v.customerId] = []
      map[v.customerId].push(v)
    }
    return map
  }, [vehicles])

  const lastVisitMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const j of jobs) {
      if (j.status === 'delivered') {
        const delivered = j.timeline.find(t => t.stage === 'delivered')
        if (delivered) {
          if (!map[j.customerId] || delivered.timestamp > map[j.customerId]) {
            map[j.customerId] = delivered.timestamp
          }
        }
      }
    }
    return map
  }, [jobs])

  const filtered = useMemo(() => {
    let list = customers

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c => {
        const cvs = customerVehicles[c.id] || []
        return (
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          cvs.some(v => v.registrationNumber.toLowerCase().includes(q))
        )
      })
    }

    if (filter === 'premium') {
      list = list.filter(c => c.lifetimeSpend > 50000)
    } else if (filter === 'new') {
      const currentYear = new Date().getFullYear().toString()
      list = list.filter(c => c.customerSince.startsWith(currentYear))
    } else if (filter === 'inactive') {
      const ninetyDaysAgo = Date.now() - 90 * 86400000
      list = list.filter(c => {
        const lv = lastVisitMap[c.id]
        return !lv || new Date(lv).getTime() < ninetyDaysAgo
      })
    }

    return list
  }, [customers, search, filter, customerVehicles, lastVisitMap])

  const stats = useMemo(() => {
    const currentYear = new Date().getFullYear().toString()
    const newThisMonth = customers.filter(c => {
      const d = new Date(c.customerSince)
      return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear()
    }).length
    const repeat = customers.filter(c => c.tags.includes('repeat')).length
    const avgSpend = customers.length
      ? Math.round(customers.reduce((s, c) => s + c.lifetimeSpend, 0) / customers.length)
      : 0
    return { total: customers.length, newThisMonth, repeat, avgSpend }
  }, [customers])

  const filters: { key: FilterType; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All', icon: <Users className="w-3.5 h-3.5" /> },
    { key: 'premium', label: 'Premium', icon: <Crown className="w-3.5 h-3.5" /> },
    { key: 'new', label: 'New', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { key: 'inactive', label: 'Inactive', icon: <Clock className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your customer relationships</p>
        </div>
        <Button icon={<UserPlus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>Add Customer</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total Customers" value={stats.total} icon={<Users className="w-5 h-5" />} />
        <Stat label="New This Month" value={stats.newThisMonth} icon={<Sparkles className="w-5 h-5" />} />
        <Stat label="Repeat Customers" value={stats.repeat} icon={<Crown className="w-5 h-5" />} />
        <Stat label="Avg. Lifetime Spend" value={formatCurrency(stats.avgSpend)} />
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, phone, or vehicle..."
          className="w-full sm:w-80"
        />
        <div className="flex items-center gap-1.5">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150 ${
                filter === f.key
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-transparent'
              }`}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Users className="w-10 h-10 text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-500">No customers found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(customer => {
            const cvs = customerVehicles[customer.id] || []
            const lastVisit = lastVisitMap[customer.id]

            return (
              <Link key={customer.id} to={`/customers/${customer.id}`}>
                <Card className="group h-full">
                  <div className="flex items-start gap-3">
                    <Avatar name={customer.name} size="lg" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                          {customer.name}
                        </h3>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{customer.phone}</p>

                      {cvs.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {cvs.slice(0, 2).map(v => (
                            <p key={v.id} className="text-xs text-slate-600">
                              {v.make} {v.model}
                              <span className="text-slate-400 ml-1.5">{v.registrationNumber}</span>
                            </p>
                          ))}
                          {cvs.length > 2 && (
                            <p className="text-xs text-slate-400">+{cvs.length - 2} more</p>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {customer.tags.slice(0, 3).map(tag => (
                          <Badge
                            key={tag}
                            size="sm"
                            variant={
                              tag === 'vip' || tag === 'premium'
                                ? 'warning'
                                : tag === 'new'
                                ? 'primary'
                                : tag === 'repeat'
                                ? 'success'
                                : 'default'
                            }
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                        <span className="text-xs font-medium text-slate-900">
                          {formatCurrency(customer.lifetimeSpend)}
                        </span>
                        <span className="text-xs text-slate-400">
                          {lastVisit ? formatRelativeDate(lastVisit) : `Since ${new Date(customer.customerSince).getFullYear()}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Customer"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddCustomer} disabled={!newName.trim()}>Add Customer</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Name" placeholder="Customer name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Input label="Phone" placeholder="+91 98765 43210" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
          <Input label="Email" placeholder="email@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
        </div>
      </Modal>
    </div>
  )
}
