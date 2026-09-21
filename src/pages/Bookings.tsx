import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Clock, Check, X as XIcon,
} from 'lucide-react'
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns'
import { useApp } from '@/contexts/AppContext'
import {
  Button, Card, Stat, StatusBadge, Avatar, Modal, Tabs, SearchInput, Input, Select,
} from '@/components/ui'
import { formatCurrency, formatTime } from '@/utils/format'
import type { Booking, BookingStatus } from '@/types'

const MAX_SLOTS_PER_DAY = 6

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
]

export default function Bookings() {
  const {
    bookings, customers, vehicles, services,
    addBooking, updateBookingStatus, getCustomer, getVehicle, getService,
    startJobFromBooking, addCustomer, addVehicle,
  } = useApp()

  const [searchParams] = useSearchParams()
  const prefillName = searchParams.get('leadName')
  const prefillPhone = searchParams.get('leadPhone')

  const [view, setView] = useState('calendar')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [showNewBooking, setShowNewBooking] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (prefillName || prefillPhone) {
      setShowNewBooking(true)
    }
  }, [prefillName, prefillPhone])

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }, [weekStart])

  const todayBookings = useMemo(() =>
    bookings.filter(b => {
      try {
        return isSameDay(parseISO(b.date), new Date())
      } catch {
        return b.date === format(new Date(), 'yyyy-MM-dd')
      }
    }),
    [bookings]
  )

  const thisWeekBookings = useMemo(() =>
    bookings.filter(b => {
      try {
        const d = parseISO(b.date)
        return d >= weekStart && d < addDays(weekStart, 7)
      } catch {
        return false
      }
    }),
    [bookings, weekStart]
  )

  const pendingDeposits = useMemo(() =>
    bookings
      .filter(b => b.status === 'confirmed' && b.deposit === 0 && b.estimatedPrice > 0)
      .length,
    [bookings]
  )

  const weekValue = useMemo(() =>
    thisWeekBookings.reduce((s, b) => s + b.estimatedPrice, 0),
    [thisWeekBookings]
  )

  function getBookingsForDay(day: Date): Booking[] {
    return bookings.filter(b => {
      try {
        return isSameDay(parseISO(b.date), day)
      } catch {
        return b.date === format(day, 'yyyy-MM-dd')
      }
    }).sort((a, b) => a.time.localeCompare(b.time))
  }

  const filteredBookings = useMemo(() => {
    if (!search) return [...bookings].sort((a, b) => b.date.localeCompare(a.date))
    const q = search.toLowerCase()
    return bookings.filter(b => {
      const cust = getCustomer(b.customerId)
      const veh = getVehicle(b.vehicleId)
      return (
        cust?.name.toLowerCase().includes(q) ||
        veh?.make.toLowerCase().includes(q) ||
        veh?.model.toLowerCase().includes(q)
      )
    }).sort((a, b) => b.date.localeCompare(a.date))
  }, [bookings, search, getCustomer, getVehicle])

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Bookings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage studio appointments</p>
        </div>
        <div className="flex items-center gap-3">
          {view === 'list' && (
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search bookings..."
              className="w-64"
            />
          )}
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowNewBooking(true)}>
            New Booking
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Today's Bookings" value={todayBookings.length} icon={<CalendarIcon className="w-5 h-5" />} />
        <Stat label="This Week" value={thisWeekBookings.length} icon={<Clock className="w-5 h-5" />} />
        <Stat label="Pending Deposits" value={pendingDeposits} icon={<XIcon className="w-5 h-5" />} />
        <Stat label="Week Value" value={formatCurrency(weekValue)} icon={<Check className="w-5 h-5" />} />
      </div>

      {/* View Toggle */}
      <Tabs
        tabs={[
          { id: 'calendar', label: 'Calendar' },
          { id: 'list', label: 'List', count: bookings.length },
        ]}
        active={view}
        onChange={setView}
        className="mb-6"
      />

      {/* Calendar View */}
      {view === 'calendar' && (
        <div>
          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setWeekStart(prev => addDays(prev, -7))}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-semibold text-slate-900">
              {format(weekStart, 'MMM d')} — {format(addDays(weekStart, 6), 'MMM d, yyyy')}
            </h2>
            <button
              onClick={() => setWeekStart(prev => addDays(prev, 7))}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Week Grid */}
          <div className="grid grid-cols-7 gap-3">
            {weekDays.map(day => {
              const dayBookings = getBookingsForDay(day)
              const isToday = isSameDay(day, new Date())
              const slotCount = dayBookings.length
              return (
                <div
                  key={day.toISOString()}
                  className={`border rounded-xl overflow-hidden min-h-[280px] ${
                    isToday ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200 bg-white'
                  }`}
                >
                  {/* Day Header */}
                  <div className={`px-3 py-2 border-b ${isToday ? 'border-indigo-200 bg-indigo-50' : 'border-slate-100 bg-slate-50'}`}>
                    <p className={`text-xs font-medium ${isToday ? 'text-indigo-600' : 'text-slate-500'}`}>
                      {format(day, 'EEE')}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className={`text-lg font-semibold ${isToday ? 'text-indigo-700' : 'text-slate-900'}`}>
                        {format(day, 'd')}
                      </p>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        slotCount >= MAX_SLOTS_PER_DAY
                          ? 'bg-rose-100 text-rose-600'
                          : slotCount >= MAX_SLOTS_PER_DAY - 2
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-slate-100 text-slate-500'
                      }`}>
                        {slotCount}/{MAX_SLOTS_PER_DAY}
                      </span>
                    </div>
                  </div>

                  {/* Bookings */}
                  <div className="p-2 space-y-1.5">
                    {dayBookings.map(booking => {
                      const cust = getCustomer(booking.customerId)
                      const veh = getVehicle(booking.vehicleId)
                      const svc = booking.serviceIds.map(id => getService(id)?.name).filter(Boolean)
                      return (
                        <motion.div
                          key={booking.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="bg-white border border-slate-100 rounded-lg p-2 hover:border-slate-200 cursor-pointer transition-all text-[11px]"
                          onClick={() => setSelectedBooking(booking)}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-semibold text-slate-900">{formatTime(booking.time)}</span>
                            <StatusBadge status={booking.status} />
                          </div>
                          <p className="font-medium text-slate-800 truncate">{cust?.name}</p>
                          <p className="text-slate-500 truncate">{veh ? `${veh.make} ${veh.model}` : ''}</p>
                          <p className="text-slate-400 truncate">{svc.join(', ')}</p>
                        </motion.div>
                      )
                    })}
                    {slotCount < MAX_SLOTS_PER_DAY && (
                      <button
                        onClick={() => setShowNewBooking(true)}
                        className="w-full flex items-center justify-center gap-1 py-2 rounded-lg border border-dashed border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors text-xs"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    )}
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
                  <th className="text-left font-medium text-slate-500 px-4 py-3">Date</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-3">Time</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-3">Customer</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-3">Vehicle</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-3">Service</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-3">Price</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-3">Deposit</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map(booking => {
                  const cust = getCustomer(booking.customerId)
                  const veh = getVehicle(booking.vehicleId)
                  const svcs = booking.serviceIds.map(id => getService(id)?.name).filter(Boolean)
                  return (
                    <tr
                      key={booking.id}
                      className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {format(parseISO(booking.date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatTime(booking.time)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={cust?.name ?? ''} size="sm" />
                          <span className="text-slate-900">{cust?.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{veh ? `${veh.make} ${veh.model}` : '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{svcs.join(', ')}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{formatCurrency(booking.estimatedPrice)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {booking.deposit > 0 ? formatCurrency(booking.deposit) : '—'}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={booking.status} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* New Booking Modal */}
      <NewBookingModal
        open={showNewBooking}
        onClose={() => setShowNewBooking(false)}
        customers={customers}
        vehicles={vehicles}
        services={services}
        addBooking={addBooking}
        prefillName={prefillName}
        prefillPhone={prefillPhone}
        addCustomer={addCustomer}
        addVehicle={addVehicle}
      />

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          getCustomer={getCustomer}
          getVehicle={getVehicle}
          getService={getService}
          onUpdateStatus={(status: BookingStatus) => {
            updateBookingStatus(selectedBooking.id, status)
            setSelectedBooking(null)
          }}
          onStartJob={() => {
            startJobFromBooking(selectedBooking.id)
            setSelectedBooking(null)
          }}
        />
      )}
    </div>
  )
}

function NewBookingModal({
  open,
  onClose,
  customers,
  vehicles,
  services,
  addBooking,
  prefillName,
  prefillPhone,
  addCustomer,
  addVehicle,
}: {
  open: boolean
  onClose: () => void
  customers: any[]
  vehicles: any[]
  services: any[]
  addBooking: (b: Booking) => void
  prefillName?: string | null
  prefillPhone?: string | null
  addCustomer: (c: any) => void
  addVehicle: (v: any) => void
}) {
  const [step, setStep] = useState(1)
  const [customerId, setCustomerId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [servicePrices, setServicePrices] = useState<Record<string, number>>({})
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [time, setTime] = useState('')
  const [deposit, setDeposit] = useState('')
  const [notes, setNotes] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')

  // New Customer inline
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustName, setNewCustName] = useState(prefillName ?? '')
  const [newCustPhone, setNewCustPhone] = useState(prefillPhone ?? '')

  // New Vehicle inline
  const [showNewVehicle, setShowNewVehicle] = useState(false)
  const [newVehMake, setNewVehMake] = useState('')
  const [newVehModel, setNewVehModel] = useState('')
  const [newVehReg, setNewVehReg] = useState('')
  const [newVehColor, setNewVehColor] = useState('')

  const filteredCustomers = customerSearch
    ? customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
    : customers

  const customerVehicles = customerId
    ? vehicles.filter(v => v.customerId === customerId)
    : []

  const servicesByCategory = useMemo(() => {
    const groups: Record<string, typeof services> = {}
    for (const svc of services) {
      const cat = svc.category || 'Other'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(svc)
    }
    return groups
  }, [services])

  const totalPrice = useMemo(() => {
    return selectedServiceIds.reduce((sum, id) => sum + (servicePrices[id] || 0), 0)
  }, [selectedServiceIds, servicePrices])

  function toggleService(svcId: string) {
    setSelectedServiceIds(prev => {
      if (prev.includes(svcId)) {
        const next = prev.filter(id => id !== svcId)
        setServicePrices(p => { const { [svcId]: _, ...rest } = p; return rest })
        return next
      } else {
        const svc = services.find(s => s.id === svcId)
        if (svc) setServicePrices(p => ({ ...p, [svcId]: svc.basePrice }))
        return [...prev, svcId]
      }
    })
  }

  function updateServicePrice(svcId: string, val: number) {
    setServicePrices(p => ({ ...p, [svcId]: val }))
  }

  function handleAddCustomer() {
    if (!newCustName.trim() || !newCustPhone.trim()) return
    const tempId = `cust-${Date.now()}`
    addCustomer({
      id: tempId,
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      email: '',
      address: '',
      customerSince: new Date().toISOString(),
      lifetimeSpend: 0,
      notes: '',
      tags: ['new'],
    })
    setCustomerId(tempId)
    setShowNewCustomer(false)
    setStep(2)
  }

  function handleAddVehicle() {
    if (!newVehMake.trim() || !newVehModel.trim()) return
    const tempId = `veh-${Date.now()}`
    addVehicle({
      id: tempId,
      customerId,
      make: newVehMake.trim(),
      model: newVehModel.trim(),
      year: new Date().getFullYear(),
      registrationNumber: newVehReg.trim(),
      color: newVehColor.trim(),
    })
    setVehicleId(tempId)
    setShowNewVehicle(false)
  }

  function reset() {
    setStep(1)
    setCustomerId('')
    setVehicleId('')
    setSelectedServiceIds([])
    setServicePrices({})
    setDate(format(new Date(), 'yyyy-MM-dd'))
    setTime('')
    setDeposit('')
    setNotes('')
    setCustomerSearch('')
    setShowNewCustomer(false)
    setNewCustName(prefillName ?? '')
    setNewCustPhone(prefillPhone ?? '')
    setShowNewVehicle(false)
    setNewVehMake('')
    setNewVehModel('')
    setNewVehReg('')
    setNewVehColor('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleCreate() {
    const booking: Booking = {
      id: `bk-${Date.now()}`,
      customerId,
      vehicleId,
      serviceIds: selectedServiceIds,
      date,
      time,
      estimatedPrice: totalPrice,
      deposit: Number(deposit) || 0,
      notes,
      status: 'confirmed',
    }
    addBooking(booking)
    handleClose()
  }

  const canProceed = [
    customerId !== '',
    vehicleId !== '',
    selectedServiceIds.length > 0,
    date !== '' && time !== '',
  ]

  const STEPS = ['Customer', 'Vehicle', 'Service', 'Schedule', 'Confirm']

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New Booking"
      subtitle={`Step ${step} of ${STEPS.length} — ${STEPS[step - 1]}`}
      size="lg"
      footer={
        <div className="flex items-center gap-2 w-full">
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <div className="flex-1" />
          {step > 1 && (
            <Button variant="secondary" onClick={() => setStep(s => s - 1)}>Back</Button>
          )}
          {step < 5 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed[step - 1]}
            >
              Continue
            </Button>
          ) : (
            <Button onClick={handleCreate}>Create Booking</Button>
          )}
        </div>
      }
    >
      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
              i + 1 < step
                ? 'bg-emerald-100 text-emerald-700'
                : i + 1 === step
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-400'
            }`}>
              {i + 1 < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-0.5 ${i + 1 < step ? 'bg-emerald-300' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.15 }}
        >
          {/* Step 1: Customer */}
          {step === 1 && (
            <div>
              <p className="text-sm text-slate-600 mb-4">Select a customer for this booking</p>
              <SearchInput
                value={customerSearch}
                onChange={setCustomerSearch}
                placeholder="Search customers..."
                className="mb-4"
              />
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {filteredCustomers.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCustomerId(c.id)
                      setShowNewCustomer(false)
                      const cvs = vehicles.filter(v => v.customerId === c.id)
                      if (cvs.length === 1) setVehicleId(cvs[0].id)
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      customerId === c.id
                        ? 'bg-indigo-50 border border-indigo-200'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <Avatar name={c.name} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.phone}</p>
                    </div>
                    {customerId === c.id && (
                      <Check className="w-4 h-4 text-indigo-600 ml-auto" />
                    )}
                  </button>
                ))}
              </div>

              {/* New Customer inline */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                {!showNewCustomer ? (
                  <button
                    onClick={() => setShowNewCustomer(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-dashed border-slate-300 text-sm text-slate-500 hover:text-slate-700 hover:border-slate-400 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> New Customer
                  </button>
                ) : (
                  <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs font-medium text-slate-700">Create New Customer</p>
                    <input
                      value={newCustName}
                      onChange={e => setNewCustName(e.target.value)}
                      placeholder="Customer name"
                      className="w-full rounded-lg border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      value={newCustPhone}
                      onChange={e => setNewCustPhone(e.target.value)}
                      placeholder="Phone number"
                      className="w-full rounded-lg border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={handleAddCustomer} disabled={!newCustName.trim() || !newCustPhone.trim()}>
                        Add Customer
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowNewCustomer(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Vehicle */}
          {step === 2 && (
            <div>
              <p className="text-sm text-slate-600 mb-4">Select a vehicle</p>
              {customerVehicles.length > 0 ? (
                <div className="space-y-2">
                  {customerVehicles.map(v => (
                    <button
                      key={v.id}
                      onClick={() => { setVehicleId(v.id); setShowNewVehicle(false) }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-colors ${
                        vehicleId === v.id
                          ? 'bg-indigo-50 border-indigo-200'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {v.make} {v.model}
                        </p>
                        <p className="text-xs text-slate-500">{v.registrationNumber} · {v.color}</p>
                      </div>
                      {vehicleId === v.id && <Check className="w-4 h-4 text-indigo-600" />}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-8">
                  No vehicles found for this customer
                </p>
              )}

              {/* New Vehicle inline */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                {!showNewVehicle ? (
                  <button
                    onClick={() => setShowNewVehicle(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-dashed border-slate-300 text-sm text-slate-500 hover:text-slate-700 hover:border-slate-400 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> New Vehicle
                  </button>
                ) : (
                  <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs font-medium text-slate-700">Add New Vehicle</p>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        value={newVehMake}
                        onChange={e => setNewVehMake(e.target.value)}
                        placeholder="Make (e.g. Mahindra)"
                        className="w-full rounded-lg border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        value={newVehModel}
                        onChange={e => setNewVehModel(e.target.value)}
                        placeholder="Model (e.g. Thar)"
                        className="w-full rounded-lg border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        value={newVehReg}
                        onChange={e => setNewVehReg(e.target.value)}
                        placeholder="Registration"
                        className="w-full rounded-lg border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        value={newVehColor}
                        onChange={e => setNewVehColor(e.target.value)}
                        placeholder="Color"
                        className="w-full rounded-lg border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={handleAddVehicle} disabled={!newVehMake.trim() || !newVehModel.trim()}>
                        Add Vehicle
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowNewVehicle(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Services (multi-select grouped by category) */}
          {step === 3 && (
            <div>
              <p className="text-sm text-slate-600 mb-4">Select services</p>
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {Object.entries(servicesByCategory).map(([category, catServices]) => (
                  <div key={category}>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{category}</p>
                    <div className="space-y-1.5">
                      {catServices.map(svc => (
                        <label
                          key={svc.id}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors cursor-pointer ${
                            selectedServiceIds.includes(svc.id)
                              ? 'bg-indigo-50 border-indigo-200'
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedServiceIds.includes(svc.id)}
                            onChange={() => toggleService(svc.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900">{svc.name}</p>
                            <p className="text-xs text-slate-500">{svc.duration}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-slate-900">{formatCurrency(svc.basePrice)}</p>
                            {svc.maxPrice > 0 && <p className="text-xs text-slate-400">up to {formatCurrency(svc.maxPrice)}</p>}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {selectedServiceIds.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm text-slate-500">{selectedServiceIds.length} service{selectedServiceIds.length !== 1 ? 's' : ''} selected</span>
                  <span className="text-sm font-semibold text-slate-900">{formatCurrency(totalPrice)}</span>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Date, Time & Pricing */}
          {step === 4 && (
            <div>
              <p className="text-sm text-slate-600 mb-4">Choose date, time and pricing</p>

              {/* Service Pricing */}
              {selectedServiceIds.length > 0 && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-700 mb-2">Service Pricing</label>
                  <div className="space-y-2 border border-slate-200 rounded-lg p-3">
                    {selectedServiceIds.map(svcId => {
                      const svc = services.find(s => s.id === svcId)
                      if (!svc) return null
                      return (
                        <div key={svcId} className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-900 truncate">{svc.name}</p>
                            <p className="text-xs text-slate-400">Base: {formatCurrency(svc.basePrice)}{svc.maxPrice > 0 ? ` — Max: ${formatCurrency(svc.maxPrice)}` : ''}</p>
                          </div>
                          <div className="w-32 shrink-0">
                            <input
                              type="number"
                              value={servicePrices[svcId] ?? ''}
                              onChange={e => updateServicePrice(svcId, Number(e.target.value) || 0)}
                              placeholder="Price"
                              className="w-full rounded-lg border border-slate-200 text-sm px-3 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      )
                    })}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-sm font-medium text-slate-700">Total</span>
                      <span className="text-sm font-semibold text-slate-900">{formatCurrency(totalPrice)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Deposit</label>
                  <input
                    type="number"
                    value={deposit}
                    onChange={e => setDeposit(e.target.value)}
                    placeholder="₹ (optional)"
                    className="w-full rounded-lg border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Time Slot</label>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map(slot => (
                    <button
                      key={slot}
                      onClick={() => setTime(slot)}
                      className={`text-sm py-2 rounded-lg border transition-colors ${
                        time === slot
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {formatTime(slot)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Optional notes"
                  className="w-full rounded-lg border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Step 5: Confirm */}
          {step === 5 && (
            <div>
              <p className="text-sm text-slate-600 mb-4">Review and confirm booking</p>
              <div className="space-y-3">
                {(() => {
                  const cust = customers.find(c => c.id === customerId)
                  const veh = vehicles.find(v => v.id === vehicleId)
                  const selectedSvcs = selectedServiceIds.map(id => services.find(s => s.id === id)).filter(Boolean)
                  return (
                    <>
                      <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
                        <span className="text-sm text-slate-500">Customer</span>
                        <span className="text-sm font-medium text-slate-900">{cust?.name}</span>
                      </div>
                      <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
                        <span className="text-sm text-slate-500">Vehicle</span>
                        <span className="text-sm font-medium text-slate-900">
                          {veh ? `${veh.make} ${veh.model}` : '—'}
                        </span>
                      </div>
                      <div className="py-2.5 border-b border-slate-100">
                        <span className="text-sm text-slate-500">Services</span>
                        <div className="mt-1.5 space-y-1">
                          {selectedSvcs.map((svc: any) => (
                            <div key={svc.id} className="flex items-center justify-between">
                              <span className="text-sm text-slate-900">{svc.name}</span>
                              <span className="text-sm font-medium text-slate-700">{formatCurrency(servicePrices[svc.id] || svc.basePrice)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
                        <span className="text-sm text-slate-500">Date & Time</span>
                        <span className="text-sm font-medium text-slate-900">
                          {date && format(parseISO(date), 'MMM d, yyyy')} {time && `at ${formatTime(time)}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
                        <span className="text-sm text-slate-500">Estimated Price</span>
                        <span className="text-sm font-semibold text-slate-900">
                          {formatCurrency(totalPrice)}
                        </span>
                      </div>
                      {Number(deposit) > 0 && (
                        <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
                          <span className="text-sm text-slate-500">Deposit</span>
                          <span className="text-sm font-medium text-emerald-600">
                            {formatCurrency(Number(deposit))}
                          </span>
                        </div>
                      )}
                      {notes && (
                        <div className="flex items-center justify-between py-2.5">
                          <span className="text-sm text-slate-500">Notes</span>
                          <span className="text-sm text-slate-700">{notes}</span>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Modal>
  )
}

function BookingDetailModal({
  booking,
  onClose,
  getCustomer,
  getVehicle,
  getService,
  onUpdateStatus,
  onStartJob,
}: {
  booking: Booking
  onClose: () => void
  getCustomer: (id: string) => any
  getVehicle: (id: string) => any
  getService: (id: string) => any
  onUpdateStatus: (status: BookingStatus) => void
  onStartJob: () => void
}) {
  const cust = getCustomer(booking.customerId)
  const veh = getVehicle(booking.vehicleId)
  const svcs = booking.serviceIds.map(id => getService(id)).filter(Boolean)

  return (
    <Modal
      open
      onClose={onClose}
      title="Booking Details"
      subtitle={`${format(parseISO(booking.date), 'EEEE, MMM d, yyyy')} at ${formatTime(booking.time)}`}
      size="md"
      footer={
        <div className="flex items-center gap-2 w-full">
          {booking.status !== 'cancelled' && booking.status !== 'completed' && (
            <Button variant="danger" size="sm" onClick={() => onUpdateStatus('cancelled')}>
              Cancel Booking
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {booking.status === 'confirmed' && (
            <Button onClick={onStartJob}>Start Job</Button>
          )}
          {booking.status === 'in_progress' && (
            <Button onClick={() => onUpdateStatus('completed')}>Mark Completed</Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <StatusBadge status={booking.status} />
          <span className="text-lg font-semibold text-slate-900">
            {formatCurrency(booking.estimatedPrice)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Customer</p>
            <div className="flex items-center gap-2">
              <Avatar name={cust?.name ?? ''} size="sm" />
              <div>
                <p className="text-sm font-medium text-slate-900">{cust?.name}</p>
                <p className="text-xs text-slate-500">{cust?.phone}</p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Vehicle</p>
            <p className="text-sm text-slate-900">
              {veh ? `${veh.make} ${veh.model}` : '—'}
            </p>
            <p className="text-xs text-slate-500">{veh?.registrationNumber}</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Services</p>
          {svcs.map((svc: any) => (
            <div key={svc.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 mb-1">
              <span className="text-sm text-slate-900">{svc.name}</span>
              <span className="text-xs text-slate-500">{svc.duration}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Deposit</p>
            <p className="text-sm text-slate-900">
              {booking.deposit > 0 ? formatCurrency(booking.deposit) : 'None'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Balance</p>
            <p className="text-sm font-semibold text-slate-900">
              {formatCurrency(booking.estimatedPrice - booking.deposit)}
            </p>
          </div>
        </div>

        {booking.notes && (
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Notes</p>
            <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2">{booking.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
