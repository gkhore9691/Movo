import { useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useApp } from '@/contexts/AppContext'
import { Card, CardHeader, Badge, Avatar, Button, Stat, StatusBadge, Modal, Toggle } from '@/components/ui'
import { formatCurrency, formatDate, formatRelativeDate, formatPhone } from '@/utils/format'
import {
  ArrowLeft, Phone, MessageSquare, CalendarPlus, Car, FileText, CreditCard,
  Clock, Star, Send, ChevronRight, Sparkles, ShieldCheck, History, Receipt, Pencil, Plus
} from 'lucide-react'

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    customers, vehicles, jobs, leads, bookings, invoices, reviews, services,
    retentionCustomers, getCustomer, getVehiclesForCustomer, getJobsForCustomer,
    getLeadsForCustomer, getService, getStaffMember, updateCustomerNotes, updateCustomer,
    addVehicle,
  } = useApp()

  const customer = getCustomer(id || '')
  const customerVehicles = getVehiclesForCustomer(id || '')
  const customerJobs = getJobsForCustomer(id || '')
  const customerLeads = getLeadsForCustomer(id || '')
  const customerInvoices = useMemo(
    () => invoices.filter(inv => inv.customerId === id),
    [invoices, id]
  )
  const customerReviews = useMemo(
    () => reviews.filter(r => r.customerId === id),
    [reviews, id]
  )
  const customerBookings = useMemo(
    () => bookings.filter(b => b.customerId === id),
    [bookings, id]
  )
  const retentionInfo = useMemo(
    () => retentionCustomers.find(r => r.customerId === id),
    [retentionCustomers, id]
  )

  const [aiHandling, setAiHandling] = useState(true)
  const [notes, setNotes] = useState(customer?.notes || '')
  const [notesSaved, setNotesSaved] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddVehicle, setShowAddVehicle] = useState(false)

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-slate-500">Customer not found</p>
        <Button variant="ghost" className="mt-3" onClick={() => navigate('/customers')}>
          Back to Customers
        </Button>
      </div>
    )
  }

  const completedJobs = customerJobs.filter(j => j.status === 'delivered')
  const totalVisits = completedJobs.length
  const avgJobValue = totalVisits > 0
    ? Math.round(completedJobs.reduce((s, j) => s + (j.actualPrice || j.estimatedPrice), 0) / totalVisits)
    : 0

  const lastVisit = completedJobs.length > 0
    ? completedJobs.reduce((latest, j) => {
        const delivered = j.timeline.find(t => t.stage === 'delivered')
        if (delivered && (!latest || delivered.timestamp > latest)) return delivered.timestamp
        return latest
      }, '' as string)
    : null

  const totalInvoiced = customerInvoices.reduce((s, inv) => s + inv.amount, 0)
  const totalPaid = customerInvoices.filter(i => i.status === 'paid').reduce((s, inv) => s + inv.amount, 0)
  const outstanding = customerInvoices.reduce((s, inv) => s + inv.balance, 0)

  const timeline = useMemo(() => {
    const events: { type: string; icon: React.ReactNode; color: string; title: string; description: string; timestamp: string }[] = []

    for (const job of customerJobs) {
      const serviceNames = job.serviceIds.map(sid => getService(sid)?.name || sid).join(', ')
      events.push({
        type: 'job',
        icon: <Car className="w-3.5 h-3.5" />,
        color: 'bg-indigo-500',
        title: `Job: ${serviceNames}`,
        description: `Status: ${job.status.replace(/_/g, ' ')} — ${formatCurrency(job.estimatedPrice)}`,
        timestamp: job.createdAt,
      })
    }

    for (const lead of customerLeads) {
      const serviceNames = lead.serviceIds.map(sid => getService(sid)?.name || sid).join(', ')
      events.push({
        type: 'lead',
        icon: <Sparkles className="w-3.5 h-3.5" />,
        color: 'bg-violet-500',
        title: `Enquiry: ${serviceNames}`,
        description: `Status: ${lead.status} — Quoted ${formatCurrency(lead.quotedPrice)}`,
        timestamp: lead.createdAt,
      })
    }

    for (const booking of customerBookings) {
      events.push({
        type: 'booking',
        icon: <CalendarPlus className="w-3.5 h-3.5" />,
        color: 'bg-sky-500',
        title: `Booking on ${formatDate(booking.date)}`,
        description: `${booking.status} — ${formatCurrency(booking.estimatedPrice)}`,
        timestamp: booking.date,
      })
    }

    for (const inv of customerInvoices) {
      events.push({
        type: 'invoice',
        icon: <Receipt className="w-3.5 h-3.5" />,
        color: inv.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500',
        title: `Invoice ${inv.id.toUpperCase()}`,
        description: `${formatCurrency(inv.amount)} — ${inv.status}`,
        timestamp: inv.createdAt,
      })
    }

    for (const rev of customerReviews) {
      events.push({
        type: 'review',
        icon: <Star className="w-3.5 h-3.5" />,
        color: 'bg-amber-500',
        title: `Review: ${'★'.repeat(rev.rating)}${'☆'.repeat(5 - rev.rating)}`,
        description: rev.comment || 'No comment',
        timestamp: rev.createdAt,
      })
    }

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    return events
  }, [customerJobs, customerLeads, customerBookings, customerInvoices, customerReviews, getService])

  return (
    <div className="space-y-6">
      <EditCustomerModal
        customer={customer}
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={async (id, data) => { await updateCustomer(id, data); setShowEditModal(false) }}
      />

      <AddVehicleModal
        customerId={customer.id}
        open={showAddVehicle}
        onClose={() => setShowAddVehicle(false)}
        onSave={async (vehicle) => { await addVehicle(vehicle); setShowAddVehicle(false) }}
      />

      <button
        onClick={() => navigate('/customers')}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Customers
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start gap-5">
        <Avatar name={customer.name} size="xl" />
        <div className="flex-1">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{customer.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-slate-500">{formatPhone(customer.phone)}</span>
                <span className="text-slate-300">·</span>
                <span className="text-sm text-slate-500">{customer.email}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" size="sm">
                  Customer since {new Date(customer.customerSince).getFullYear()}
                </Badge>
                {customer.tags.map(tag => (
                  <Badge
                    key={tag}
                    size="sm"
                    variant={
                      tag === 'vip' || tag === 'premium' ? 'warning'
                      : tag === 'new' ? 'primary'
                      : tag === 'repeat' ? 'success'
                      : 'default'
                    }
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => setShowEditModal(true)}>
                Edit
              </Button>
              <Button variant="secondary" size="sm" icon={<Phone className="w-3.5 h-3.5" />} onClick={() => window.open('tel:' + customer.phone)}>
                Call
              </Button>
              <Button variant="secondary" size="sm" icon={<MessageSquare className="w-3.5 h-3.5" />} onClick={() => window.open('https://wa.me/91' + customer.phone.replace(/\D/g, '').slice(-10))}>
                Message
              </Button>
              <Button size="sm" icon={<CalendarPlus className="w-3.5 h-3.5" />} onClick={() => navigate('/bookings')}>
                New Booking
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Lifetime Spend" value={formatCurrency(customer.lifetimeSpend)} icon={<CreditCard className="w-5 h-5" />} />
        <Stat label="Total Visits" value={totalVisits} icon={<History className="w-5 h-5" />} />
        <Stat label="Avg. Job Value" value={formatCurrency(avgJobValue)} />
        <Stat label="Last Visit" value={lastVisit ? formatRelativeDate(lastVisit) : 'N/A'} icon={<Clock className="w-5 h-5" />} />
      </div>

      {/* Two-column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicles */}
          <Card>
            <CardHeader
              title="Vehicles"
              subtitle={`${customerVehicles.length} vehicle${customerVehicles.length !== 1 ? 's' : ''}`}
              actions={<Button variant="secondary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAddVehicle(true)}>Add Vehicle</Button>}
            />
            {customerVehicles.length === 0 ? (
              <p className="text-sm text-slate-400">No vehicles on record</p>
            ) : (
              <div className="space-y-3">
                {customerVehicles.map(v => (
                  <Link
                    key={v.id}
                    to={`/vehicles/${v.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Car className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {v.make} {v.model}
                        </p>
                        <p className="text-xs text-slate-500">
                          {v.registrationNumber} · {v.color}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Service History */}
          <Card>
            <CardHeader
              title="Service History"
              subtitle={`${customerJobs.length} job${customerJobs.length !== 1 ? 's' : ''}`}
            />
            {customerJobs.length === 0 ? (
              <p className="text-sm text-slate-400">No service history yet</p>
            ) : (
              <div className="space-y-2">
                {customerJobs.map(job => {
                  const vehicle = vehicles.find(v => v.id === job.vehicleId)
                  const serviceNames = job.serviceIds.map(sid => getService(sid)?.name || sid).join(', ')
                  return (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all cursor-pointer"
                      onClick={() => navigate('/jobs')}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{serviceNames}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-500">{vehicle ? `${vehicle.make} ${vehicle.model}` : ''}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-slate-500">{formatDate(job.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-900">
                          {formatCurrency(job.actualPrice || job.estimatedPrice)}
                        </span>
                        <StatusBadge status={job.status} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader title="Timeline" subtitle="Complete interaction history" />
            {timeline.length === 0 ? (
              <p className="text-sm text-slate-400">No interactions yet</p>
            ) : (
              <div className="relative">
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-slate-200" />
                <div className="space-y-4">
                  {timeline.map((event, i) => (
                    <div key={`${event.type}-${i}`} className="flex items-start gap-3 relative">
                      <div className={`w-6 h-6 rounded-full ${event.color} flex items-center justify-center text-white shrink-0 z-10`}>
                        {event.icon}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-sm font-medium text-slate-900">{event.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{event.description}</p>
                        <p className="text-xs text-slate-400 mt-1">{formatRelativeDate(event.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Next Recommended Action */}
          {retentionInfo && retentionInfo.status !== 'declined' && (
            <Card className="border-indigo-200 bg-indigo-50/50">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Recommended</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{retentionInfo.recommendedService}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Last visit was {retentionInfo.daysSinceVisit} days ago. Estimated value: {formatCurrency(retentionInfo.estimatedValue)}
                  </p>
                  <Button size="sm" className="mt-3" onClick={() => navigate('/bookings')}>
                    Schedule Now
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {!retentionInfo && (
            <Card className="border-emerald-200 bg-emerald-50/50">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Up to Date</p>
                  <p className="text-sm text-slate-600 mt-1">No pending follow-ups for this customer.</p>
                </div>
              </div>
            </Card>
          )}

          {/* Payment Summary */}
          <Card>
            <CardHeader title="Payment Summary" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Total Invoiced</span>
                <span className="text-sm font-medium text-slate-900">{formatCurrency(totalInvoiced)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Total Paid</span>
                <span className="text-sm font-medium text-emerald-600">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-sm font-medium text-slate-700">Outstanding</span>
                <span className={`text-sm font-semibold ${outstanding > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {formatCurrency(outstanding)}
                </span>
              </div>
            </div>
          </Card>

          {/* Communication Preferences */}
          <Card>
            <CardHeader title="Communication" />
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Preferred Contact</p>
                <p className="text-sm font-medium text-slate-900">WhatsApp</p>
              </div>
              <Toggle
                checked={aiHandling}
                onChange={setAiHandling}
                label="AI Handling"
                description="Let Movo AI handle routine messages"
              />
            </div>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader title="Notes" />
            <textarea
              className="w-full text-sm text-slate-600 border border-slate-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              rows={4}
              placeholder="Add notes about this customer..."
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setNotesSaved(false) }}
            />
            <div className="flex items-center justify-between mt-2">
              {notesSaved && <span className="text-xs text-emerald-600">Saved</span>}
              {!notesSaved && <span />}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  updateCustomerNotes(customer.id, notes)
                  setNotesSaved(true)
                }}
              >
                Save
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function EditCustomerModal({
  customer,
  open,
  onClose,
  onSave,
}: {
  customer: { id: string; name: string; phone: string; email: string; address: string; tags: string[] }
  open: boolean
  onClose: () => void
  onSave: (id: string, data: any) => Promise<void>
}) {
  const [name, setName] = useState(customer.name)
  const [phone, setPhone] = useState(customer.phone)
  const [email, setEmail] = useState(customer.email)
  const [address, setAddress] = useState(customer.address)
  const [tags, setTags] = useState(customer.tags.join(', '))

  const inputClass = "w-full rounded-lg border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Customer"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => {
            const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean)
            onSave(customer.id, { name, phone, email, address, tags: parsedTags })
          }}>Save Changes</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
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
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Tags (comma-separated)</label>
          <input value={tags} onChange={e => setTags(e.target.value)} placeholder="vip, premium, repeat" className={inputClass} />
        </div>
      </div>
    </Modal>
  )
}

function AddVehicleModal({
  customerId,
  open,
  onClose,
  onSave,
}: {
  customerId: string
  open: boolean
  onClose: () => void
  onSave: (vehicle: any) => Promise<void>
}) {
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [regNumber, setRegNumber] = useState('')
  const [color, setColor] = useState('')
  const [saving, setSaving] = useState(false)

  const inputClass = "w-full rounded-lg border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Vehicle"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!make || !model || !regNumber || saving}
            onClick={async () => {
              setSaving(true)
              try {
                await onSave({
                  customerId,
                  make,
                  model,
                  year: new Date().getFullYear(),
                  registrationNumber: regNumber,
                  color,
                })
              } finally {
                setSaving(false)
              }
            }}
          >
            {saving ? 'Adding...' : 'Add Vehicle'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Make *</label>
            <input value={make} onChange={e => setMake(e.target.value)} placeholder="e.g. Hyundai" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Model *</label>
            <input value={model} onChange={e => setModel(e.target.value)} placeholder="e.g. Creta" className={inputClass} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Registration No. *</label>
          <input value={regNumber} onChange={e => setRegNumber(e.target.value)} placeholder="e.g. MH01AB1234" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Color</label>
          <input value={color} onChange={e => setColor(e.target.value)} placeholder="e.g. White" className={inputClass} />
        </div>
      </div>
    </Modal>
  )
}
