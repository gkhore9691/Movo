import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, ChevronRight, Phone, MessageSquare, Calendar, Filter,
  ArrowRight, Users, TrendingUp, Target, DollarSign, CheckCircle2, Pencil,
} from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import {
  Button, Card, Stat, StatusBadge, Avatar, Modal, Tabs, SearchInput, Badge, Input, Select,
} from '@/components/ui'
import { formatCurrency, formatRelativeDate, formatDate } from '@/utils/format'
import type { Lead, LeadStatus } from '@/types'

const LEAD_STATUSES: LeadStatus[] = ['new', 'contacted', 'quoted', 'negotiation', 'won', 'lost']

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  quoted: 'Quoted',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
}

const COLUMN_COLORS: Record<LeadStatus, string> = {
  new: 'border-t-slate-400',
  contacted: 'border-t-blue-500',
  quoted: 'border-t-indigo-500',
  negotiation: 'border-t-amber-500',
  won: 'border-t-emerald-500',
  lost: 'border-t-rose-400',
}

const NEXT_STATUS: Partial<Record<LeadStatus, LeadStatus>> = {
  new: 'contacted',
  contacted: 'quoted',
  quoted: 'negotiation',
  negotiation: 'won',
}

function getFollowUpUrgency(followUpDate: string): 'overdue' | 'today' | 'future' {
  if (!followUpDate) return 'future'
  const now = new Date()
  const fup = new Date(followUpDate)
  if (isNaN(fup.getTime())) return 'future'
  const todayStr = now.toISOString().slice(0, 10)
  const fupStr = fup.toISOString().slice(0, 10)
  if (fupStr < todayStr) return 'overdue'
  if (fupStr === todayStr) return 'today'
  return 'future'
}

const urgencyColors = {
  overdue: 'text-rose-600 bg-rose-50',
  today: 'text-amber-600 bg-amber-50',
  future: 'text-emerald-600 bg-emerald-50',
}

export default function Leads() {
  const {
    leads, services,
    updateLeadStatus, addLead, updateLead, getService,
  } = useApp()
  const navigate = useNavigate()

  const [view, setView] = useState('pipeline')
  const [search, setSearch] = useState('')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all')
  const [showNewLead, setShowNewLead] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)

  const filteredLeads = useMemo(() => {
    let result = leads
    if (filterStatus !== 'all') {
      result = result.filter(l => l.status === filterStatus)
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(l => {
        return (
          l.name.toLowerCase().includes(q) ||
          l.phone.includes(q) ||
          l.vehicleMake.toLowerCase().includes(q) ||
          l.vehicleModel.toLowerCase().includes(q) ||
          l.vehicleRegistration.toLowerCase().includes(q)
        )
      })
    }
    return result
  }, [leads, filterStatus, search])

  const stats = useMemo(() => {
    const total = leads.length
    const hot = leads.filter(l => l.status === 'quoted' || l.status === 'negotiation').length
    const won = leads.filter(l => l.status === 'won').length
    const conversion = total > 0 ? Math.round((won / total) * 100) : 0
    const pipelineValue = leads
      .filter(l => l.status !== 'won' && l.status !== 'lost')
      .reduce((sum, l) => sum + l.quotedPrice, 0)
    return { total, hot, conversion, pipelineValue }
  }, [leads])

  const grouped = useMemo(() => {
    const groups: Record<LeadStatus, Lead[]> = {
      new: [], contacted: [], quoted: [], negotiation: [], won: [], lost: [],
    }
    filteredLeads.forEach(l => groups[l.status].push(l))
    return groups
  }, [filteredLeads])

  function advanceStatus(lead: Lead) {
    const next = NEXT_STATUS[lead.status]
    if (!next) return
    updateLeadStatus(lead.id, next)
    if (next === 'won') {
      setTimeout(() => {
        if (confirm('Lead converted to customer! Create a booking?')) {
          navigate(`/bookings?leadName=${encodeURIComponent(lead.name)}&leadPhone=${encodeURIComponent(lead.phone)}`)
        }
      }, 500)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Leads</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your enquiry pipeline</p>
        </div>
        <div className="flex items-center gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search leads..."
            className="w-64"
          />
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowNewLead(true)}>New Lead</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Total Leads" value={stats.total} icon={<Users className="w-5 h-5" />} />
        <Stat
          label="Hot Leads"
          value={stats.hot}
          icon={<Target className="w-5 h-5" />}
        />
        <Stat
          label="Conversion Rate"
          value={`${stats.conversion}%`}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <Stat
          label="Pipeline Value"
          value={formatCurrency(stats.pipelineValue)}
          icon={<DollarSign className="w-5 h-5" />}
        />
      </div>

      {/* View Toggle */}
      <Tabs
        tabs={[
          { id: 'pipeline', label: 'Pipeline', count: filteredLeads.length },
          { id: 'list', label: 'List' },
        ]}
        active={view}
        onChange={setView}
        className="mb-6"
      />

      {/* Pipeline View */}
      {view === 'pipeline' && (
        <div className="overflow-x-auto pb-4 -mx-2">
          <div className="flex gap-4 min-w-max px-2">
            {LEAD_STATUSES.map(status => {
              const columnLeads = grouped[status]
              const columnValue = columnLeads.reduce((s, l) => s + l.quotedPrice, 0)
              return (
                <div key={status} className="w-72 shrink-0">
                  <div className={`bg-white border border-slate-200 rounded-xl border-t-2 ${COLUMN_COLORS[status]}`}>
                    <div className="px-4 py-3 border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{STATUS_LABELS[status]}</span>
                          <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                            {columnLeads.length}
                          </span>
                        </div>
                        {columnValue > 0 && (
                          <span className="text-xs text-slate-500">{formatCurrency(columnValue)}</span>
                        )}
                      </div>
                    </div>
                    <div className="p-2 space-y-2 min-h-[120px] max-h-[calc(100vh-380px)] overflow-y-auto">
                      <AnimatePresence>
                        {columnLeads.map(lead => (
                          <LeadCard
                            key={lead.id}
                            lead={lead}
                            getService={getService}
                            onAdvance={() => advanceStatus(lead)}
                            onClick={() => setSelectedLead(lead)}
                            canAdvance={!!NEXT_STATUS[lead.status]}
                          />
                        ))}
                      </AnimatePresence>
                      {columnLeads.length === 0 && (
                        <div className="flex items-center justify-center h-20 text-xs text-slate-400">
                          No leads
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left font-medium text-slate-500 px-4 py-3">Name</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-3">Vehicle</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-3">Service</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-3">Status</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-3">Quoted</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-3">Source</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-3">Follow-up</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => {
                  const svcs = lead.serviceIds.map(id => getService(id)?.name).filter(Boolean)
                  const urgency = getFollowUpUrgency(lead.followUpDate)
                  return (
                    <tr
                      key={lead.id}
                      className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={lead.name} size="sm" />
                          <span className="font-medium text-slate-900">{lead.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {lead.vehicleMake ? `${lead.vehicleMake} ${lead.vehicleModel}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{svcs.join(', ')}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={lead.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-900 font-medium">
                        {lead.quotedPrice > 0 ? formatCurrency(lead.quotedPrice) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{lead.source}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${urgencyColors[urgency]}`}>
                          {urgency === 'overdue' ? 'Overdue' : urgency === 'today' ? 'Today' : formatRelativeDate(lead.followUpDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatRelativeDate(lead.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          getService={getService}
          onAdvance={() => {
            advanceStatus(selectedLead)
            setSelectedLead(null)
          }}
          onMarkLost={() => {
            updateLeadStatus(selectedLead.id, 'lost')
            setSelectedLead(null)
          }}
          canAdvance={!!NEXT_STATUS[selectedLead.status]}
          onCreateBooking={() => {
            setSelectedLead(null)
            navigate('/bookings')
          }}
          onEdit={() => {
            setEditingLead(selectedLead)
            setSelectedLead(null)
          }}
        />
      )}

      {/* Edit Lead Modal */}
      {editingLead && (
        <EditLeadModal
          lead={editingLead}
          services={services}
          onClose={() => setEditingLead(null)}
          onSave={async (id, data) => {
            await updateLead(id, data)
            setEditingLead(null)
          }}
        />
      )}

      {/* New Lead Modal */}
      <NewLeadModal
        open={showNewLead}
        onClose={() => setShowNewLead(false)}
        services={services}
        addLead={addLead}
      />
    </div>
  )
}

function LeadCard({
  lead,
  getService,
  onAdvance,
  onClick,
  canAdvance,
}: {
  lead: Lead
  getService: (id: string) => any
  onAdvance: () => void
  onClick: () => void
  canAdvance: boolean
}) {
  const svcs = lead.serviceIds.map(id => getService(id)?.name).filter(Boolean)
  const urgency = getFollowUpUrgency(lead.followUpDate)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 hover:shadow-sm transition-all duration-150 cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Avatar name={lead.name} size="sm" />
          <div>
            <p className="text-sm font-medium text-slate-900">{lead.name}</p>
            <p className="text-xs text-slate-500">
              {lead.vehicleMake ? `${lead.vehicleMake} ${lead.vehicleModel}` : '—'}
            </p>
          </div>
        </div>
        {canAdvance && (
          <button
            onClick={(e) => { e.stopPropagation(); onAdvance() }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all"
            title={`Advance to ${NEXT_STATUS[lead.status]}`}
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-slate-500">{svcs.join(', ')}</p>

        <div className="flex items-center justify-between">
          {lead.quotedPrice > 0 && (
            <span className="text-xs font-semibold text-slate-900">
              {formatCurrency(lead.quotedPrice)}
            </span>
          )}
          <Badge variant="outline" size="sm">{lead.source}</Badge>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-50">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${urgencyColors[urgency]}`}>
            {urgency === 'overdue' ? 'Overdue' : urgency === 'today' ? 'Follow up today' : formatRelativeDate(lead.followUpDate)}
          </span>
          <span className="text-[10px] text-slate-400">{formatRelativeDate(lead.createdAt)}</span>
        </div>
      </div>
    </motion.div>
  )
}

function LeadDetailModal({
  lead,
  onClose,
  getService,
  onAdvance,
  onMarkLost,
  canAdvance,
  onCreateBooking,
  onEdit,
}: {
  lead: Lead
  onClose: () => void
  getService: (id: string) => any
  onAdvance: () => void
  onMarkLost: () => void
  canAdvance: boolean
  onCreateBooking?: () => void
  onEdit?: () => void
}) {
  const svcs = lead.serviceIds.map(id => getService(id)).filter(Boolean)
  const nextStatus = NEXT_STATUS[lead.status]

  return (
    <Modal
      open
      onClose={onClose}
      title={lead.name}
      subtitle={lead.vehicleMake ? `${lead.vehicleMake} ${lead.vehicleModel}${lead.vehicleRegistration ? ` · ${lead.vehicleRegistration}` : ''}` : undefined}
      size="lg"
      footer={
        <div className="flex items-center gap-2 w-full">
          {lead.status !== 'won' && lead.status !== 'lost' && (
            <Button variant="danger" size="sm" onClick={onMarkLost}>
              Mark Lost
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {canAdvance && (
            <Button onClick={onAdvance}>
              Advance to {STATUS_LABELS[nextStatus!]}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Status */}
        <div className="flex items-center gap-3">
          <StatusBadge status={lead.status} />
          {lead.quotedPrice > 0 && (
            <span className="text-lg font-semibold text-slate-900">
              {formatCurrency(lead.quotedPrice)}
            </span>
          )}
          {lead.customerId && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              Converted
            </span>
          )}
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Contact</p>
            <div className="flex items-center gap-2">
              <Avatar name={lead.name} size="sm" />
              <div>
                <p className="text-sm font-medium text-slate-900">{lead.name}</p>
                <p className="text-xs text-slate-500">{lead.phone}</p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Vehicle</p>
            <p className="text-sm text-slate-900">
              {lead.vehicleMake ? `${lead.vehicleMake} ${lead.vehicleModel}` : '—'}
            </p>
            <p className="text-xs text-slate-500">{lead.vehicleRegistration}</p>
          </div>
        </div>

        {/* Email */}
        {lead.email && (
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Email</p>
            <p className="text-sm text-slate-900">{lead.email}</p>
          </div>
        )}

        {/* Services */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Services of Interest</p>
          <div className="space-y-2">
            {svcs.map((svc: any) => (
              <div key={svc.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                <span className="text-sm text-slate-900">{svc.name}</span>
                <span className="text-sm text-slate-500">
                  {formatCurrency(svc.basePrice)} — {formatCurrency(svc.maxPrice)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Source</p>
            <p className="text-sm text-slate-900">{lead.source}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Follow-up Date</p>
            <p className="text-sm text-slate-900">{formatDate(lead.followUpDate)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Created</p>
            <p className="text-sm text-slate-900">{formatDate(lead.createdAt)}</p>
          </div>
        </div>

        {/* Notes */}
        {lead.notes && (
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Notes</p>
            <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2">{lead.notes}</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <Button
            variant="secondary" size="sm" icon={<Phone className="w-3.5 h-3.5" />}
            onClick={() => lead.phone && window.open(`tel:${lead.phone}`)}
          >
            Call
          </Button>
          <Button
            variant="secondary" size="sm" icon={<MessageSquare className="w-3.5 h-3.5" />}
            onClick={() => {
              if (lead.phone) {
                const num = lead.phone.replace(/\D/g, '').slice(-10)
                window.open(`https://wa.me/91${num}`)
              }
            }}
          >
            Message
          </Button>
          <Button
            variant="secondary" size="sm" icon={<Pencil className="w-3.5 h-3.5" />}
            onClick={onEdit}
          >
            Edit
          </Button>
          <Button
            variant="secondary" size="sm" icon={<Calendar className="w-3.5 h-3.5" />}
            onClick={onCreateBooking}
          >
            Create Booking
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function EditLeadModal({
  lead,
  services,
  onClose,
  onSave,
}: {
  lead: Lead
  services: any[]
  onClose: () => void
  onSave: (leadId: string, data: Partial<Lead>) => Promise<void>
}) {
  const [name, setName] = useState(lead.name)
  const [phone, setPhone] = useState(lead.phone)
  const [email, setEmail] = useState(lead.email)
  const [vehicleMake, setVehicleMake] = useState(lead.vehicleMake)
  const [vehicleModel, setVehicleModel] = useState(lead.vehicleModel)
  const [vehicleRegistration, setVehicleRegistration] = useState(lead.vehicleRegistration)
  const [quotedPrice, setQuotedPrice] = useState(lead.quotedPrice ? String(lead.quotedPrice) : '')
  const [source, setSource] = useState(lead.source || 'Walk-in')
  const [notes, setNotes] = useState(lead.notes)
  const [followUpDate, setFollowUpDate] = useState(lead.followUpDate ? lead.followUpDate.slice(0, 10) : '')
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(lead.serviceIds || [])
  const [saving, setSaving] = useState(false)

  const servicesByCategory = useMemo(() => {
    const groups: Record<string, typeof services> = {}
    for (const svc of services) {
      const cat = svc.category || 'Other'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(svc)
    }
    return groups
  }, [services])

  function toggleService(id: string) {
    setSelectedServiceIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  async function handleSave() {
    if (!name || !phone) return
    setSaving(true)
    await onSave(lead.id, {
      name,
      phone,
      email,
      vehicleMake,
      vehicleModel,
      vehicleRegistration,
      quotedPrice: Number(quotedPrice) || 0,
      source,
      notes,
      followUpDate,
      serviceIds: selectedServiceIds,
    })
    setSaving(false)
  }

  const inputClass = "w-full rounded-lg border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit Lead"
      subtitle={lead.name}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name || !phone || saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Customer name"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone *</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Phone number"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email address"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Vehicle Make</label>
            <input
              value={vehicleMake}
              onChange={e => setVehicleMake(e.target.value)}
              placeholder="e.g. Mahindra"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Vehicle Model</label>
            <input
              value={vehicleModel}
              onChange={e => setVehicleModel(e.target.value)}
              placeholder="e.g. Thar"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Registration No.</label>
          <input
            value={vehicleRegistration}
            onChange={e => setVehicleRegistration(e.target.value)}
            placeholder="e.g. MP09-AB-1234"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Services ({selectedServiceIds.length} selected)</label>
          <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-3">
            {Object.entries(servicesByCategory).map(([cat, catServices]) => (
              <div key={cat}>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{cat}</p>
                {catServices.map(svc => (
                  <label key={svc.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-slate-50 rounded px-1">
                    <input
                      type="checkbox"
                      checked={selectedServiceIds.includes(svc.id)}
                      onChange={() => toggleService(svc.id)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700 flex-1">{svc.name}</span>
                    <span className="text-xs text-slate-400">{formatCurrency(svc.basePrice)}+</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Quoted Price</label>
            <input
              value={quotedPrice}
              onChange={e => setQuotedPrice(e.target.value)}
              placeholder="e.g. 15000"
              type="number"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Follow-up Date</label>
            <input
              value={followUpDate}
              onChange={e => setFollowUpDate(e.target.value)}
              type="date"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Source</label>
          <select
            value={source}
            onChange={e => setSource(e.target.value)}
            className={inputClass}
          >
            {['Walk-in', 'Phone', 'WhatsApp', 'Instagram', 'Referral', 'Google'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notes..."
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>
      </div>
    </Modal>
  )
}

function NewLeadModal({
  open,
  onClose,
  services,
  addLead,
}: {
  open: boolean
  onClose: () => void
  services: any[]
  addLead: (lead: Lead) => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [vehicleMake, setVehicleMake] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [vehicleRegistration, setVehicleRegistration] = useState('')
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [source, setSource] = useState('Walk-in')
  const [notes, setNotes] = useState('')

  const servicesByCategory = useMemo(() => {
    const groups: Record<string, typeof services> = {}
    for (const svc of services) {
      const cat = svc.category || 'Other'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(svc)
    }
    return groups
  }, [services])

  function toggleService(id: string) {
    setSelectedServiceIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  function reset() {
    setName('')
    setPhone('')
    setEmail('')
    setVehicleMake('')
    setVehicleModel('')
    setVehicleRegistration('')
    setSelectedServiceIds([])
    setSource('Walk-in')
    setNotes('')
  }

  function handleCreate() {
    if (!name || !phone || selectedServiceIds.length === 0) return
    addLead({
      id: `lead-${Date.now()}`,
      name,
      phone,
      email,
      vehicleMake,
      vehicleModel,
      vehicleYear: null,
      vehicleRegistration,
      customerId: '',
      vehicleId: '',
      serviceIds: selectedServiceIds,
      status: 'new',
      quotedPrice: 0,
      source,
      notes,
      createdAt: new Date().toISOString(),
      followUpDate: new Date(Date.now() + 86400000).toISOString(),
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
      title="New Lead"
      subtitle="Create a new enquiry"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!name || !phone || selectedServiceIds.length === 0}>Create Lead</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Customer name"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone *</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Phone number"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email address (optional)"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Vehicle Make</label>
            <input
              value={vehicleMake}
              onChange={e => setVehicleMake(e.target.value)}
              placeholder="e.g. Mahindra"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Vehicle Model</label>
            <input
              value={vehicleModel}
              onChange={e => setVehicleModel(e.target.value)}
              placeholder="e.g. Thar"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Registration No.</label>
          <input
            value={vehicleRegistration}
            onChange={e => setVehicleRegistration(e.target.value)}
            placeholder="e.g. MP09-AB-1234"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Services * ({selectedServiceIds.length} selected)</label>
          <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-3">
            {Object.entries(servicesByCategory).map(([cat, catServices]) => (
              <div key={cat}>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{cat}</p>
                {catServices.map(svc => (
                  <label key={svc.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-slate-50 rounded px-1">
                    <input
                      type="checkbox"
                      checked={selectedServiceIds.includes(svc.id)}
                      onChange={() => toggleService(svc.id)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700 flex-1">{svc.name}</span>
                    <span className="text-xs text-slate-400">{formatCurrency(svc.basePrice)}+</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Source *</label>
          <select
            value={source}
            onChange={e => setSource(e.target.value)}
            className={inputClass}
          >
            {['Walk-in', 'Phone', 'WhatsApp', 'Instagram', 'Referral', 'Google'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional notes..."
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>
      </div>
    </Modal>
  )
}
