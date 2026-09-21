import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Building2, Clock, Palette, Bell, Bot, Users, Pencil, Plus, RefreshCw, ExternalLink, Check, AlertCircle } from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import { Card, CardHeader, Button, Badge, Toggle, Avatar, Modal } from '@/components/ui'
import { formatCurrency, formatPhone } from '@/utils/format'
import { api } from '@/api/client'

const roleLabels: Record<string, string> = {
  owner: 'Owner',
  manager: 'Manager',
  sales: 'Sales',
  technician: 'Technician',
}

const defaultWorkingHours = [
  { day: 'Monday', open: '9:00 AM', close: '7:00 PM' },
  { day: 'Tuesday', open: '9:00 AM', close: '7:00 PM' },
  { day: 'Wednesday', open: '9:00 AM', close: '7:00 PM' },
  { day: 'Thursday', open: '9:00 AM', close: '7:00 PM' },
  { day: 'Friday', open: '9:00 AM', close: '7:00 PM' },
  { day: 'Saturday', open: '9:00 AM', close: '7:00 PM' },
  { day: 'Sunday', open: '', close: '' },
]

export default function Settings() {
  const { services, staff, currentTenant } = useApp()
  const navigate = useNavigate()

  const servicesByCategory = useMemo(() => {
    const groups: Record<string, typeof services> = {}
    for (const svc of services) {
      const cat = svc.category || 'Other'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(svc)
    }
    return groups
  }, [services])

  // Local tenant state for optimistic updates
  const [tenant, setTenantLocal] = useState(currentTenant)

  // Modal states
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showEditHours, setShowEditHours] = useState(false)
  const [showAddService, setShowAddService] = useState(false)
  const [editingService, setEditingService] = useState<any>(null)

  // Capacity
  const [capacity, setCapacity] = useState(6)

  // Notification prefs
  const [notifBooking, setNotifBooking] = useState(true)
  const [notifJobStatus, setNotifJobStatus] = useState(true)
  const [notifPayment, setNotifPayment] = useState(true)
  const [notifReview, setNotifReview] = useState(true)
  const [notifAiEscalation, setNotifAiEscalation] = useState(true)

  // AI config
  const [aiEnabled, setAiEnabled] = useState(true)
  const [aiAutoRespond, setAiAutoRespond] = useState(true)
  const [aiLanguage, setAiLanguage] = useState('hinglish')
  const [aiTone, setAiTone] = useState('friendly')

  // Working hours local state
  const [workingHours, setWorkingHours] = useState(defaultWorkingHours)

  // Save status
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  async function saveTenant(data: Record<string, any>) {
    if (!tenant) return
    try {
      await api.patch(`/tenants/${tenant.id}`, data)
      setTenantLocal(prev => prev ? { ...prev, ...data } as any : prev)
      setSaveStatus('Saved')
      setTimeout(() => setSaveStatus(null), 2000)
    } catch {
      setSaveStatus('Error saving')
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }

  function handleNotifChange(key: string, setter: (v: boolean) => void) {
    return (val: boolean) => {
      setter(val)
      saveTenant({ [`notif_${key}`]: val })
    }
  }

  function handleAiToggle(key: string, setter: (v: boolean) => void) {
    return (val: boolean) => {
      setter(val)
      saveTenant({ [`ai_${key}`]: val })
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Configure your Movo workspace</p>
        </div>
        {saveStatus && (
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${saveStatus === 'Saved' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {saveStatus}
          </span>
        )}
      </div>

      {/* Business Profile */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader
            title="Business Profile"
            actions={<Button variant="ghost" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => setShowEditProfile(true)}>Edit</Button>}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoField label="Business Name" value={tenant ? `${tenant.name}${tenant.city ? ` — ${tenant.city}` : ''}` : '-'} />
            <InfoField label="Phone" value={tenant?.phone || '-'} />
            <InfoField label="Email" value={tenant?.email || '-'} />
            <InfoField label="GST Number" value={tenant?.gstNumber || '-'} />
            <InfoField label="Address" value={tenant?.address || '-'} className="sm:col-span-2" />
          </div>
        </Card>
      </motion.div>

      {/* Services & Pricing */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardHeader
            title="Services & Pricing"
            actions={<Button variant="secondary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAddService(true)}>Add Service</Button>}
          />
          <div className="space-y-4">
            {Object.entries(servicesByCategory).map(([category, catServices]) => (
              <div key={category}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{category}</p>
                <div className="divide-y divide-slate-100">
                  {catServices.map(svc => (
                    <div key={svc.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{svc.name}</p>
                        <p className="text-xs text-slate-500">{svc.duration}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-700">
                          {formatCurrency(svc.basePrice)} – {formatCurrency(svc.maxPrice)}
                        </span>
                        <Button variant="ghost" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => setEditingService(svc)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Working Hours */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader
            title="Working Hours"
            actions={<Button variant="ghost" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => setShowEditHours(true)}>Edit</Button>}
          />
          <div className="divide-y divide-slate-100">
            {workingHours.map(wh => {
              const display = wh.open && wh.close ? `${wh.open} – ${wh.close}` : 'Closed'
              return (
                <div key={wh.day} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <span className="text-sm text-slate-600 w-28">{wh.day}</span>
                  <span className={`text-sm font-medium ${display === 'Closed' ? 'text-slate-400' : 'text-slate-900'}`}>
                    {display}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      </motion.div>

      {/* Studio Capacity */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card>
          <CardHeader title="Studio Capacity" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Maximum vehicles per day</p>
              <p className="text-xs text-slate-400">Limits booking availability</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={capacity}
                onChange={e => setCapacity(Number(e.target.value))}
                onBlur={() => saveTenant({ maxCapacity: capacity })}
                className="w-16 px-3 py-1.5 text-sm font-medium text-center border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-500">vehicles</span>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Notification Preferences */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader title="Notification Preferences" subtitle="Choose which events trigger notifications" />
          <div className="space-y-4">
            <Toggle checked={notifBooking} onChange={handleNotifChange('booking', setNotifBooking)} label="New Booking" description="When a new booking is created or confirmed" />
            <Toggle checked={notifJobStatus} onChange={handleNotifChange('job_status', setNotifJobStatus)} label="Job Status Change" description="When a job moves to a new stage" />
            <Toggle checked={notifPayment} onChange={handleNotifChange('payment', setNotifPayment)} label="Payment Received" description="When an invoice is paid" />
            <Toggle checked={notifReview} onChange={handleNotifChange('review', setNotifReview)} label="Review Received" description="When a customer submits a review" />
            <Toggle checked={notifAiEscalation} onChange={handleNotifChange('ai_escalation', setNotifAiEscalation)} label="AI Escalation" description="When AI needs human intervention" />
          </div>
        </Card>
      </motion.div>

      {/* AI Configuration */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card>
          <CardHeader title="AI Configuration" subtitle="Configure how Movo's AI interacts with customers" />
          <div className="space-y-5">
            <Toggle checked={aiEnabled} onChange={handleAiToggle('enabled', setAiEnabled)} label="AI Receptionist" description="Enable AI to handle customer conversations" />
            <Toggle checked={aiAutoRespond} onChange={handleAiToggle('auto_respond', setAiAutoRespond)} label="Auto-respond to Enquiries" description="AI automatically replies to new customer messages" />

            <div>
              <label className="text-sm font-medium text-slate-900">Language Preference</label>
              <p className="text-xs text-slate-500 mb-2">Language AI uses when responding to customers</p>
              <div className="flex gap-2">
                {[
                  { id: 'english', label: 'English' },
                  { id: 'hindi', label: 'Hindi' },
                  { id: 'hinglish', label: 'Hinglish' },
                ].map(lang => (
                  <button
                    key={lang.id}
                    onClick={() => { setAiLanguage(lang.id); saveTenant({ ai_language: lang.id }) }}
                    className={`px-4 py-2 text-sm rounded-lg border transition-all cursor-pointer ${
                      aiLanguage === lang.id
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-900">Response Tone</label>
              <p className="text-xs text-slate-500 mb-2">How the AI should communicate with customers</p>
              <div className="flex gap-2">
                {[
                  { id: 'professional', label: 'Professional' },
                  { id: 'friendly', label: 'Friendly' },
                  { id: 'casual', label: 'Casual' },
                ].map(tone => (
                  <button
                    key={tone.id}
                    onClick={() => { setAiTone(tone.id); saveTenant({ ai_tone: tone.id }) }}
                    className={`px-4 py-2 text-sm rounded-lg border transition-all cursor-pointer ${
                      aiTone === tone.id
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {tone.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Detailing Street Integration — only show for DS tenants */}
      {tenant?.slug?.includes('detailing-street') && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
          <DsSyncCard />
        </motion.div>
      )}

      {/* Team */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader
            title="Team"
            actions={<Button variant="secondary" size="sm" onClick={() => navigate('/staff')}>View All</Button>}
          />
          <div className="divide-y divide-slate-100">
            {staff.map(member => (
              <div key={member.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <Avatar name={member.name} size="sm" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{member.name}</p>
                  <p className="text-xs text-slate-500">{formatPhone(member.phone)}</p>
                </div>
                <Badge
                  variant={member.role === 'owner' || member.role === 'manager' ? 'primary' : member.role === 'sales' ? 'warning' : 'success'}
                  size="sm"
                >
                  {roleLabels[member.role]}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Modals */}
      {tenant && (
        <EditProfileModal
          tenant={tenant}
          open={showEditProfile}
          onClose={() => setShowEditProfile(false)}
          onSave={async (data) => { await saveTenant(data); setShowEditProfile(false) }}
        />
      )}

      <EditHoursModal
        hours={workingHours}
        open={showEditHours}
        onClose={() => setShowEditHours(false)}
        onSave={async (hours) => {
          setWorkingHours(hours)
          await saveTenant({ workingHours: hours })
          setShowEditHours(false)
        }}
      />

      <AddServiceModal
        open={showAddService}
        onClose={() => setShowAddService(false)}
      />

      {editingService && (
        <EditServiceModal
          service={editingService}
          open={!!editingService}
          onClose={() => setEditingService(null)}
        />
      )}
    </div>
  )
}

function InfoField({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-slate-900 mt-1">{value}</p>
    </div>
  )
}

/* ---- Modals ---- */

function EditProfileModal({
  tenant,
  open,
  onClose,
  onSave,
}: {
  tenant: { name: string; phone: string; email: string; address: string; city: string; state: string; gstNumber: string }
  open: boolean
  onClose: () => void
  onSave: (data: Record<string, any>) => Promise<void>
}) {
  const [name, setName] = useState(tenant.name)
  const [phone, setPhone] = useState(tenant.phone)
  const [email, setEmail] = useState(tenant.email)
  const [address, setAddress] = useState(tenant.address)
  const [city, setCity] = useState(tenant.city)
  const [state, setState] = useState(tenant.state)
  const [gstNumber, setGstNumber] = useState(tenant.gstNumber)
  const [saving, setSaving] = useState(false)

  const inputClass = "w-full rounded-lg border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Business Profile"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            disabled={saving}
            onClick={async () => {
              setSaving(true)
              try {
                await onSave({ name, phone, email, address, city, state, gstNumber })
              } finally {
                setSaving(false)
              }
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Business Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
          <input value={address} onChange={e => setAddress(e.target.value)} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
            <input value={city} onChange={e => setCity(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">State</label>
            <input value={state} onChange={e => setState(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">GST Number</label>
          <input value={gstNumber} onChange={e => setGstNumber(e.target.value)} className={inputClass} />
        </div>
      </div>
    </Modal>
  )
}

function EditHoursModal({
  hours,
  open,
  onClose,
  onSave,
}: {
  hours: { day: string; open: string; close: string }[]
  open: boolean
  onClose: () => void
  onSave: (hours: { day: string; open: string; close: string }[]) => Promise<void>
}) {
  const [local, setLocal] = useState(hours.map(h => ({ ...h })))
  const [saving, setSaving] = useState(false)

  function updateHour(idx: number, field: 'open' | 'close', value: string) {
    setLocal(prev => prev.map((h, i) => i === idx ? { ...h, [field]: value } : h))
  }

  const inputClass = "w-full rounded-lg border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Working Hours"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            disabled={saving}
            onClick={async () => {
              setSaving(true)
              try { await onSave(local) } finally { setSaving(false) }
            }}
          >
            {saving ? 'Saving...' : 'Save Hours'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {local.map((h, idx) => (
          <div key={h.day} className="flex items-center gap-3">
            <span className="text-sm text-slate-700 w-24 shrink-0">{h.day}</span>
            <input
              placeholder="e.g. 9:00 AM"
              value={h.open}
              onChange={e => updateHour(idx, 'open', e.target.value)}
              className={inputClass}
            />
            <span className="text-slate-400">to</span>
            <input
              placeholder="e.g. 7:00 PM"
              value={h.close}
              onChange={e => updateHour(idx, 'close', e.target.value)}
              className={inputClass}
            />
          </div>
        ))}
        <p className="text-xs text-slate-400">Leave both fields empty to mark a day as closed.</p>
      </div>
    </Modal>
  )
}

function AddServiceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [duration, setDuration] = useState('')
  const [category, setCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputClass = "w-full rounded-lg border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"

  async function handleSave() {
    if (!name || !basePrice) return
    setSaving(true)
    setError(null)
    try {
      await api.post('/services', {
        name,
        description,
        basePrice: Number(basePrice),
        maxPrice: Number(maxPrice) || Number(basePrice),
        duration,
        category,
      })
      onClose()
    } catch (e: any) {
      setError(e.message || 'Failed to add service')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Service"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={!name || !basePrice || saving} onClick={handleSave}>
            {saving ? 'Adding...' : 'Add Service'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Service Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Full Detailing" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description" className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Base Price *</label>
            <input type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)} placeholder="0" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Max Price</label>
            <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="0" className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Duration</label>
            <input value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 2-3 hours" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
            <input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Detailing" className={inputClass} />
          </div>
        </div>
      </div>
    </Modal>
  )
}

function EditServiceModal({
  service,
  open,
  onClose,
}: {
  service: { id: string; name: string; description: string; basePrice: number; maxPrice: number; duration: string; category: string }
  open: boolean
  onClose: () => void
}) {
  const [name, setName] = useState(service.name)
  const [description, setDescription] = useState(service.description)
  const [basePrice, setBasePrice] = useState(String(service.basePrice))
  const [maxPrice, setMaxPrice] = useState(String(service.maxPrice))
  const [duration, setDuration] = useState(service.duration)
  const [category, setCategory] = useState(service.category)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputClass = "w-full rounded-lg border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"

  async function handleSave() {
    if (!name || !basePrice) return
    setSaving(true)
    setError(null)
    try {
      await api.patch(`/services/${service.id}`, {
        name,
        description,
        basePrice: Number(basePrice),
        maxPrice: Number(maxPrice) || Number(basePrice),
        duration,
        category,
      })
      onClose()
    } catch (e: any) {
      setError(e.message || 'Failed to update service')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Service"
      subtitle={service.name}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={!name || !basePrice || saving} onClick={handleSave}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Service Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
          <input value={description} onChange={e => setDescription(e.target.value)} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Base Price *</label>
            <input type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Max Price</label>
            <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Duration</label>
            <input value={duration} onChange={e => setDuration(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
            <input value={category} onChange={e => setCategory(e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>
    </Modal>
  )
}

function DsSyncCard() {
  const { refreshData } = useApp()
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null)

  async function handleSync() {
    setSyncing(true)
    setResult(null)
    try {
      const res = await api.post<any>('/ds-bridge/scrape', {})
      const r = res.result || res
      const created = (r.bookings?.created || 0) + (r.queries?.created || 0) + (r.invoices?.created || 0) + (r.followups?.created || 0)
      const skipped = (r.bookings?.skipped || 0) + (r.queries?.skipped || 0) + (r.invoices?.skipped || 0) + (r.followups?.skipped || 0)
      setResult({
        status: 'success',
        message: `Synced! ${created} new records imported, ${skipped} already up to date.`,
      })
      await refreshData()
    } catch (err: any) {
      setResult({ status: 'error', message: err.message || 'Sync failed' })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Card>
      <CardHeader title="Detailing Street CRM" />
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Sync data from admin.detailingstreet.com — imports bookings, queries, invoices, and follow-ups into Movo.
          New bookings created in Movo are automatically pushed to DS.
        </p>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSync}
            disabled={syncing}
            icon={<RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />}
          >
            {syncing ? 'Syncing...' : 'Sync from DS'}
          </Button>
          <a
            href="https://admin.detailingstreet.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-500 transition-colors"
          >
            Open DS Admin <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {result && (
          <div className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${
            result.status === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {result.status === 'success'
              ? <Check className="w-4 h-4 mt-0.5 shrink-0" />
              : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            }
            {result.message}
          </div>
        )}

        <div className="text-xs text-slate-400 pt-1 border-t border-slate-100">
          Auto-push: When you create a booking in Movo, it's automatically sent to Detailing Street.
        </div>
      </div>
    </Card>
  )
}
