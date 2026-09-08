import { useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, Clock, Palette, Bell, Bot, Users, Pencil, Plus } from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import { Card, CardHeader, Button, Badge, Toggle, Avatar } from '@/components/ui'
import { formatCurrency, formatPhone } from '@/utils/format'

const roleLabels: Record<string, string> = {
  owner: 'Owner',
  manager: 'Manager',
  sales: 'Sales',
  technician: 'Technician',
}

const workingHours = [
  { day: 'Monday', hours: '9:00 AM – 7:00 PM' },
  { day: 'Tuesday', hours: '9:00 AM – 7:00 PM' },
  { day: 'Wednesday', hours: '9:00 AM – 7:00 PM' },
  { day: 'Thursday', hours: '9:00 AM – 7:00 PM' },
  { day: 'Friday', hours: '9:00 AM – 7:00 PM' },
  { day: 'Saturday', hours: '9:00 AM – 7:00 PM' },
  { day: 'Sunday', hours: 'Closed' },
]

export default function Settings() {
  const { services, staff } = useApp()

  const [notifBooking, setNotifBooking] = useState(true)
  const [notifJobStatus, setNotifJobStatus] = useState(true)
  const [notifPayment, setNotifPayment] = useState(true)
  const [notifReview, setNotifReview] = useState(true)
  const [notifAiEscalation, setNotifAiEscalation] = useState(true)

  const [aiEnabled, setAiEnabled] = useState(true)
  const [aiAutoRespond, setAiAutoRespond] = useState(true)
  const [aiLanguage, setAiLanguage] = useState('hinglish')
  const [aiTone, setAiTone] = useState('friendly')

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Configure your Movo workspace</p>
      </div>

      {/* Business Profile */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader
            title="Business Profile"
            actions={<Button variant="ghost" size="sm" icon={<Pencil className="w-3.5 h-3.5" />}>Edit</Button>}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoField label="Business Name" value="Detailing Street — Indore" />
            <InfoField label="Phone" value="+91 98765 00001" />
            <InfoField label="Email" value="hello@detailingstreet.in" />
            <InfoField label="GST Number" value="23ABCDE1234F1Z5" />
            <InfoField label="Address" value="42, Vijay Nagar, Indore, MP 452010" className="sm:col-span-2" />
          </div>
        </Card>
      </motion.div>

      {/* Services & Pricing */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardHeader
            title="Services & Pricing"
            actions={<Button variant="secondary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>Add Service</Button>}
          />
          <div className="divide-y divide-slate-100">
            {services.map(svc => (
              <div key={svc.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-slate-900">{svc.name}</p>
                  <p className="text-xs text-slate-500">{svc.duration} · {svc.category}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-700">
                    {formatCurrency(svc.basePrice)} – {formatCurrency(svc.maxPrice)}
                  </span>
                  <Button variant="ghost" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} />
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
            actions={<Button variant="ghost" size="sm" icon={<Pencil className="w-3.5 h-3.5" />}>Edit</Button>}
          />
          <div className="divide-y divide-slate-100">
            {workingHours.map(wh => (
              <div key={wh.day} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <span className="text-sm text-slate-600 w-28">{wh.day}</span>
                <span className={`text-sm font-medium ${wh.hours === 'Closed' ? 'text-slate-400' : 'text-slate-900'}`}>
                  {wh.hours}
                </span>
              </div>
            ))}
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
                defaultValue={6}
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
            <Toggle checked={notifBooking} onChange={setNotifBooking} label="New Booking" description="When a new booking is created or confirmed" />
            <Toggle checked={notifJobStatus} onChange={setNotifJobStatus} label="Job Status Change" description="When a job moves to a new stage" />
            <Toggle checked={notifPayment} onChange={setNotifPayment} label="Payment Received" description="When an invoice is paid" />
            <Toggle checked={notifReview} onChange={setNotifReview} label="Review Received" description="When a customer submits a review" />
            <Toggle checked={notifAiEscalation} onChange={setNotifAiEscalation} label="AI Escalation" description="When AI needs human intervention" />
          </div>
        </Card>
      </motion.div>

      {/* AI Configuration */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card>
          <CardHeader title="AI Configuration" subtitle="Configure how Movo's AI interacts with customers" />
          <div className="space-y-5">
            <Toggle checked={aiEnabled} onChange={setAiEnabled} label="AI Receptionist" description="Enable AI to handle customer conversations" />
            <Toggle checked={aiAutoRespond} onChange={setAiAutoRespond} label="Auto-respond to Enquiries" description="AI automatically replies to new customer messages" />

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
                    onClick={() => setAiLanguage(lang.id)}
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
                    onClick={() => setAiTone(tone.id)}
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

      {/* Team */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader
            title="Team"
            actions={<Button variant="secondary" size="sm" onClick={() => window.location.href = '/staff'}>View All</Button>}
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
