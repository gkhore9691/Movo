import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, IndianRupee, AlertCircle, TrendingUp, Smartphone, Banknote, FileText, Send, Download, CheckCircle2, Plus } from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import { Card, Stat, Tabs, StatusBadge, Badge, Button, Modal, Select } from '@/components/ui'
import { api } from '@/api/client'
import { formatCurrency, formatDate } from '@/utils/format'
import type { Invoice, InvoiceStatus } from '@/types'

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'paid', label: 'Paid' },
  { id: 'pending', label: 'Pending' },
  { id: 'overdue', label: 'Overdue' },
]

export default function Payments() {
  const { invoices, jobs, customers, services, getCustomer, getService, updateInvoiceStatus } = useApp()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('all')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showCreateInvoice, setShowCreateInvoice] = useState(false)

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const outstanding = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.balance, 0)
  const overdueCount = invoices.filter(i => i.status === 'overdue').length

  const thisMonthRevenue = useMemo(() => {
    const now = new Date()
    return invoices
      .filter(i => {
        if (i.status !== 'paid' || !i.paidAt) return false
        const d = new Date(i.paidAt)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .reduce((s, i) => s + i.amount, 0)
  }, [invoices])

  const tabCounts = useMemo(() => ({
    all: invoices.length,
    paid: invoices.filter(i => i.status === 'paid').length,
    pending: invoices.filter(i => i.status === 'sent' || i.status === 'draft').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
  }), [invoices])

  const filtered = useMemo(() => {
    if (activeTab === 'all') return invoices
    if (activeTab === 'paid') return invoices.filter(i => i.status === 'paid')
    if (activeTab === 'pending') return invoices.filter(i => i.status === 'sent' || i.status === 'draft')
    return invoices.filter(i => i.status === 'overdue')
  }, [invoices, activeTab])

  function getJobServices(jobId: string): string {
    const job = jobs.find(j => j.id === jobId)
    if (!job) return 'Service'
    return job.serviceIds.map(id => getService(id)?.name ?? 'Service').join(', ')
  }

  function getInvoiceNumber(id: string): string {
    const num = id.replace('inv-', '')
    return `INV-${num.padStart(3, '0')}`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Payments</h1>
          <p className="text-sm text-slate-500 mt-0.5">Invoices and payment tracking</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreateInvoice(true)}>Create Invoice</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat
          label="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={<IndianRupee className="w-5 h-5" />}
          trend={{ value: 12, positive: true }}
        />
        <Stat label="Outstanding" value={formatCurrency(outstanding)} icon={<CreditCard className="w-5 h-5" />} />
        <Stat label="Overdue" value={overdueCount} icon={<AlertCircle className="w-5 h-5" />} />
        <Stat label="This Month" value={formatCurrency(thisMonthRevenue)} icon={<TrendingUp className="w-5 h-5" />} />
      </div>

      <Tabs
        tabs={TABS.map(t => ({ ...t, count: tabCounts[t.id as keyof typeof tabCounts] }))}
        active={activeTab}
        onChange={setActiveTab}
        className="mb-6"
      />

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_1.2fr_1fr_0.7fr_0.7fr_0.7fr_0.6fr_0.5fr] gap-4 px-5 py-3 border-b border-slate-100 text-xs font-medium text-slate-500 uppercase tracking-wide">
          <span>Invoice</span>
          <span>Customer</span>
          <span>Service</span>
          <span>Amount</span>
          <span>Deposit</span>
          <span>Balance</span>
          <span>Status</span>
          <span>Method</span>
        </div>

        {filtered.map(invoice => {
          const customer = getCustomer(invoice.customerId)
          const svcText = getJobServices(invoice.jobId)

          return (
            <div
              key={invoice.id}
              onClick={() => setSelectedInvoice(invoice)}
              className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr_1fr_0.7fr_0.7fr_0.7fr_0.6fr_0.5fr] gap-2 md:gap-4 px-5 py-4 border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer transition-colors"
            >
              <div>
                <span className="text-sm font-mono font-medium text-slate-900">
                  {getInvoiceNumber(invoice.id)}
                </span>
                <p className="text-xs text-slate-400 md:hidden mt-0.5">{customer?.name}</p>
              </div>
              <button
                className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline hidden md:block truncate cursor-pointer"
                onClick={(e) => { e.stopPropagation(); navigate(`/customers/${invoice.customerId}`) }}
              >{customer?.name ?? 'Unknown'}</button>
              <span className="text-sm text-slate-600 hidden md:block truncate">{svcText}</span>
              <span className="text-sm font-semibold text-slate-900">{formatCurrency(invoice.amount)}</span>
              <span className="text-sm text-slate-500 hidden md:block">{formatCurrency(invoice.deposit)}</span>
              <span className={`text-sm font-medium hidden md:block ${invoice.balance > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                {invoice.balance > 0 ? formatCurrency(invoice.balance) : '—'}
              </span>
              <div className="hidden md:block">
                <StatusBadge status={invoice.status} />
              </div>
              <div className="hidden md:flex items-center gap-1.5">
                <PaymentMethodIcon method={invoice.paymentMethod} />
                <span className="text-xs text-slate-500 capitalize">{invoice.paymentMethod ?? '—'}</span>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No invoices in this category</p>
          </div>
        )}
      </div>

      <CreateInvoiceModal
        open={showCreateInvoice}
        onClose={() => setShowCreateInvoice(false)}
        customers={customers}
        jobs={jobs}
        getService={getService}
      />

      <InvoiceModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        getCustomer={getCustomer}
        getJobServices={getJobServices}
        getInvoiceNumber={getInvoiceNumber}
        jobs={jobs}
        getService={getService}
        updateInvoiceStatus={updateInvoiceStatus}
      />
    </div>
  )
}

function InvoiceModal({
  invoice,
  onClose,
  getCustomer,
  getJobServices,
  getInvoiceNumber,
  jobs,
  getService,
  updateInvoiceStatus,
}: {
  invoice: Invoice | null
  onClose: () => void
  getCustomer: (id: string) => any
  getJobServices: (jobId: string) => string
  getInvoiceNumber: (id: string) => string
  jobs: any[]
  getService: (id: string) => any
  updateInvoiceStatus: (id: string, status: InvoiceStatus, method?: string) => void
}) {
  const [sentConfirm, setSentConfirm] = useState(false)
  const [showPaymentMethod, setShowPaymentMethod] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<string>('upi')
  const { currentTenant } = useApp()
  const navigate = useNavigate()
  if (!invoice) return null

  const customer = getCustomer(invoice.customerId)
  const job = jobs.find((j: any) => j.id === invoice.jobId)
  const lineItems = job?.serviceIds.map((id: string) => {
    const svc = getService(id)
    return { name: svc?.name ?? 'Service', amount: invoice.amount / (job?.serviceIds.length ?? 1) }
  }) ?? [{ name: getJobServices(invoice.jobId), amount: invoice.amount }]

  const subtotal = invoice.amount
  const gst = Math.round(subtotal * 0.18)
  const total = subtotal + gst

  return (
    <Modal
      open={!!invoice}
      onClose={onClose}
      title="Invoice"
      subtitle={getInvoiceNumber(invoice.id)}
      size="lg"
      footer={
        <>
          {invoice.status !== 'paid' && (
            <Button variant="primary" icon={<CheckCircle2 className="w-4 h-4" />} onClick={() => setShowPaymentMethod(true)}>
              Mark Paid
            </Button>
          )}
          <Button variant="secondary" icon={<Send className="w-4 h-4" />} onClick={() => { updateInvoiceStatus(invoice.id, 'sent'); setSentConfirm(true); setTimeout(() => setSentConfirm(false), 2000) }}>
            {sentConfirm ? 'Sent ✓' : 'Send to Customer'}
          </Button>
          <Button variant="ghost" icon={<Download className="w-4 h-4" />} onClick={() => window.print()}>
            Download
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{currentTenant?.name ?? 'Business Name'}</h3>
            {currentTenant?.address && (
              <p className="text-sm text-slate-500">{currentTenant.address}, {currentTenant.city}, {currentTenant.state}</p>
            )}
            {currentTenant?.gstNumber && (
              <p className="text-sm text-slate-500">GSTIN: {currentTenant.gstNumber}</p>
            )}
            {currentTenant?.phone && (
              <p className="text-sm text-slate-500">Phone: {currentTenant.phone}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm font-mono font-bold text-slate-900">{getInvoiceNumber(invoice.id)}</p>
            <p className="text-sm text-slate-500">{formatDate(invoice.createdAt)}</p>
            <div className="mt-2">
              <StatusBadge status={invoice.status} />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Bill To</p>
          <button
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
            onClick={() => { navigate(`/customers/${invoice.customerId}`); onClose() }}
          >{customer?.name}</button>
          <p className="text-sm text-slate-500">{customer?.address}</p>
          <p className="text-sm text-slate-500">{customer?.phone}</p>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500 uppercase tracking-wide">
            <span>Service</span>
            <span>Qty</span>
            <span className="text-right">Amount</span>
          </div>
          {lineItems.map((item: { name: string; amount: number }, i: number) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 border-b border-slate-50">
              <span className="text-sm text-slate-900">{item.name}</span>
              <span className="text-sm text-slate-500 text-center">1</span>
              <span className="text-sm font-medium text-slate-900 text-right">{formatCurrency(Math.round(item.amount))}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span className="text-slate-900">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">GST (18%)</span>
            <span className="text-slate-900">{formatCurrency(gst)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-2">
            <span className="text-slate-900">Total</span>
            <span className="text-slate-900">{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Deposit Paid</span>
            <span className="text-emerald-600 font-medium">{formatCurrency(invoice.deposit)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold">
            <span className="text-slate-900">Balance Due</span>
            <span className={invoice.balance > 0 ? 'text-amber-600' : 'text-emerald-600'}>
              {formatCurrency(invoice.balance > 0 ? invoice.balance + gst : 0)}
            </span>
          </div>
          {invoice.paymentMethod && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Payment Method</span>
              <span className="text-slate-700 capitalize flex items-center gap-1.5">
                <PaymentMethodIcon method={invoice.paymentMethod} />
                {invoice.paymentMethod}
              </span>
            </div>
          )}
          {invoice.paidAt && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Paid On</span>
              <span className="text-slate-700">{formatDate(invoice.paidAt)}</span>
            </div>
          )}
        </div>
      </div>
      {showPaymentMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Select Payment Method</h3>
            <div className="space-y-2 mb-6">
              {([
                { value: 'upi', label: 'UPI', icon: <Smartphone className="w-4 h-4 text-indigo-500" /> },
                { value: 'cash', label: 'Cash', icon: <Banknote className="w-4 h-4 text-emerald-500" /> },
                { value: 'card', label: 'Card', icon: <CreditCard className="w-4 h-4 text-blue-500" /> },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedMethod(opt.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${
                    selectedMethod === opt.value
                      ? 'bg-indigo-50 border-indigo-200'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.icon}
                  <span className="text-sm font-medium text-slate-900">{opt.label}</span>
                  {selectedMethod === opt.value && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 ml-auto" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowPaymentMethod(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  updateInvoiceStatus(invoice.id, 'paid', selectedMethod)
                  setShowPaymentMethod(false)
                  onClose()
                }}
              >
                Confirm Payment
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

function CreateInvoiceModal({
  open,
  onClose,
  customers,
  jobs,
  getService,
}: {
  open: boolean
  onClose: () => void
  customers: any[]
  jobs: any[]
  getService: (id: string) => any
}) {
  const [customerId, setCustomerId] = useState('')
  const [jobId, setJobId] = useState('')
  const [amount, setAmount] = useState('')
  const [deposit, setDeposit] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const customerJobs = customerId
    ? jobs.filter(j => j.customerId === customerId)
    : []

  const inputClass = "w-full rounded-lg border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"

  async function handleCreate() {
    if (!customerId || !amount) return
    setSaving(true)
    try {
      await api.post('/invoices', {
        customerId,
        jobId: jobId || undefined,
        amount: Number(amount),
        deposit: Number(deposit) || 0,
        notes,
        status: 'draft',
      })
      setCustomerId('')
      setJobId('')
      setAmount('')
      setDeposit('')
      setNotes('')
      onClose()
      window.location.reload()
    } catch (err) {
      console.error('Failed to create invoice', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Invoice"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={!customerId || !amount || saving} onClick={handleCreate}>
            {saving ? 'Creating...' : 'Create Invoice'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Customer *"
          placeholder="Select a customer"
          value={customerId}
          onChange={e => { setCustomerId(e.target.value); setJobId('') }}
          options={customers.map(c => ({ value: c.id, label: c.name }))}
        />

        {customerId && customerJobs.length > 0 && (
          <Select
            label="Job (optional)"
            placeholder="Select a job"
            value={jobId}
            onChange={e => setJobId(e.target.value)}
            options={customerJobs.map(j => ({
              value: j.id,
              label: `${j.serviceIds.map((sid: string) => getService(sid)?.name || 'Service').join(', ')} — ${j.status}`,
            }))}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount *</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Deposit</label>
            <input
              type="number"
              value={deposit}
              onChange={e => setDeposit(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Optional notes..."
            className={`${inputClass} resize-none`}
          />
        </div>
      </div>
    </Modal>
  )
}

function PaymentMethodIcon({ method }: { method?: string }) {
  switch (method) {
    case 'upi': return <Smartphone className="w-4 h-4 text-indigo-500" />
    case 'card': return <CreditCard className="w-4 h-4 text-blue-500" />
    case 'cash': return <Banknote className="w-4 h-4 text-emerald-500" />
    default: return <CreditCard className="w-4 h-4 text-slate-400" />
  }
}
