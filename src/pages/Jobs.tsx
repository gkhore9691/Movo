import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, Phone, MessageSquare,
  List, LayoutGrid,
} from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import { Button, Modal, Avatar, StatusBadge } from '@/components/ui'
import { formatCurrency, formatRelativeDate, formatDate, getInitials } from '@/utils/format'
import type { Job, JobStatus } from '@/types'

const JOB_STAGES: { key: JobStatus; label: string }[] = [
  { key: 'enquiry', label: 'Enquiry' },
  { key: 'booked', label: 'Booked' },
  { key: 'car_received', label: 'Car Received' },
  { key: 'inspection', label: 'Inspection' },
  { key: 'work_in_progress', label: 'In Progress' },
  { key: 'quality_check', label: 'QC' },
  { key: 'ready', label: 'Ready' },
  { key: 'delivered', label: 'Delivered' },
]

function getNextStage(status: JobStatus): JobStatus | null {
  const idx = JOB_STAGES.findIndex(s => s.key === status)
  if (idx < 0 || idx >= JOB_STAGES.length - 1) return null
  return JOB_STAGES[idx + 1].key
}

function getStageName(status: JobStatus): string {
  return JOB_STAGES.find(s => s.key === status)?.label ?? status
}

function stageLeftBorder(status: JobStatus): string {
  if (['ready', 'delivered'].includes(status)) return 'border-l-emerald-300'
  if (['car_received', 'inspection', 'work_in_progress', 'quality_check'].includes(status)) return 'border-l-indigo-300'
  return 'border-l-neutral-200'
}

type FilterMode = 'all' | 'active' | 'completed'
type ViewMode = 'pipeline' | 'list'

export default function Jobs() {
  const { jobs, updateJobStatus, getCustomer, getVehicle, getService, getStaffMember } = useApp()
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('pipeline')

  const filteredJobs = useMemo(() => {
    switch (filterMode) {
      case 'active':
        return jobs.filter(j => ['car_received', 'inspection', 'work_in_progress', 'quality_check'].includes(j.status))
      case 'completed':
        return jobs.filter(j => j.status === 'delivered')
      default:
        return jobs
    }
  }, [jobs, filterMode])

  const activeCount = useMemo(() =>
    jobs.filter(j => !['enquiry', 'delivered'].includes(j.status)).length
  , [jobs])

  const handleAdvance = (job: Job, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const next = getNextStage(job.status)
    if (next) {
      updateJobStatus(job.id, next)
      if (selectedJob?.id === job.id) {
        setSelectedJob({ ...job, status: next })
      }
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-neutral-900">Jobs</h2>
            <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-md">{activeCount} active</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter */}
          <div className="flex text-sm">
            {(['all', 'active', 'completed'] as FilterMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  filterMode === mode
                    ? 'text-neutral-900'
                    : 'text-neutral-400 hover:text-neutral-600'
                }`}
              >
                {mode === 'active' ? 'Active' : mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          {/* View toggle */}
          <div className="flex items-center border border-neutral-200 rounded-lg">
            <button
              onClick={() => setViewMode('pipeline')}
              className={`p-1.5 rounded-l-lg transition-colors cursor-pointer ${
                viewMode === 'pipeline' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-r-lg transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'pipeline' ? (
        <PipelineView
          jobs={filteredJobs}
          getCustomer={getCustomer}
          getVehicle={getVehicle}
          getService={getService}
          getStaffMember={getStaffMember}
          onSelectJob={setSelectedJob}
          onAdvance={handleAdvance}
        />
      ) : (
        <ListView
          jobs={filteredJobs}
          getCustomer={getCustomer}
          getVehicle={getVehicle}
          getService={getService}
          getStaffMember={getStaffMember}
          onSelectJob={setSelectedJob}
        />
      )}

      <JobDetailModal
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        getCustomer={getCustomer}
        getVehicle={getVehicle}
        getService={getService}
        getStaffMember={getStaffMember}
        onAdvance={handleAdvance}
      />
    </div>
  )
}

/* ──── Pipeline View ──── */

interface PipelineViewProps {
  jobs: Job[]
  getCustomer: (id: string) => any
  getVehicle: (id: string) => any
  getService: (id: string) => any
  getStaffMember: (id: string) => any
  onSelectJob: (job: Job) => void
  onAdvance: (job: Job, e?: React.MouseEvent) => void
}

function PipelineView({ jobs, getCustomer, getVehicle, getService, getStaffMember, onSelectJob, onAdvance }: PipelineViewProps) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3" style={{ minWidth: '1200px' }}>
        {JOB_STAGES.map((stage, stageIdx) => {
          const stageJobs = jobs.filter(j => j.status === stage.key)
          return (
            <div key={stage.key} className={`flex-1 min-w-[150px] ${stageIdx < JOB_STAGES.length - 1 ? 'border-r border-neutral-100 pr-3' : ''}`}>
              {/* Column header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  {stage.label}
                </span>
                <span className="text-xs text-neutral-400">{stageJobs.length}</span>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {stageJobs.map(job => {
                    const vehicle = getVehicle(job.vehicleId)
                    const customer = getCustomer(job.customerId)
                    const staffMember = getStaffMember(job.assignedTo)
                    const primaryService = job.serviceIds[0] ? getService(job.serviceIds[0]) : null
                    const nextStage = getNextStage(job.status)

                    return (
                      <motion.div
                        key={job.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => onSelectJob(job)}
                        className={`group bg-white rounded-lg border border-neutral-200 border-l-[3px] ${stageLeftBorder(job.status)} p-3 cursor-pointer transition-colors hover:border-neutral-300`}
                      >
                        <p className="text-sm font-medium text-neutral-900">
                          {vehicle ? `${vehicle.make} ${vehicle.model}` : 'Unknown'}
                        </p>
                        <p className="font-mono text-xs text-neutral-400 mt-0.5">{vehicle?.registrationNumber}</p>
                        <p className="text-xs text-neutral-500 mt-1.5">{customer?.name}</p>
                        <p className="text-xs text-neutral-500">{primaryService?.name}</p>

                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-100">
                          <div className="flex items-center gap-1.5">
                            {staffMember && (
                              <span className="text-xs text-neutral-400">{staffMember.name.split(' ')[0]}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-neutral-900 tabular-nums">
                              {formatCurrency(job.estimatedPrice)}
                            </span>
                            {nextStage && (
                              <button
                                onClick={(e) => onAdvance(job, e)}
                                className="text-xs text-neutral-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                title={`Advance to ${getStageName(nextStage)}`}
                              >
                                →
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>

                {stageJobs.length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-xs text-neutral-400">No jobs</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ──── List View ──── */

interface ListViewProps {
  jobs: Job[]
  getCustomer: (id: string) => any
  getVehicle: (id: string) => any
  getService: (id: string) => any
  getStaffMember: (id: string) => any
  onSelectJob: (job: Job) => void
}

function ListView({ jobs, getCustomer, getVehicle, getService, getStaffMember, onSelectJob }: ListViewProps) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-neutral-100">
            <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500">Vehicle</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500">Customer</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500">Service</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500">Status</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500">Assigned</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500">Price</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500">Updated</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map(job => {
            const vehicle = getVehicle(job.vehicleId)
            const customer = getCustomer(job.customerId)
            const staffMember = getStaffMember(job.assignedTo)
            const primaryService = job.serviceIds[0] ? getService(job.serviceIds[0]) : null
            return (
              <tr
                key={job.id}
                onClick={() => onSelectJob(job)}
                className="cursor-pointer border-b border-neutral-50 hover:bg-neutral-50 transition-colors"
              >
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-neutral-900">{vehicle ? `${vehicle.make} ${vehicle.model}` : '—'}</p>
                  <p className="font-mono text-xs text-neutral-400 mt-0.5">{vehicle?.registrationNumber}</p>
                </td>
                <td className="px-4 py-3 text-sm text-neutral-600">{customer?.name}</td>
                <td className="px-4 py-3 text-sm text-neutral-600">{primaryService?.name}</td>
                <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                <td className="px-4 py-3 text-sm text-neutral-600">{staffMember?.name}</td>
                <td className="px-4 py-3 text-right text-sm font-medium text-neutral-900 tabular-nums">{formatCurrency(job.estimatedPrice)}</td>
                <td className="px-4 py-3 text-xs text-neutral-400">{formatRelativeDate(job.updatedAt)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {jobs.length === 0 && (
        <div className="py-12 text-center text-sm text-neutral-400">No jobs match the current filter</div>
      )}
    </div>
  )
}

/* ──── Job Detail Modal ──── */

interface JobDetailModalProps {
  job: Job | null
  onClose: () => void
  getCustomer: (id: string) => any
  getVehicle: (id: string) => any
  getService: (id: string) => any
  getStaffMember: (id: string) => any
  onAdvance: (job: Job) => void
}

function JobDetailModal({ job, onClose, getCustomer, getVehicle, getService, getStaffMember, onAdvance }: JobDetailModalProps) {
  const { jobs } = useApp()
  const currentJob = job ? jobs.find(j => j.id === job.id) ?? job : null
  const vehicle = currentJob ? getVehicle(currentJob.vehicleId) : null
  const customer = currentJob ? getCustomer(currentJob.customerId) : null
  const staffMember = currentJob ? getStaffMember(currentJob.assignedTo) : null
  const nextStage = currentJob ? getNextStage(currentJob.status) : null

  return (
    <Modal
      open={!!currentJob}
      onClose={onClose}
      size="xl"
      title={vehicle ? `${vehicle.make} ${vehicle.model}` : 'Job Details'}
      subtitle={`${vehicle?.registrationNumber ?? ''} · ${customer?.name ?? ''}`}
      footer={
        currentJob && (
          <div className="flex items-center gap-2 w-full">
            <span className="text-xs text-neutral-400 mr-auto">Created {formatDate(currentJob.createdAt)}</span>
            <Button
              variant="secondary" size="sm" icon={<Phone className="w-3.5 h-3.5" />}
              onClick={() => customer?.phone && window.open(`tel:${customer.phone}`)}
            >Contact</Button>
            <Button
              variant="secondary" size="sm" icon={<MessageSquare className="w-3.5 h-3.5" />}
              onClick={() => {
                const note = prompt('Add a note:')
                if (note) alert('Note saved: ' + note)
              }}
            >Note</Button>
            {nextStage && (
              <Button size="sm" icon={<ChevronRight className="w-3.5 h-3.5" />} onClick={() => onAdvance(currentJob)}>
                Advance to {getStageName(nextStage)}
              </Button>
            )}
          </div>
        )
      }
    >
      {currentJob && (
        <div className="space-y-6">
          {/* Journey Stepper */}
          <JourneyStepper currentStatus={currentJob.status} />

          {/* Details */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <p className="text-xs text-neutral-500 mb-1">Services</p>
              <p className="text-sm text-neutral-900">
                {currentJob.serviceIds.map(sid => getService(sid)?.name).filter(Boolean).join(', ')}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Assigned to</p>
              {staffMember && (
                <div className="flex items-center gap-2">
                  <Avatar name={staffMember.name} size="sm" />
                  <p className="text-sm text-neutral-900">{staffMember.name}</p>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Estimated</p>
              <p className="text-sm font-medium text-neutral-900 tabular-nums">{formatCurrency(currentJob.estimatedPrice)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Deposit</p>
              <p className="text-sm font-medium text-neutral-900 tabular-nums">{formatCurrency(currentJob.deposit)}</p>
            </div>
            {currentJob.notes && (
              <div className="col-span-2">
                <p className="text-xs text-neutral-500 mb-1">Notes</p>
                <p className="text-sm text-neutral-700">{currentJob.notes}</p>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div>
            <p className="text-xs font-medium text-neutral-500 mb-3">Timeline</p>
            <div className="relative ml-2">
              {[...currentJob.timeline].reverse().map((entry, i) => {
                const emp = getStaffMember(entry.employeeId)
                const isCurrent = i === 0
                const isLast = i === currentJob.timeline.length - 1
                return (
                  <div key={i} className="flex gap-3 relative">
                    {!isLast && (
                      <div className="absolute left-[3px] top-4 w-px h-[calc(100%-4px)] bg-neutral-200" />
                    )}
                    <div className="relative z-10 shrink-0 mt-1.5">
                      <div className={`w-[7px] h-[7px] rounded-full ${isCurrent ? 'bg-indigo-600' : 'bg-neutral-400'}`} />
                    </div>
                    <div className="pb-4">
                      <p className={`text-sm ${isCurrent ? 'font-medium text-neutral-900' : 'text-neutral-600'}`}>
                        {getStageName(entry.stage as JobStatus)}
                      </p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {formatRelativeDate(entry.timestamp)}
                        {emp && ` · ${emp.name}`}
                      </p>
                      {entry.notes && <p className="text-xs text-neutral-500 mt-1">{entry.notes}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

/* ──── Journey Stepper ──── */

function JourneyStepper({ currentStatus }: { currentStatus: JobStatus }) {
  const currentIdx = JOB_STAGES.findIndex(s => s.key === currentStatus)

  return (
    <div className="flex items-center w-full py-2">
      {JOB_STAGES.map((stage, i) => {
        const isCompleted = i < currentIdx
        const isCurrent = i === currentIdx
        return (
          <div key={stage.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${
                isCompleted ? 'bg-neutral-900' : isCurrent ? 'bg-indigo-600' : 'bg-neutral-200'
              }`} />
              <span className={`text-[10px] text-center leading-tight ${
                isCurrent ? 'text-neutral-900 font-medium' : isCompleted ? 'text-neutral-600' : 'text-neutral-400'
              }`}>
                {stage.label}
              </span>
            </div>
            {i < JOB_STAGES.length - 1 && (
              <div className={`flex-1 h-px mx-1.5 mt-[-14px] ${
                isCompleted ? 'bg-neutral-900' : 'border-t border-dashed border-neutral-200'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
