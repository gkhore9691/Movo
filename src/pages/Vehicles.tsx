import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Car, Wrench, Crown, Calendar, Plus } from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import { Card, Stat, SearchInput, Badge, StatusBadge, Button, Modal } from '@/components/ui'
import { formatCurrency, formatRelativeDate } from '@/utils/format'

const MAKES = ['All', 'Volkswagen', 'Hyundai', 'BMW', 'Toyota', 'Tata', 'Mahindra', 'Honda', 'Kia', 'Maruti Suzuki', 'Mercedes-Benz']

export default function Vehicles() {
  const { vehicles, customers, jobs, getCustomer, addVehicle } = useApp()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [filterMake, setFilterMake] = useState('All')
  const [filterStatus, setFilterStatus] = useState<'all' | 'in_studio'>('all')

  const inStudioCount = vehicles.filter(v => v.currentJobId).length
  const premiumCount = vehicles.filter(v => ['BMW', 'Mercedes-Benz'].includes(v.make)).length

  const filtered = useMemo(() => {
    return vehicles.filter(v => {
      const customer = getCustomer(v.customerId)
      const q = search.toLowerCase()
      const matchesSearch = !search ||
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.registrationNumber.toLowerCase().includes(q) ||
        v.color.toLowerCase().includes(q) ||
        (customer?.name.toLowerCase().includes(q) ?? false)

      const matchesMake = filterMake === 'All' || v.make === filterMake
      const matchesStatus = filterStatus === 'all' || (filterStatus === 'in_studio' && v.currentJobId)

      return matchesSearch && matchesMake && matchesStatus
    })
  }, [vehicles, search, filterMake, filterStatus, getCustomer])

  function getVehicleSpend(vehicleId: string): number {
    return jobs
      .filter(j => j.vehicleId === vehicleId && j.status === 'delivered')
      .reduce((sum, j) => sum + (j.actualPrice ?? j.estimatedPrice), 0)
  }

  function getLastVisit(vehicleId: string): string | null {
    const delivered = jobs
      .filter(j => j.vehicleId === vehicleId && j.status === 'delivered')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    return delivered[0]?.updatedAt ?? null
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Vehicles</h1>
          <p className="text-sm text-slate-500 mt-0.5">{vehicles.length} registered vehicles</p>
        </div>
        <div className="flex items-center gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search vehicles..."
            className="w-72"
          />
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddVehicle(true)}>Add Vehicle</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Total Vehicles" value={vehicles.length} icon={<Car className="w-5 h-5" />} />
        <Stat label="In Studio" value={inStudioCount} icon={<Wrench className="w-5 h-5" />} />
        <Stat
          label="This Month"
          value={jobs.filter(j => {
            const d = new Date(j.createdAt)
            const now = new Date()
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
          }).length}
          icon={<Calendar className="w-5 h-5" />}
        />
        <Stat label="Premium" value={premiumCount} icon={<Crown className="w-5 h-5" />} />
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('in_studio')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              filterStatus === 'in_studio'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            In Studio
          </button>
        </div>
        <select
          value={filterMake}
          onChange={e => setFilterMake(e.target.value)}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {MAKES.map(m => (
            <option key={m} value={m}>{m === 'All' ? 'All Makes' : m}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(vehicle => {
          const customer = getCustomer(vehicle.customerId)
          const spend = getVehicleSpend(vehicle.id)
          const lastVisit = getLastVisit(vehicle.id)
          const activeJob = vehicle.currentJobId ? jobs.find(j => j.id === vehicle.currentJobId) : null

          return (
            <Card
              key={vehicle.id}
              onClick={() => navigate(`/vehicles/${vehicle.id}`)}
              className="relative"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: ['BMW', 'Mercedes-Benz'].includes(vehicle.make)
                        ? '#eef2ff' : '#f1f5f9'
                    }}
                  >
                    <Car className={`w-5 h-5 ${
                      ['BMW', 'Mercedes-Benz'].includes(vehicle.make)
                        ? 'text-indigo-600' : 'text-slate-500'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {vehicle.make} {vehicle.model}
                    </p>
                    <p className="text-xs text-slate-500">{vehicle.color}</p>
                  </div>
                </div>
                {activeJob && <StatusBadge status={activeJob.status} />}
              </div>

              <p className="text-sm font-mono font-semibold text-slate-700 mb-3 tracking-wider">
                {vehicle.registrationNumber}
              </p>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{customer?.name ?? 'Unknown'}</span>
                {spend > 0 && (
                  <span className="font-medium text-slate-700">{formatCurrency(spend)}</span>
                )}
              </div>

              {!activeJob && lastVisit && (
                <p className="text-xs text-slate-400 mt-2">
                  Last visit: {formatRelativeDate(lastVisit)}
                </p>
              )}

              {activeJob && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">In Studio</span>
                    <Badge variant="primary" size="sm">{formatCurrency(activeJob.estimatedPrice)}</Badge>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Car className="w-12 h-12 text-slate-300 mb-4" />
          <p className="text-sm font-medium text-slate-600">No vehicles found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters</p>
        </div>
      )}

      <AddVehicleModal
        open={showAddVehicle}
        onClose={() => setShowAddVehicle(false)}
        customers={customers}
        addVehicle={addVehicle}
      />
    </div>
  )
}

function AddVehicleModal({
  open,
  onClose,
  customers,
  addVehicle,
}: {
  open: boolean
  onClose: () => void
  customers: any[]
  addVehicle: (vehicle: any) => void
}) {
  const [customerId, setCustomerId] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [regNumber, setRegNumber] = useState('')
  const [color, setColor] = useState('')

  function reset() {
    setCustomerId('')
    setMake('')
    setModel('')
    setRegNumber('')
    setColor('')
  }

  function handleCreate() {
    if (!customerId || !make || !model) return
    addVehicle({
      id: `veh-${Date.now()}`,
      customerId,
      make,
      model,
      year: new Date().getFullYear(),
      registrationNumber: regNumber,
      color,
    })
    reset()
    onClose()
  }

  function handleClose() {
    reset()
    onClose()
  }

  const inputClass = "w-full rounded-lg border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add Vehicle"
      subtitle="Register a new vehicle"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!customerId || !make || !model}>Add Vehicle</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Customer *</label>
          <select value={customerId} onChange={e => setCustomerId(e.target.value)} className={inputClass}>
            <option value="">Select customer...</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Make *</label>
            <input value={make} onChange={e => setMake(e.target.value)} placeholder="e.g. Mahindra" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Model *</label>
            <input value={model} onChange={e => setModel(e.target.value)} placeholder="e.g. Thar" className={inputClass} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Registration No.</label>
          <input value={regNumber} onChange={e => setRegNumber(e.target.value)} placeholder="e.g. MP09-AB-1234" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Color</label>
          <input value={color} onChange={e => setColor(e.target.value)} placeholder="e.g. White" className={inputClass} />
        </div>
      </div>
    </Modal>
  )
}
