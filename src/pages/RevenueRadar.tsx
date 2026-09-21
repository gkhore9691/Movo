import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Phone,
  MessageSquare,
  Bot,
  ChevronDown,
  ChevronUp,
  Send,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useApp } from '@/contexts/AppContext'
import { Button, Modal, StatusBadge } from '@/components/ui'
import RetentionEngine from '@/features/retention/RetentionEngine'
import { formatCurrency, formatRelativeDate } from '@/utils/format'

/* trendData is now computed inside the component from leads + invoices */

interface OpportunityItem {
  category: 'hot' | 'warm' | 'dormant'
  customerName: string
  customerId: string
  phone: string
  vehicleInfo: string
  serviceInfo: string
  amount: number
  lastContact: string
  status: string
  id: string
}

export default function RevenueRadar() {
  const { leads, invoices, retentionCustomers, updateLeadStatus, updateRetentionStatus, getCustomer, getService } = useApp()
  const navigate = useNavigate()
  const [movoModalOpen, setMovoModalOpen] = useState(false)
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityItem | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>('hot')
  const [animatedTotal, setAnimatedTotal] = useState(0)

  const trendData = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - (6 - i))
      const dayStr = d.toLocaleDateString('default', { weekday: 'short' })
      const dayLeads = leads.filter(l => {
        const created = new Date(l.createdAt)
        return created.toDateString() === d.toDateString()
      })
      const potential = dayLeads.reduce((sum, l) => sum + l.quotedPrice, 0)
      const dayInvoices = invoices.filter(inv => {
        if (inv.status !== 'paid' || !inv.paidAt) return false
        return new Date(inv.paidAt).toDateString() === d.toDateString()
      })
      const actual = dayInvoices.reduce((sum, inv) => sum + inv.amount, 0)
      return { day: dayStr, potential, actual }
    })
  }, [leads, invoices])

  const opportunities = useMemo(() => {
    const items: OpportunityItem[] = []

    leads
      .filter(l => ['quoted', 'negotiation'].includes(l.status))
      .forEach(l => {
        const serviceNames = l.serviceIds.map(id => getService(id)?.name).filter(Boolean)
        items.push({
          category: 'hot',
          customerName: l.name || 'Unknown',
          customerId: l.customerId,
          phone: l.phone || '',
          vehicleInfo: l.vehicleMake ? `${l.vehicleMake} ${l.vehicleModel}` : '',
          serviceInfo: serviceNames.join(', '),
          amount: l.quotedPrice,
          lastContact: l.createdAt,
          status: l.status,
          id: l.id,
        })
      })

    leads
      .filter(l => l.status === 'contacted')
      .forEach(l => {
        const serviceNames = l.serviceIds.map(id => getService(id)?.name).filter(Boolean)
        items.push({
          category: 'warm',
          customerName: l.name || 'Unknown',
          customerId: l.customerId,
          phone: l.phone || '',
          vehicleInfo: l.vehicleMake ? `${l.vehicleMake} ${l.vehicleModel}` : '',
          serviceInfo: serviceNames.join(', '),
          amount: l.quotedPrice || getService(l.serviceIds[0])?.basePrice || 0,
          lastContact: l.createdAt,
          status: l.status,
          id: l.id,
        })
      })

    retentionCustomers
      .filter(r => r.daysSinceVisit >= 90 && r.status === 'due')
      .forEach(r => {
        const customer = getCustomer(r.customerId)
        items.push({
          category: 'dormant',
          customerName: customer?.name || 'Unknown',
          customerId: r.customerId,
          phone: customer?.phone || '',
          vehicleInfo: '',
          serviceInfo: r.recommendedService,
          amount: r.estimatedValue,
          lastContact: r.lastVisit,
          status: 'dormant',
          id: r.customerId,
        })
      })

    return items
  }, [leads, retentionCustomers, getCustomer, getService])

  const hotTotal = useMemo(() => opportunities.filter(o => o.category === 'hot').reduce((s, o) => s + o.amount, 0), [opportunities])
  const warmTotal = useMemo(() => opportunities.filter(o => o.category === 'warm').reduce((s, o) => s + o.amount, 0), [opportunities])
  const dormantTotal = useMemo(() => opportunities.filter(o => o.category === 'dormant').reduce((s, o) => s + o.amount, 0), [opportunities])
  const totalPotential = hotTotal + warmTotal + dormantTotal

  useEffect(() => {
    if (totalPotential === 0) return
    const duration = 1000
    const steps = 40
    const increment = totalPotential / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= totalPotential) {
        setAnimatedTotal(totalPotential)
        clearInterval(timer)
      } else {
        setAnimatedTotal(Math.floor(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [totalPotential])

  const categories = [
    { key: 'hot' as const, label: 'Hot', total: hotTotal, dotColor: 'bg-rose-400' },
    { key: 'warm' as const, label: 'Warm', total: warmTotal, dotColor: 'bg-amber-400' },
    { key: 'dormant' as const, label: 'Dormant', total: dormantTotal, dotColor: 'bg-neutral-300' },
  ]

  const handleLetMovoHandle = (opp?: OpportunityItem) => {
    setSelectedOpportunity(opp || opportunities[0] || null)
    setMovoModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Revenue Radar</h2>
        <p className="text-sm text-neutral-500 mt-0.5">Track and recover potential revenue from unresolved opportunities</p>
      </div>

      {/* Total Revenue Card */}
      <div className="bg-white border border-neutral-200 rounded-xl p-8 text-center">
        <p className="text-4xl font-bold text-neutral-900 tracking-tight tabular-nums">
          {formatCurrency(animatedTotal)}
        </p>
        <p className="text-sm text-neutral-500 mt-1.5">in potential revenue</p>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {categories.map(cat => {
          const count = opportunities.filter(o => o.category === cat.key).length
          const isActive = expandedCategory === cat.key
          return (
            <button
              key={cat.key}
              onClick={() => setExpandedCategory(isActive ? null : cat.key)}
              className={`text-left bg-white border rounded-xl p-5 transition-colors cursor-pointer ${
                isActive ? 'border-neutral-400' : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${cat.dotColor}`} />
                <span className="text-sm font-medium text-neutral-700">{cat.label}</span>
                <span className="text-xs text-neutral-400 ml-auto">{count}</span>
              </div>
              <p className="text-xl font-semibold text-neutral-900">{formatCurrency(cat.total)}</p>
            </button>
          )
        })}
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => navigate('/leads')}>
          Follow up all
        </Button>
        <Button variant="secondary" onClick={() => setExpandedCategory('hot')}>
          Review individually
        </Button>
        <Button onClick={() => handleLetMovoHandle()}>
          Let Movo handle it
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Opportunity List */}
        <div className="lg:col-span-2 space-y-3">
          {categories.map(cat => {
            const items = opportunities.filter(o => o.category === cat.key)
            if (items.length === 0) return null
            const isExpanded = expandedCategory === cat.key
            return (
              <div key={cat.key} className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : cat.key)}
                  className="flex items-center justify-between w-full px-5 py-3.5 text-left hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${cat.dotColor}`} />
                    <span className="text-sm font-medium text-neutral-900">{cat.label}</span>
                    <span className="text-xs text-neutral-400">{items.length}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-neutral-700">{formatCurrency(cat.total)}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-neutral-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-400" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-neutral-100">
                        {items.map((opp, i) => (
                          <div
                            key={opp.id}
                            className={`flex items-center gap-4 px-5 py-3 hover:bg-neutral-50 transition-colors ${
                              i < items.length - 1 ? 'border-b border-neutral-100' : ''
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-neutral-900">{opp.customerName}</p>
                              <p className="text-xs text-neutral-500 mt-0.5 truncate">
                                {opp.vehicleInfo && `${opp.vehicleInfo} · `}{opp.serviceInfo}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-medium text-neutral-900 tabular-nums">
                                {opp.amount > 0 ? formatCurrency(opp.amount) : '—'}
                              </p>
                              <p className="text-xs text-neutral-400">{formatRelativeDate(opp.lastContact)}</p>
                            </div>
                            <StatusBadge status={opp.status} />
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
                                title="Call"
                                onClick={() => {
                                  if (opp.phone) window.open(`tel:${opp.phone}`)
                                }}
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </button>
                              <button
                                className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
                                title="Message"
                                onClick={() => {
                                  if (opp.phone) {
                                    const num = opp.phone.replace(/\D/g, '').slice(-10)
                                    window.open(`https://wa.me/91${num}`)
                                  }
                                }}
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                              <button
                                className="p-1.5 rounded-md text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                title="Let Movo handle"
                                onClick={() => handleLetMovoHandle(opp)}
                              >
                                <Bot className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>

        {/* Trend Chart */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <h3 className="text-sm font-medium text-neutral-900 mb-1">Trend</h3>
          <p className="text-xs text-neutral-400 mb-5">Last 7 days</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="fillActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fillPotential" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c7d2fe" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#c7d2fe" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: '#a3a3a3' }}
                  stroke="transparent"
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#a3a3a3' }}
                  stroke="transparent"
                  tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  width={45}
                />
                <Tooltip
                  formatter={(value: unknown) => formatCurrency(Number(value))}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e5e5',
                    fontSize: '12px',
                    padding: '6px 10px',
                    boxShadow: 'none',
                  }}
                />
                <Area type="monotone" dataKey="potential" stroke="#c7d2fe" fill="url(#fillPotential)" strokeWidth={1.5} name="Potential" />
                <Area type="monotone" dataKey="actual" stroke="#4f46e5" fill="url(#fillActual)" strokeWidth={1.5} name="Actual" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-5 mt-4 pt-3 border-t border-neutral-100">
            <span className="flex items-center gap-2 text-xs text-neutral-500">
              <span className="w-4 h-0.5 bg-indigo-600 rounded" /> Actual
            </span>
            <span className="flex items-center gap-2 text-xs text-neutral-500">
              <span className="w-4 h-0.5 bg-indigo-200 rounded" /> Potential
            </span>
          </div>
        </div>
      </div>

      {/* Movo Handle Modal */}
      <Modal
        open={movoModalOpen}
        onClose={() => setMovoModalOpen(false)}
        title="Let Movo handle it"
        subtitle="Preview the message Movo will send"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setMovoModalOpen(false)}>Cancel</Button>
            <Button icon={<Send className="w-4 h-4" />} onClick={() => {
              if (selectedOpportunity) {
                if (selectedOpportunity.id.startsWith('lead-')) {
                  updateLeadStatus(selectedOpportunity.id, 'contacted')
                } else {
                  updateRetentionStatus(selectedOpportunity.id, 'contacted')
                }
              }
              setMovoModalOpen(false)
            }}>
              Send message
            </Button>
          </>
        }
      >
        {selectedOpportunity && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
              <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-neutral-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900">Message to {selectedOpportunity.customerName}</p>
                <p className="text-xs text-neutral-400">via WhatsApp</p>
              </div>
            </div>
            <div className="bg-neutral-50 rounded-lg p-4 text-sm text-neutral-700 leading-relaxed border border-neutral-100">
              <p>Hi {selectedOpportunity.customerName.split(' ')[0]},</p>
              <p className="mt-2">Hope you're doing well! This is from Detailing Street, Indore.</p>
              <p className="mt-2">
                {selectedOpportunity.category === 'dormant' ? (
                  <>It's been a while since your last visit. We'd love to have your car back for a {selectedOpportunity.serviceInfo}. We have some great offers running this month!</>
                ) : (
                  <>We noticed you were interested in {selectedOpportunity.serviceInfo}{selectedOpportunity.vehicleInfo ? ` for your ${selectedOpportunity.vehicleInfo}` : ''}. {selectedOpportunity.amount > 0 ? `Your quote of ${formatCurrency(selectedOpportunity.amount)} is still valid.` : ''} Would you like to schedule an appointment? We have slots available this week.</>
                )}
              </p>
              <p className="mt-2">Let us know if you have any questions!</p>
            </div>
            <p className="text-xs text-neutral-400">Generated by Movo AI — you can edit before sending</p>
          </div>
        )}
      </Modal>

      {/* Retention Engine */}
      <div className="mt-8">
        <RetentionEngine />
      </div>
    </div>
  )
}
