import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import { StatusBadge } from '@/components/ui'
import { formatCurrency, formatTime, formatRelativeDate, getGreeting } from '@/utils/format'

export default function Pulse() {
  const {
    jobs, leads, bookings, invoices, notifications, retentionCustomers, conversations,
    getCustomer, getVehicle, getService, getStaffMember,
  } = useApp()
  const navigate = useNavigate()

  const todaysRevenue = useMemo(() =>
    invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0),
    [invoices],
  )

  const todaysBookings = useMemo(() =>
    bookings.filter(b => b.status === 'confirmed' || b.status === 'in_progress'),
    [bookings],
  )

  const carsInStudio = useMemo(() =>
    jobs.filter(j =>
      ['car_received', 'inspection', 'work_in_progress', 'quality_check', 'ready'].includes(j.status),
    ),
    [jobs],
  )

  const openEnquiries = useMemo(() =>
    leads.filter(l => l.status === 'new' || l.status === 'contacted'),
    [leads],
  )

  const followUpsDue = useMemo(() =>
    retentionCustomers.filter(r => r.status === 'due').length + leads.filter(l => l.status === 'quoted').length,
    [retentionCustomers, leads],
  )

  const activeJobs = useMemo(() =>
    jobs.filter(j => j.status !== 'delivered').slice(0, 6),
    [jobs],
  )

  const recentNotifications = useMemo(() =>
    [...notifications].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5),
    [notifications],
  )

  const recommendations = useMemo(() => {
    const recs: { emoji: string; title: string; description: string; action: string; route: string }[] = []

    const hotLead = leads.find(l => l.status === 'quoted' && l.quotedPrice > 0)
    if (hotLead) {
      const customer = getCustomer(hotLead.customerId)
      recs.push({
        emoji: '🔥',
        title: `${customer?.name || 'A lead'} is likely to book`,
        description: `Quoted ${formatCurrency(hotLead.quotedPrice)} recently. No response yet.`,
        action: 'Follow up',
        route: '/leads',
      })
    }

    const pendingQuotes = leads.filter(l => ['quoted', 'negotiation', 'contacted'].includes(l.status))
    const pendingRevenue = pendingQuotes.reduce((sum, l) => sum + l.quotedPrice, 0)
    if (pendingRevenue > 0) {
      recs.push({
        emoji: '💰',
        title: `${formatCurrency(pendingRevenue)} potential revenue`,
        description: `${pendingQuotes.length} customers received quotes but haven't booked.`,
        action: 'Review leads',
        route: '/revenue-radar',
      })
    }

    const dueCustomers = retentionCustomers.filter(r => r.status === 'due')
    if (dueCustomers.length > 0) {
      recs.push({
        emoji: '🔁',
        title: `${dueCustomers.length} customers are due for maintenance`,
        description: 'Send reminders to bring them back to the studio.',
        action: 'Start campaign',
        route: '/revenue-radar',
      })
    }

    const unreadConvos = conversations.filter(c => c.unreadCount > 0)
    if (unreadConvos.length > 0) {
      recs.push({
        emoji: '💬',
        title: `${unreadConvos.length} unread conversations`,
        description: 'AI has handled initial responses. Review if needed.',
        action: 'View',
        route: '/ai-receptionist',
      })
    }

    const readyJobs = jobs.filter(j => j.status === 'ready')
    if (readyJobs.length > 0) {
      recs.push({
        emoji: '⚡',
        title: `${readyJobs.length} car${readyJobs.length > 1 ? 's' : ''} ready for delivery`,
        description: 'Quality check passed. Notify customers for pickup.',
        action: 'View jobs',
        route: '/jobs',
      })
    }

    return recs
  }, [leads, retentionCustomers, conversations, jobs, getCustomer])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="space-y-8"
    >
      {/* Greeting — just text */}
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">{getGreeting()}, Shivesh</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Your studio has {carsInStudio.length} cars in progress and {followUpsDue} follow-ups due.
        </p>
      </div>

      {/* Stats — clean white cards, no icons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Revenue", value: formatCurrency(todaysRevenue), trend: '+12%', up: true },
          { label: "Today's Bookings", value: String(todaysBookings.length), trend: '+8%', up: true },
          { label: 'Cars in Studio', value: String(carsInStudio.length), trend: null, up: true },
          { label: 'Open Enquiries', value: String(openEnquiries.length), trend: '-5%', up: false },
        ].map(s => (
          <div key={s.label} className="bg-white border border-neutral-200 rounded-xl p-5">
            <p className="text-xs text-neutral-500 font-medium">{s.label}</p>
            <p className="text-2xl font-semibold text-neutral-900 mt-1 tracking-tight">{s.value}</p>
            {s.trend && (
              <p className={`text-xs mt-1 ${s.up ? 'text-emerald-600' : 'text-red-600'}`}>{s.trend} vs last week</p>
            )}
          </div>
        ))}
      </div>

      {/* Recommendations — uniform white cards */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
          <h2 className="text-sm font-medium text-neutral-900">Recommendations</h2>
        </div>
        <div className="space-y-3">
          {recommendations.map((rec, i) => (
            <div
              key={i}
              onClick={() => navigate(rec.route)}
              className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-neutral-300 transition-colors"
            >
              <span className="text-lg shrink-0">{rec.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900">{rec.title}</p>
                <p className="text-sm text-neutral-500 mt-0.5">{rec.description}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); navigate(rec.route) }}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium shrink-0 hidden sm:flex items-center gap-1"
              >
                {rec.action} <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <ChevronRight className="w-4 h-4 text-neutral-300 sm:hidden shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Two column: Schedule + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
            <h2 className="text-sm font-medium text-neutral-900">Today's Schedule</h2>
            <button
              onClick={() => navigate('/bookings')}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View all
            </button>
          </div>
          {todaysBookings.length === 0 ? (
            <p className="text-sm text-neutral-400 py-10 text-center">No bookings scheduled for today.</p>
          ) : (
            <div>
              {todaysBookings.map((booking, i) => {
                const customer = getCustomer(booking.customerId)
                const vehicle = getVehicle(booking.vehicleId)
                const serviceNames = booking.serviceIds.map(id => getService(id)?.name).filter(Boolean)
                return (
                  <div
                    key={booking.id}
                    className={`flex items-center gap-4 px-5 py-3.5 hover:bg-neutral-50 transition-colors cursor-pointer ${
                      i < todaysBookings.length - 1 ? 'border-b border-neutral-100' : ''
                    }`}
                    onClick={() => navigate('/bookings')}
                  >
                    <span className="text-sm font-mono text-neutral-400 w-16 shrink-0">
                      {formatTime(booking.time)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">{customer?.name}</p>
                      <p className="text-xs text-neutral-500 truncate">
                        {vehicle?.make} {vehicle?.model} · {serviceNames.join(', ')}
                      </p>
                    </div>
                    <span className="text-sm text-neutral-900 shrink-0">{formatCurrency(booking.estimatedPrice)}</span>
                    <StatusBadge status={booking.status} />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Active Jobs */}
          <div className="bg-white border border-neutral-200 rounded-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
              <h2 className="text-sm font-medium text-neutral-900">Active Jobs</h2>
              <button onClick={() => navigate('/jobs')} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                View all
              </button>
            </div>
            <div>
              {activeJobs.map((job, i) => {
                const customer = getCustomer(job.customerId)
                const vehicle = getVehicle(job.vehicleId)
                return (
                  <div
                    key={job.id}
                    className={`flex items-center gap-3 px-5 py-3 hover:bg-neutral-50 transition-colors cursor-pointer ${
                      i < activeJobs.length - 1 ? 'border-b border-neutral-100' : ''
                    }`}
                    onClick={() => navigate('/jobs')}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">
                        {vehicle?.make} {vehicle?.model}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">{customer?.name}</p>
                    </div>
                    <StatusBadge status={job.status} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white border border-neutral-200 rounded-xl">
            <div className="px-5 py-4 border-b border-neutral-100">
              <h2 className="text-sm font-medium text-neutral-900">Recent Activity</h2>
            </div>
            <div>
              {recentNotifications.map((notif, i) => (
                <div
                  key={notif.id}
                  className={`flex gap-3 px-5 py-3 ${
                    i < recentNotifications.length - 1 ? 'border-b border-neutral-100' : ''
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                    notif.read ? 'bg-neutral-300' : 'bg-indigo-600'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-700 leading-snug">{notif.description}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">{formatRelativeDate(notif.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
