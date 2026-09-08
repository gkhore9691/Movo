import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '@/contexts/AppContext'
import { Card, CardHeader, Badge, Avatar, Button, Stat, Modal } from '@/components/ui'
import { formatCurrency, formatRelativeDate } from '@/utils/format'
import {
  Users, Phone, MessageSquare, CalendarPlus, ChevronDown, ChevronUp,
  Zap, Send, Bot, Clock, AlertTriangle, CheckCircle2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface RetentionGroup {
  label: string
  description: string
  icon: React.ReactNode
  color: string
  badgeVariant: 'warning' | 'danger' | 'default'
  items: RetentionRow[]
}

interface RetentionRow {
  customerId: string
  customerName: string
  vehicle: string
  lastVisit: string
  daysSinceVisit: number
  recommendedService: string
  estimatedValue: number
  status: string
}

export default function RetentionEngine() {
  const { retentionCustomers, customers, vehicles, getCustomer, updateRetentionStatus } = useApp()
  const navigate = useNavigate()
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    due: true,
    overdue: true,
    long_overdue: true,
  })
  const [campaignOpen, setCampaignOpen] = useState(false)
  const [movoHandleOpen, setMovoHandleOpen] = useState(false)

  const rows: RetentionRow[] = useMemo(() => {
    return retentionCustomers.map(rc => {
      const c = getCustomer(rc.customerId)
      const cv = vehicles.find(v => v.customerId === rc.customerId)
      return {
        customerId: rc.customerId,
        customerName: c?.name || 'Unknown',
        vehicle: cv ? `${cv.make} ${cv.model}` : 'N/A',
        lastVisit: rc.lastVisit,
        daysSinceVisit: rc.daysSinceVisit,
        recommendedService: rc.recommendedService,
        estimatedValue: rc.estimatedValue,
        status: rc.status,
      }
    })
  }, [retentionCustomers, getCustomer, vehicles])

  const groups: RetentionGroup[] = useMemo(() => {
    const dueNow = rows.filter(r => r.daysSinceVisit <= 60 && r.status !== 'declined')
    const overdue = rows.filter(r => r.daysSinceVisit > 60 && r.daysSinceVisit <= 120 && r.status !== 'declined')
    const longOverdue = rows.filter(r => r.daysSinceVisit > 120 && r.status !== 'declined')

    return [
      {
        label: 'Due Now',
        description: '0–60 days since last visit',
        icon: <Clock className="w-4 h-4" />,
        color: 'text-amber-600',
        badgeVariant: 'warning',
        items: dueNow,
      },
      {
        label: 'Overdue',
        description: '60–120 days since last visit',
        icon: <AlertTriangle className="w-4 h-4" />,
        color: 'text-rose-600',
        badgeVariant: 'danger',
        items: overdue,
      },
      {
        label: 'Long Overdue',
        description: '120+ days since last visit',
        icon: <AlertTriangle className="w-4 h-4" />,
        color: 'text-slate-600',
        badgeVariant: 'default',
        items: longOverdue,
      },
    ]
  }, [rows])

  const totalDue = rows.filter(r => r.status !== 'declined').length
  const totalPotential = rows.filter(r => r.status !== 'declined').reduce((s, r) => s + r.estimatedValue, 0)
  const contacted = rows.filter(r => r.status === 'contacted').length
  const booked = rows.filter(r => r.status === 'booked').length

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const actionableRows = rows.filter(r => r.status === 'due')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Retention Engine</h2>
          <p className="text-sm text-slate-500 mt-0.5">Customers who should return for service</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Send className="w-3.5 h-3.5" />} onClick={() => setCampaignOpen(true)}>
            Send Campaign
          </Button>
          <Button size="sm" icon={<Bot className="w-3.5 h-3.5" />} onClick={() => setMovoHandleOpen(true)}>
            Let Movo Handle
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Due for Follow-up" value={totalDue} icon={<Users className="w-5 h-5" />} />
        <Stat label="Revenue Potential" value={formatCurrency(totalPotential)} icon={<Zap className="w-5 h-5" />} />
        <Stat label="Already Contacted" value={contacted} icon={<MessageSquare className="w-5 h-5" />} />
        <Stat label="Booked" value={booked} icon={<CheckCircle2 className="w-5 h-5" />} />
      </div>

      <div className="space-y-4">
        {groups.map((group, gi) => {
          const key = ['due', 'overdue', 'long_overdue'][gi]
          const expanded = expandedGroups[key]
          const groupTotal = group.items.reduce((s, r) => s + r.estimatedValue, 0)

          return (
            <Card key={key} padding="none">
              <button
                onClick={() => toggleGroup(key)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={group.color}>{group.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{group.label}</span>
                      <Badge variant={group.badgeVariant} size="sm">{group.items.length}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{group.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-600">{formatCurrency(groupTotal)}</span>
                  {expanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {expanded && group.items.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-slate-100">
                      {group.items.map((row, i) => (
                        <div
                          key={row.customerId}
                          className={`flex items-center justify-between px-5 py-3 ${
                            i < group.items.length - 1 ? 'border-b border-slate-50' : ''
                          } hover:bg-slate-50 transition-colors`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar name={row.customerName} size="sm" />
                            <div>
                              <p className="text-sm font-medium text-slate-900">{row.customerName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-slate-500">{row.vehicle}</span>
                                <span className="text-slate-300">·</span>
                                <span className="text-xs text-slate-500">{row.daysSinceVisit} days ago</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-xs text-slate-500">{row.recommendedService}</p>
                              <p className="text-sm font-medium text-slate-900">{formatCurrency(row.estimatedValue)}</p>
                            </div>
                            {row.status === 'booked' ? (
                              <Badge variant="success" size="sm" dot>Booked</Badge>
                            ) : row.status === 'contacted' ? (
                              <Badge variant="primary" size="sm" dot>Contacted</Badge>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <button
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                                  onClick={() => {
                                    const cust = getCustomer(row.customerId)
                                    if (cust?.phone) window.open(`tel:${cust.phone}`)
                                  }}
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                                  onClick={() => {
                                    const cust = getCustomer(row.customerId)
                                    if (cust?.phone) {
                                      const num = cust.phone.replace(/\D/g, '').slice(-10)
                                      window.open(`https://wa.me/91${num}`)
                                    }
                                  }}
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                  onClick={() => navigate('/bookings')}
                                >
                                  <CalendarPlus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {expanded && group.items.length === 0 && (
                <div className="px-5 py-6 border-t border-slate-100 text-center">
                  <p className="text-sm text-slate-400">No customers in this group</p>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Campaign Modal */}
      <Modal
        open={campaignOpen}
        onClose={() => setCampaignOpen(false)}
        title="Send Retention Campaign"
        subtitle={`${actionableRows.length} customers will be contacted`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCampaignOpen(false)}>Cancel</Button>
            <Button icon={<Send className="w-4 h-4" />} onClick={() => {
              actionableRows.forEach(row => updateRetentionStatus(row.customerId, 'contacted'))
              setCampaignOpen(false)
            }}>
              Send All
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {actionableRows.map(row => (
            <div key={row.customerId} className="p-3 border border-slate-100 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Avatar name={row.customerName} size="sm" />
                  <span className="text-sm font-medium text-slate-900">{row.customerName}</span>
                </div>
                <span className="text-xs text-slate-500">{row.vehicle}</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Hi {row.customerName.split(' ')[0]}, it's been {row.daysSinceVisit} days since your last visit to Detailing Street.
                  Your {row.vehicle} is due for a <strong>{row.recommendedService}</strong>. Book now and keep your car in top condition!
                  Reply to schedule an appointment.
                </p>
              </div>
            </div>
          ))}
          {actionableRows.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">All customers have already been contacted or booked.</p>
          )}
        </div>
      </Modal>

      {/* Let Movo Handle Modal */}
      <Modal
        open={movoHandleOpen}
        onClose={() => setMovoHandleOpen(false)}
        title="Let Movo Handle It"
        subtitle="Movo AI will reach out to each customer automatically"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setMovoHandleOpen(false)}>Cancel</Button>
            <Button icon={<Bot className="w-4 h-4" />} onClick={() => {
              actionableRows.forEach(row => updateRetentionStatus(row.customerId, 'contacted'))
              setMovoHandleOpen(false)
            }}>
              Confirm & Activate
            </Button>
          </>
        }
      >
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <Bot className="w-5 h-5 text-indigo-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-indigo-900">Movo will automatically:</p>
              <ul className="text-xs text-indigo-700 mt-1 space-y-1 list-disc list-inside">
                <li>Send personalized WhatsApp messages to each customer</li>
                <li>Mention their specific vehicle and recommended service</li>
                <li>Offer convenient booking slots based on your availability</li>
                <li>Follow up once if no response within 48 hours</li>
                <li>Hand over to human if the customer has questions</li>
              </ul>
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-3">
          <strong>{actionableRows.length} customers</strong> will be contacted:
        </p>

        <div className="space-y-2">
          {actionableRows.map(row => (
            <div key={row.customerId} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50">
              <div className="flex items-center gap-2">
                <Avatar name={row.customerName} size="sm" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{row.customerName}</p>
                  <p className="text-xs text-slate-500">{row.vehicle} · {row.recommendedService}</p>
                </div>
              </div>
              <span className="text-sm font-medium text-slate-700">{formatCurrency(row.estimatedValue)}</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
