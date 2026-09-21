import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Users, Wrench } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useApp } from '@/contexts/AppContext'
import { Card, CardHeader, Stat, Badge } from '@/components/ui'
import { formatCurrency } from '@/utils/format'

const CHART_COLORS = ['#818cf8', '#34d399', '#fbbf24', '#fb7185', '#a78bfa', '#22d3ee']

export default function Analytics() {
  const { invoices, leads, jobs, customers, staff, services } = useApp()
  const navigate = useNavigate()

  const revenueData = useMemo(() => {
    const months: Record<string, number> = {}
    invoices.filter(i => i.status === 'paid' && i.paidAt).forEach(inv => {
      const month = new Date(inv.paidAt!).toLocaleString('default', { month: 'short' })
      months[month] = (months[month] || 0) + inv.amount
    })
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const month = d.toLocaleString('default', { month: 'short' })
      return { month, revenue: months[month] || 0 }
    })
  }, [invoices])

  const customerTrend = useMemo(() => {
    const months: Record<string, { new: number; repeat: number }> = {}
    customers.forEach(c => {
      if (c.customerSince) {
        const month = new Date(c.customerSince).toLocaleString('default', { month: 'short' })
        if (!months[month]) months[month] = { new: 0, repeat: 0 }
        months[month].new += 1
        if (c.tags.includes('repeat') || c.tags.includes('converted-lead')) {
          months[month].repeat += 1
        }
      }
    })
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const month = d.toLocaleString('default', { month: 'short' })
      const data = months[month] || { new: 0, repeat: 0 }
      return { month, ...data }
    })
  }, [customers])

  const stageTimeData = useMemo(() => {
    const stagePairs = [
      { from: 'car_received' as const, to: 'inspection' as const, label: 'Receiving → Inspection' },
      { from: 'inspection' as const, to: 'work_in_progress' as const, label: 'Inspection → Work' },
      { from: 'work_in_progress' as const, to: 'quality_check' as const, label: 'Work → QC' },
      { from: 'quality_check' as const, to: 'ready' as const, label: 'QC → Ready' },
    ]
    return stagePairs.map(({ from, to, label }) => {
      const durations: number[] = []
      jobs.forEach(job => {
        const fromEntry = job.timeline.find(t => t.stage === from)
        const toEntry = job.timeline.find(t => t.stage === to)
        if (fromEntry && toEntry) {
          const hours = (new Date(toEntry.timestamp).getTime() - new Date(fromEntry.timestamp).getTime()) / 3600000
          if (hours > 0) durations.push(hours)
        }
      })
      const avg = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0
      return { stage: label, hours: Math.round(avg * 10) / 10 }
    })
  }, [jobs])

  const totalRevenue = useMemo(
    () => invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0),
    [invoices]
  )

  const jobsCompleted = useMemo(
    () => jobs.filter(j => j.status === 'delivered').length,
    [jobs]
  )

  const conversionRate = useMemo(() => {
    const won = leads.filter(l => l.status === 'won').length
    return leads.length > 0 ? Math.round((won / leads.length) * 100) : 0
  }, [leads])

  const leadFunnelData = useMemo(() => {
    const stages: { name: string; count: number; color: string }[] = [
      { name: 'New', count: leads.filter(l => l.status === 'new').length, color: 'rgba(255,255,255,0.3)' },
      { name: 'Contacted', count: leads.filter(l => l.status === 'contacted').length, color: '#60a5fa' },
      { name: 'Quoted', count: leads.filter(l => l.status === 'quoted').length, color: '#818cf8' },
      { name: 'Negotiation', count: leads.filter(l => l.status === 'negotiation').length, color: '#fbbf24' },
      { name: 'Won', count: leads.filter(l => l.status === 'won').length, color: '#34d399' },
    ]
    return stages
  }, [leads])

  const serviceRevenue = useMemo(() => {
    const map = new Map<string, number>()
    invoices.filter(i => i.status === 'paid').forEach(inv => {
      const job = jobs.find(j => j.id === inv.jobId)
      if (job) {
        job.serviceIds.forEach(sId => {
          const svc = services.find(s => s.id === sId)
          if (svc) {
            map.set(svc.name, (map.get(svc.name) || 0) + inv.amount / job.serviceIds.length)
          }
        })
      }
    })
    return Array.from(map.entries()).map(([name, value]) => ({ name, value: Math.round(value) }))
  }, [invoices, jobs, services])

  const workload = useMemo(() => {
    return staff
      .filter(s => s.role === 'technician' || s.role === 'manager')
      .map(s => ({
        name: s.name.split(' ')[0],
        active: s.activeJobs,
        completed: s.completedJobs,
      }))
  }, [staff])

  const outstandingInvoices = useMemo(
    () => invoices.filter(i => i.status === 'sent' || i.status === 'overdue'),
    [invoices]
  )

  const outstandingTotal = outstandingInvoices.reduce((sum, i) => sum + i.balance, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Analytics</h1>
        <p className="text-sm text-white/40 mt-1">Business performance at a glance</p>
      </div>

      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Stat
          label="Total Revenue"
          value={formatCurrency(totalRevenue)}
          trend={{ value: 18, positive: true }}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <Stat
          label="New Customers"
          value={customers.length}
          trend={{ value: 8, positive: true }}
          icon={<Users className="w-5 h-5" />}
        />
        <Stat
          label="Jobs Completed"
          value={jobsCompleted}
          icon={<Wrench className="w-5 h-5" />}
        />
        <Stat
          label="Conversion Rate"
          value={`${conversionRate}%`}
          trend={{ value: 5, positive: true }}
          icon={<BarChart3 className="w-5 h-5" />}
        />
      </motion.div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader title="Revenue Trend" subtitle="Monthly revenue (last 6 months)" />
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: unknown) => [formatCurrency(Number(value)), 'Revenue']}
                    contentStyle={{
                      background: '#282c3a',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      color: 'white',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#818cf8"
                    strokeWidth={2}
                    fill="url(#revenueGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Lead funnel */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardHeader title="Lead Funnel" subtitle="Leads at each pipeline stage" />
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadFunnelData} layout="vertical" barSize={20}>
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#282c3a',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      color: 'white',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {leadFunnelData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Service revenue */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader title="Revenue by Service" subtitle="Breakdown of paid invoices" />
            <div className="h-64 flex items-center">
              {serviceRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={serviceRevenue}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {serviceRevenue.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: unknown) => [formatCurrency(Number(value)), 'Revenue']}
                      contentStyle={{
                        background: '#282c3a',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 8,
                        color: 'white',
                        fontSize: '12px',
                      }}
                    />
                    <Legend
                      verticalAlign="middle"
                      align="right"
                      layout="vertical"
                      iconSize={8}
                      formatter={(value) => <span className="text-xs text-white/60">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-white/30 text-center w-full">No revenue data yet</p>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Customer trends */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card>
            <CardHeader title="Customer Trends" subtitle="New vs repeat customers" />
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={customerTrend}>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#282c3a',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      color: 'white',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    iconSize={8}
                    formatter={(value) => <span className="text-xs text-white/60 capitalize">{value}</span>}
                  />
                  <Line
                    type="monotone"
                    dataKey="new"
                    stroke="#34d399"
                    strokeWidth={2}
                    dot={{ fill: '#34d399', r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="repeat"
                    stroke="#818cf8"
                    strokeWidth={2}
                    dot={{ fill: '#818cf8', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Operations */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader title="Operations" subtitle="Average time per stage & workload" />

            <div className="mb-6">
              <h4 className="text-xs font-medium text-white/40 uppercase tracking-wide mb-3">Avg. Time per Stage</h4>
              <div className="space-y-2">
                {stageTimeData.map(st => (
                  <div key={st.stage} className="flex items-center justify-between">
                    <span className="text-xs text-white/60 w-40 truncate">{st.stage}</span>
                    <div className="flex-1 mx-3 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#818cf8] rounded-full"
                        style={{ width: `${Math.min((st.hours / 48) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-white/40 w-12 text-right">
                      {st.hours >= 24 ? `${Math.round(st.hours / 24)}d` : `${st.hours}h`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-medium text-white/40 uppercase tracking-wide mb-3">Current Workload</h4>
              <div className="space-y-2">
                {workload.map(w => (
                  <div key={w.name} className="flex items-center justify-between">
                    <span className="text-xs text-white/60 w-20">{w.name}</span>
                    <div className="flex-1 mx-3 flex items-center gap-1">
                      {Array.from({ length: Math.max(w.active, 0) }).map((_, i) => (
                        <div key={i} className="w-4 h-4 rounded bg-[#6366f1]/10 border border-[#6366f1]/20" />
                      ))}
                      {w.active === 0 && <span className="text-xs text-white/30">No active jobs</span>}
                    </div>
                    <span className="text-xs font-medium text-white/70">{w.active} active</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Outstanding payments */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card>
            <CardHeader
              title="Outstanding Payments"
              subtitle={`${formatCurrency(outstandingTotal)} pending collection`}
            />

            {outstandingInvoices.length > 0 ? (
              <div className="space-y-2">
                {outstandingInvoices.map(inv => {
                  const customer = customers.find(c => c.id === inv.customerId)
                  return (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg cursor-pointer hover:bg-white/[0.06] transition-colors"
                      onClick={() => navigate('/payments')}
                    >
                      <div>
                        <p className="text-sm font-medium text-white/70">
                          {customer?.name || 'Customer'}
                        </p>
                        <p className="text-xs text-white/40">
                          {inv.id.toUpperCase()} · Balance: {formatCurrency(inv.balance)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">{formatCurrency(inv.amount)}</p>
                        <Badge
                          variant={inv.status === 'overdue' ? 'danger' : 'warning'}
                          size="sm"
                        >
                          {inv.status}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-white/30 text-center py-8">All payments collected!</p>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
