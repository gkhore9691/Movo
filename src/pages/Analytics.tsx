import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Users, Wrench } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useApp } from '@/contexts/AppContext'
import { Card, CardHeader, Stat, Tabs, Badge } from '@/components/ui'
import { formatCurrency } from '@/utils/format'

const revenueData = [
  { day: 'Mon', revenue: 28500 },
  { day: 'Tue', revenue: 42800 },
  { day: 'Wed', revenue: 35200 },
  { day: 'Thu', revenue: 51000 },
  { day: 'Fri', revenue: 38600 },
  { day: 'Sat', revenue: 64200 },
  { day: 'Sun', revenue: 12000 },
]

const customerTrend = [
  { week: 'W1', new: 5, repeat: 8 },
  { week: 'W2', new: 7, repeat: 6 },
  { week: 'W3', new: 4, repeat: 10 },
  { week: 'W4', new: 8, repeat: 7 },
  { week: 'W5', new: 6, repeat: 11 },
  { week: 'W6', new: 9, repeat: 9 },
]

const CHART_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4']

const stageTime = [
  { stage: 'Enquiry → Booked', avgHours: 18 },
  { stage: 'Booked → Received', avgHours: 48 },
  { stage: 'Inspection', avgHours: 4 },
  { stage: 'Work in Progress', avgHours: 36 },
  { stage: 'Quality Check', avgHours: 6 },
  { stage: 'Ready → Delivered', avgHours: 8 },
]

export default function Analytics() {
  const { invoices, leads, jobs, customers, staff, services } = useApp()
  const [period, setPeriod] = useState('week')

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
      { name: 'New', count: leads.filter(l => l.status === 'new').length, color: '#94a3b8' },
      { name: 'Contacted', count: leads.filter(l => l.status === 'contacted').length, color: '#3b82f6' },
      { name: 'Quoted', count: leads.filter(l => l.status === 'quoted').length, color: '#4f46e5' },
      { name: 'Negotiation', count: leads.filter(l => l.status === 'negotiation').length, color: '#f59e0b' },
      { name: 'Won', count: leads.filter(l => l.status === 'won').length, color: '#10b981' },
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

  const periodTabs = [
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'quarter', label: 'This Quarter' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Business performance at a glance</p>
        </div>
        <Tabs tabs={periodTabs} active={period} onChange={setPeriod} />
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
            <CardHeader title="Revenue Trend" subtitle="Daily revenue this week" />
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: unknown) => [formatCurrency(Number(value)), 'Revenue']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#4f46e5"
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
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
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
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                      }}
                    />
                    <Legend
                      verticalAlign="middle"
                      align="right"
                      layout="vertical"
                      iconSize={8}
                      formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-400 text-center w-full">No revenue data yet</p>
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
                    dataKey="week"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    iconSize={8}
                    formatter={(value) => <span className="text-xs text-slate-600 capitalize">{value}</span>}
                  />
                  <Line
                    type="monotone"
                    dataKey="new"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="repeat"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    dot={{ fill: '#4f46e5', r: 3 }}
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
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Avg. Time per Stage</h4>
              <div className="space-y-2">
                {stageTime.map(st => (
                  <div key={st.stage} className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 w-40 truncate">{st.stage}</span>
                    <div className="flex-1 mx-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-400 rounded-full"
                        style={{ width: `${Math.min((st.avgHours / 48) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-12 text-right">
                      {st.avgHours >= 24 ? `${Math.round(st.avgHours / 24)}d` : `${st.avgHours}h`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Current Workload</h4>
              <div className="space-y-2">
                {workload.map(w => (
                  <div key={w.name} className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 w-20">{w.name}</span>
                    <div className="flex-1 mx-3 flex items-center gap-1">
                      {Array.from({ length: Math.max(w.active, 0) }).map((_, i) => (
                        <div key={i} className="w-4 h-4 rounded bg-indigo-100 border border-indigo-200" />
                      ))}
                      {w.active === 0 && <span className="text-xs text-slate-400">No active jobs</span>}
                    </div>
                    <span className="text-xs font-medium text-slate-700">{w.active} active</span>
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
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {customer?.name || 'Customer'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {inv.id.toUpperCase()} · Balance: {formatCurrency(inv.balance)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">{formatCurrency(inv.amount)}</p>
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
              <p className="text-sm text-slate-400 text-center py-8">All payments collected!</p>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
