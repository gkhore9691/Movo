import { useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Car, Wrench, Calendar, Camera, IndianRupee, Pencil } from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import { Card, CardHeader, Button, Avatar, Stat, StatusBadge, Badge, StepProgress, EmptyState, Input, Modal } from '@/components/ui'
import { formatCurrency, formatDate, formatRelativeDate } from '@/utils/format'
import type { JobStatus } from '@/types'

const JOB_STAGES: JobStatus[] = ['enquiry', 'booked', 'car_received', 'inspection', 'work_in_progress', 'quality_check', 'ready', 'delivered']

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { vehicles, jobs, services, getCustomer, getStaffMember, getService, updateVehicle } = useApp()
  const [showEditModal, setShowEditModal] = useState(false)

  const vehicle = vehicles.find(v => v.id === id)
  const customer = vehicle ? getCustomer(vehicle.customerId) : undefined

  const vehicleJobs = useMemo(() => {
    if (!vehicle) return []
    return jobs
      .filter(j => j.vehicleId === vehicle.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [vehicle, jobs])

  const activeJob = vehicle?.currentJobId ? jobs.find(j => j.id === vehicle.currentJobId) : null

  const totalSpend = vehicleJobs
    .filter(j => j.status === 'delivered')
    .reduce((sum, j) => sum + (j.actualPrice ?? j.estimatedPrice), 0)

  const totalVisits = vehicleJobs.filter(j => j.status === 'delivered').length

  const lastVisit = vehicleJobs.find(j => j.status === 'delivered')?.updatedAt

  if (!vehicle) {
    return (
      <div className="flex items-center justify-center py-20">
        <EmptyState
          icon={<Car className="w-12 h-12" />}
          title="Vehicle not found"
          action={{ label: 'Back to Vehicles', onClick: () => navigate('/vehicles') }}
        />
      </div>
    )
  }

  const recommendedService = (() => {
    const lastJob = vehicleJobs.find(j => j.status === 'delivered')
    if (!lastJob) return { name: 'Full Detailing', reason: 'First service recommended' }
    const lastSvc = getService(lastJob.serviceIds[0])
    if (lastSvc?.category === 'Protection') return { name: 'Maintenance Wash', reason: 'Post-protection maintenance' }
    if (lastSvc?.category === 'Detailing') return { name: 'Ceramic Coating', reason: 'Upgrade protection after detailing' }
    return { name: 'Full Detailing', reason: 'Regular maintenance' }
  })()

  return (
    <div>
      <button
        onClick={() => navigate('/vehicles')}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 cursor-pointer transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Vehicles
      </button>

      <div className="mb-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center">
            <Car className="w-7 h-7 text-slate-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-slate-900">
                {vehicle.make} {vehicle.model}
              </h1>
              {activeJob && <StatusBadge status={activeJob.status} />}
            </div>
            <p className="text-lg font-mono font-semibold text-slate-600 mt-1 tracking-wider">
              {vehicle.registrationNumber}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className="w-3 h-3 rounded-full border border-slate-200"
                style={{ backgroundColor: vehicle.color.toLowerCase().includes('white') ? '#f8fafc' : vehicle.color.toLowerCase().includes('black') ? '#1e293b' : vehicle.color.toLowerCase().includes('grey') || vehicle.color.toLowerCase().includes('silver') ? '#94a3b8' : vehicle.color.toLowerCase().includes('red') ? '#ef4444' : vehicle.color.toLowerCase().includes('blue') ? '#3b82f6' : vehicle.color.toLowerCase().includes('purple') ? '#8b5cf6' : vehicle.color.toLowerCase().includes('beige') ? '#d4a574' : '#94a3b8' }}
              />
              <span className="text-sm text-slate-500">{vehicle.color}</span>
            </div>
            {customer && (
              <Link
                to={`/customers/${customer.id}`}
                className="inline-flex items-center gap-2 mt-3 group"
              >
                <Avatar name={customer.name} size="sm" />
                <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">
                  {customer.name}
                </span>
              </Link>
            )}
            <div className="mt-3">
              <Button variant="secondary" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => setShowEditModal(true)}>
                Edit Vehicle
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Total Spend" value={formatCurrency(totalSpend)} icon={<IndianRupee className="w-5 h-5" />} />
        <Stat label="Total Visits" value={totalVisits} icon={<Calendar className="w-5 h-5" />} />
        <Stat label="Last Visit" value={lastVisit ? formatRelativeDate(lastVisit) : 'Never'} icon={<Calendar className="w-5 h-5" />} />
        <Stat label="Status" value={activeJob ? 'In Studio' : 'Not in Studio'} icon={<Wrench className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader title="Service History" subtitle={`${vehicleJobs.length} jobs`} />
            {vehicleJobs.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No service history yet</p>
            ) : (
              <div className="space-y-3">
                {vehicleJobs.map(job => {
                  const svcNames = job.serviceIds.map(id => getService(id)?.name ?? 'Unknown').join(', ')
                  const tech = getStaffMember(job.assignedTo)
                  return (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0">
                          <StatusBadge status={job.status} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{svcNames}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-500">{formatDate(job.createdAt)}</span>
                            {tech && <span className="text-xs text-slate-400">· {tech.name}</span>}
                          </div>
                          {job.notes && (
                            <p className="text-xs text-slate-400 mt-0.5 truncate">{job.notes}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-700 shrink-0 ml-3">
                        {formatCurrency(job.actualPrice ?? job.estimatedPrice)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Before / After Gallery" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {vehicleJobs.slice(0, 3).flatMap(job => {
                const svcName = getService(job.serviceIds[0])?.name ?? 'Service'
                return [
                  <div
                    key={`${job.id}-before`}
                    className="aspect-[4/3] rounded-lg bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2"
                  >
                    <Camera className="w-6 h-6 text-slate-300" />
                    <span className="text-xs text-slate-400 text-center px-2">{svcName} — Before</span>
                    <span className="text-[10px] text-slate-300">{formatDate(job.createdAt)}</span>
                  </div>,
                  <div
                    key={`${job.id}-after`}
                    className="aspect-[4/3] rounded-lg bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2"
                  >
                    <Camera className="w-6 h-6 text-slate-300" />
                    <span className="text-xs text-slate-400 text-center px-2">{svcName} — After</span>
                    <span className="text-[10px] text-slate-300">{formatDate(job.updatedAt)}</span>
                  </div>,
                ]
              })}
              {vehicleJobs.length === 0 && (
                <div className="col-span-full py-8 text-center">
                  <Camera className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No photos yet</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {activeJob && (
            <Card className="border-indigo-200 bg-indigo-50/30">
              <CardHeader title="Current Job" />
              <div className="space-y-3">
                <StatusBadge status={activeJob.status} />
                <p className="text-sm font-medium text-slate-900">
                  {activeJob.serviceIds.map(id => getService(id)?.name).join(', ')}
                </p>
                <StepProgress
                  current={JOB_STAGES.indexOf(activeJob.status)}
                  total={JOB_STAGES.length}
                />
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Started {formatRelativeDate(activeJob.createdAt)}</span>
                  <span className="font-medium text-slate-700">
                    {formatCurrency(activeJob.estimatedPrice)}
                  </span>
                </div>
                {activeJob.assignedTo && (
                  <div className="flex items-center gap-2 pt-2 border-t border-indigo-100">
                    <Avatar name={getStaffMember(activeJob.assignedTo)?.name ?? ''} size="sm" />
                    <span className="text-xs text-slate-600">
                      {getStaffMember(activeJob.assignedTo)?.name}
                    </span>
                  </div>
                )}
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => navigate('/jobs')}
                >
                  View Job
                </Button>
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Recommended Next Service" />
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                <p className="text-sm font-semibold text-emerald-800">{recommendedService.name}</p>
                <p className="text-xs text-emerald-600 mt-0.5">{recommendedService.reason}</p>
              </div>
              <Button variant="secondary" size="sm" className="w-full" onClick={() => navigate('/bookings')}>
                Schedule Now
              </Button>
            </div>
          </Card>

          <VehicleNotes defaultValue={customer?.notes ?? ''} />
        </div>
      </div>

      {vehicle && (
        <EditVehicleModal
          vehicle={vehicle}
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={async (id, data) => { await updateVehicle(id, data); setShowEditModal(false) }}
        />
      )}
    </div>
  )
}

function VehicleNotes({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue)
  return (
    <Card>
      <CardHeader title="Vehicle Notes" />
      <textarea
        className="w-full text-sm text-slate-600 border border-slate-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        rows={4}
        placeholder="Add notes about this vehicle..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <p className="text-xs text-slate-400 mt-2">Local scratchpad only — not saved to server</p>
    </Card>
  )
}

function EditVehicleModal({
  vehicle,
  open,
  onClose,
  onSave,
}: {
  vehicle: { id: string; make: string; model: string; year: number; registrationNumber: string; color: string }
  open: boolean
  onClose: () => void
  onSave: (id: string, data: any) => Promise<void>
}) {
  const [make, setMake] = useState(vehicle.make)
  const [model, setModel] = useState(vehicle.model)
  const [regNumber, setRegNumber] = useState(vehicle.registrationNumber)
  const [color, setColor] = useState(vehicle.color)

  const inputClass = "w-full rounded-lg border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Vehicle"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(vehicle.id, { make, model, registrationNumber: regNumber, color })}>Save Changes</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Make</label>
            <input value={make} onChange={e => setMake(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Model</label>
            <input value={model} onChange={e => setModel(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Registration No.</label>
          <input value={regNumber} onChange={e => setRegNumber(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Color</label>
          <input value={color} onChange={e => setColor(e.target.value)} className={inputClass} />
        </div>
      </div>
    </Modal>
  )
}
