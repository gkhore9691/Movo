import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Phone, Mail, Wrench, ChevronDown, Users, Pencil } from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import { Card, Button, Badge, Stat, Avatar, Modal, Input, Select } from '@/components/ui'
import { formatPhone } from '@/utils/format'

const roleBadgeColors: Record<string, 'primary' | 'default' | 'success' | 'warning'> = {
  owner: 'primary',
  manager: 'primary',
  sales: 'warning',
  technician: 'success',
}

const roleLabels: Record<string, string> = {
  owner: 'Owner',
  manager: 'Manager',
  sales: 'Sales',
  technician: 'Technician',
}

export default function Staff() {
  const { staff, jobs, getVehicle, getService, addStaffMember, updateStaff } = useApp()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<any>(null)
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('technician')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')

  const handleAddMember = () => {
    if (!newName.trim()) return
    addStaffMember({
      id: 'staff-' + Date.now(),
      name: newName.trim(),
      role: newRole as 'owner' | 'manager' | 'sales' | 'technician',
      phone: newPhone.trim() || '+91 00000 00000',
      email: newEmail.trim(),
      avatar: '',
      activeJobs: 0,
      completedJobs: 0,
    })
    setNewName('')
    setNewPhone('')
    setNewEmail('')
    setNewRole('technician')
    setShowAddModal(false)
  }

  const technicians = staff.filter(s => s.role === 'technician')
  const activeJobsToday = staff.reduce((sum, s) => sum + s.activeJobs, 0)
  const completedThisMonth = staff.reduce((sum, s) => sum + s.completedJobs, 0)
  const maxCompleted = Math.max(...staff.map(s => s.completedJobs))

  const getStaffJobs = (staffId: string) =>
    jobs.filter(j => j.assignedTo === staffId && j.status !== 'delivered')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Staff</h1>
          <p className="text-sm text-white/40 mt-1">Manage your team</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>Add Member</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat
          label="Total Staff"
          value={staff.length}
          icon={<Users className="w-5 h-5" />}
        />
        <Stat
          label="Technicians"
          value={technicians.length}
          icon={<Wrench className="w-5 h-5" />}
        />
        <Stat
          label="Active Jobs"
          value={activeJobsToday}
        />
        <Stat
          label="Completed"
          value={completedThisMonth}
          trend={{ value: 12, positive: true }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map((member, idx) => {
          const memberJobs = getStaffJobs(member.id)
          const isExpanded = expandedId === member.id

          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="h-full">
                <div className="flex items-start gap-4">
                  <Avatar name={member.name} size="xl" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-white">{member.name}</h3>
                    <Badge
                      variant={roleBadgeColors[member.role] || 'default'}
                      size="sm"
                      className="mt-1"
                    >
                      {roleLabels[member.role]}
                    </Badge>

                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{formatPhone(member.phone)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{member.email}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Job stats */}
                <div className="mt-4 flex items-center gap-4">
                  <div>
                    <p className="text-xs text-white/40">Active Jobs</p>
                    <p className="text-lg font-semibold text-white">{member.activeJobs}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Completed</p>
                    <p className="text-lg font-semibold text-white">{member.completedJobs}</p>
                  </div>
                </div>

                {/* Performance bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-white/40 mb-1">
                    <span>Performance</span>
                    <span>{maxCompleted > 0 ? Math.round((member.completedJobs / maxCompleted) * 100) : 0}%</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-[#818cf8] rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${maxCompleted > 0 ? (member.completedJobs / maxCompleted) * 100 : 0}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.1 }}
                    />
                  </div>
                </div>

                {/* Expand for assigned jobs */}
                {memberJobs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/[0.04]">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : member.id)}
                      className="flex items-center gap-1.5 text-xs font-medium text-white/40 hover:text-white/70 cursor-pointer w-full"
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                      {memberJobs.length} assigned job{memberJobs.length > 1 ? 's' : ''}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 space-y-2">
                            {memberJobs.map(job => {
                              const vehicle = getVehicle(job.vehicleId)
                              const service = job.serviceIds.map(id => getService(id)?.name).filter(Boolean).join(', ')

                              return (
                                <div
                                  key={job.id}
                                  className="flex items-center justify-between p-2 bg-white/[0.03] rounded-lg text-xs"
                                >
                                  <div>
                                    <p className="font-medium text-white/70">
                                      {vehicle ? `${vehicle.make} ${vehicle.model}` : 'Vehicle'}
                                    </p>
                                    <p className="text-white/40">{service}</p>
                                  </div>
                                  <Badge
                                    variant={
                                      job.status === 'work_in_progress' ? 'warning' :
                                      job.status === 'quality_check' ? 'primary' :
                                      job.status === 'ready' ? 'success' : 'default'
                                    }
                                    size="sm"
                                  >
                                    {job.status.replace(/_/g, ' ')}
                                  </Badge>
                                </div>
                              )
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Contact actions */}
                <div className="mt-4 flex items-center gap-2">
                  <Button variant="secondary" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} className="flex-1" onClick={() => setEditingStaff(member)}>
                    Edit
                  </Button>
                  <Button variant="secondary" size="sm" icon={<Phone className="w-3.5 h-3.5" />} className="flex-1" onClick={() => window.open('tel:' + member.phone)}>
                    Call
                  </Button>
                  <Button variant="secondary" size="sm" icon={<Mail className="w-3.5 h-3.5" />} className="flex-1" onClick={() => window.open('mailto:' + member.email)}>
                    Email
                  </Button>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Team Member"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddMember} disabled={!newName.trim()}>Add Member</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Name" placeholder="Full name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Select
            label="Role"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            options={[
              { value: 'technician', label: 'Technician' },
              { value: 'sales', label: 'Sales' },
              { value: 'manager', label: 'Manager' },
              { value: 'owner', label: 'Owner' },
            ]}
          />
          <Input label="Phone" placeholder="+91 98765 43210" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
          <Input label="Email" placeholder="email@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
        </div>
      </Modal>

      {editingStaff && (
        <EditStaffModal
          member={editingStaff}
          onClose={() => setEditingStaff(null)}
          onSave={async (id: string, data: any) => { await updateStaff(id, data); setEditingStaff(null) }}
        />
      )}
    </div>
  )
}

function EditStaffModal({
  member,
  onClose,
  onSave,
}: {
  member: { id: string; name: string; role: string; phone: string; email: string }
  onClose: () => void
  onSave: (id: string, data: any) => Promise<void>
}) {
  const [name, setName] = useState(member.name)
  const [role, setRole] = useState(member.role)
  const [phone, setPhone] = useState(member.phone)
  const [email, setEmail] = useState(member.email)

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit Staff Member"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(member.id, { name, role, phone, email })}>Save Changes</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Select
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          options={[
            { value: 'technician', label: 'Technician' },
            { value: 'sales', label: 'Sales' },
            { value: 'manager', label: 'Manager' },
            { value: 'owner', label: 'Owner' },
          ]}
        />
        <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
    </Modal>
  )
}
