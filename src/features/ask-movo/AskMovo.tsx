import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  X,
  ArrowRight,
  Search,
  User,
  Car,
  Wrench,
  Clock,
  TrendingUp,
  Phone,
  Calendar,
  BarChart3,
  Send,
} from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import { formatCurrency } from '@/utils/format'
import { Avatar } from '@/components/ui'

const SUGGESTIONS = [
  'Who should I call today?',
  'How much revenue is pending?',
  'Show me today\'s cars',
  'Which customers haven\'t returned in 6 months?',
  'How did we perform this month?',
  'Send reminders to tomorrow\'s bookings',
]

interface AiResponse {
  title: string
  description: string
  items?: { label: string; value: string; icon?: string }[]
  action?: { label: string; route: string }
}

export default function AskMovo() {
  const {
    askMovoOpen,
    closeAskMovo,
    openAskMovo,
    customers,
    vehicles,
    jobs,
    leads,
    invoices,
    bookings,
    retentionCustomers,
    getCustomer,
    getVehicle,
  } = useApp()

  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [response, setResponse] = useState<AiResponse | null>(null)
  const [recentQueries, setRecentQueries] = useState<string[]>([])
  const [searchResults, setSearchResults] = useState<
    { type: string; id: string; label: string; sub: string; route: string }[]
  >([])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        openAskMovo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openAskMovo])

  useEffect(() => {
    function handleCustomEvent() {
      openAskMovo()
    }
    window.addEventListener('open-ask-movo', handleCustomEvent)
    return () => window.removeEventListener('open-ask-movo', handleCustomEvent)
  }, [openAskMovo])

  useEffect(() => {
    if (askMovoOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
      setQuery('')
      setResponse(null)
      setSearchResults([])
      setIsThinking(false)
    }
  }, [askMovoOpen])

  const generateResponse = useCallback(
    (q: string): AiResponse => {
      const lower = q.toLowerCase()

      if (lower.match(/call|follow/)) {
        const hotLeads = leads.filter(
          (l) => l.status === 'quoted' || l.status === 'negotiation'
        )
        const dueRetention = retentionCustomers.filter(
          (r) => r.status === 'due'
        )
        const totalPotential =
          hotLeads.reduce((s, l) => s + l.quotedPrice, 0) +
          dueRetention.reduce((s, r) => s + r.estimatedValue, 0)
        return {
          title: "Today's priority follow-ups",
          description: `I found ${hotLeads.length + dueRetention.length} people worth following up with.`,
          items: [
            {
              label: 'Hot leads',
              value: `${hotLeads.length} — ${formatCurrency(hotLeads.reduce((s, l) => s + l.quotedPrice, 0))} potential`,
              icon: '🔥',
            },
            {
              label: 'Repeat customers due',
              value: `${dueRetention.length} — ${formatCurrency(dueRetention.reduce((s, r) => s + r.estimatedValue, 0))} potential`,
              icon: '🔁',
            },
            {
              label: 'Total opportunity',
              value: formatCurrency(totalPotential),
              icon: '💰',
            },
          ],
          action: { label: 'Start Follow-ups', route: '/leads' },
        }
      }

      if (lower.match(/revenue|pending|money|outstanding/)) {
        const paid = invoices
          .filter((i) => i.status === 'paid')
          .reduce((s, i) => s + i.amount, 0)
        const pending = invoices
          .filter((i) => i.status === 'sent')
          .reduce((s, i) => s + i.balance, 0)
        const overdue = invoices
          .filter((i) => i.status === 'overdue')
          .reduce((s, i) => s + i.balance, 0)
        return {
          title: 'Revenue summary',
          description: `Here's your current revenue picture.`,
          items: [
            { label: 'Collected', value: formatCurrency(paid), icon: '✅' },
            { label: 'Pending', value: formatCurrency(pending), icon: '🟡' },
            { label: 'Overdue', value: formatCurrency(overdue), icon: '🔴' },
          ],
          action: { label: 'View Revenue Radar', route: '/revenue-radar' },
        }
      }

      if (lower.match(/today|cars|studio/)) {
        const inStudio = jobs.filter(
          (j) =>
            j.status !== 'enquiry' &&
            j.status !== 'booked' &&
            j.status !== 'delivered'
        )
        return {
          title: 'Cars in studio today',
          description: `${inStudio.length} vehicles are currently being worked on.`,
          items: inStudio.slice(0, 5).map((j) => {
            const v = getVehicle(j.vehicleId)
            const c = getCustomer(j.customerId)
            return {
              label: v ? `${v.make} ${v.model}` : 'Vehicle',
              value: `${c?.name || 'Customer'} — ${j.status.replace(/_/g, ' ')}`,
              icon: '🚗',
            }
          }),
          action: { label: 'View Jobs', route: '/jobs' },
        }
      }

      if (lower.match(/customer|return|back|inactive|haven.*come/)) {
        const inactive = retentionCustomers.filter(
          (r) => r.daysSinceVisit > 180
        )
        return {
          title: 'Inactive customers',
          description: `${inactive.length} customers haven't visited in over 6 months.`,
          items: inactive.slice(0, 4).map((r) => {
            const c = getCustomer(r.customerId)
            return {
              label: c?.name || 'Customer',
              value: `${r.daysSinceVisit} days since last visit — ${formatCurrency(r.estimatedValue)} potential`,
              icon: '👤',
            }
          }),
          action: { label: 'View Retention', route: '/revenue-radar' },
        }
      }

      if (lower.match(/perform|month|week|summary/)) {
        const completedJobs = jobs.filter((j) => j.status === 'delivered')
        const totalRevenue = invoices
          .filter((i) => i.status === 'paid')
          .reduce((s, i) => s + i.amount, 0)
        const newCustomersCount = customers.filter((c) => {
          const since = new Date(c.customerSince)
          const thisYear = new Date().getFullYear()
          return since.getFullYear() === thisYear
        }).length
        return {
          title: 'Performance overview',
          description: 'Here\'s how the studio is performing.',
          items: [
            {
              label: 'Revenue collected',
              value: formatCurrency(totalRevenue),
              icon: '💰',
            },
            {
              label: 'Jobs completed',
              value: `${completedJobs.length} vehicles delivered`,
              icon: '✅',
            },
            {
              label: 'New customers',
              value: `${newCustomersCount} this year`,
              icon: '👥',
            },
            {
              label: 'Active pipeline',
              value: `${jobs.filter((j) => j.status !== 'delivered').length} in progress`,
              icon: '⚡',
            },
          ],
          action: { label: 'View Analytics', route: '/analytics' },
        }
      }

      if (lower.match(/remind|booking|tomorrow/)) {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStr = tomorrow.toISOString().split('T')[0]
        const tomorrowBookings = bookings.filter((b) =>
          b.date.startsWith(tomorrowStr)
        )
        if (tomorrowBookings.length === 0) {
          return {
            title: "Tomorrow's bookings",
            description:
              'No bookings scheduled for tomorrow. A good opportunity to follow up on leads!',
            action: { label: 'View Bookings', route: '/bookings' },
          }
        }
        return {
          title: "Tomorrow's bookings",
          description: `${tomorrowBookings.length} booking${tomorrowBookings.length > 1 ? 's' : ''} scheduled for tomorrow.`,
          items: tomorrowBookings.map((b) => {
            const c = getCustomer(b.customerId)
            const v = getVehicle(b.vehicleId)
            return {
              label: c?.name || 'Customer',
              value: `${b.time} — ${v ? `${v.make} ${v.model}` : 'Vehicle'}`,
              icon: '📅',
            }
          }),
          action: { label: 'Send Reminders', route: '/bookings' },
        }
      }

      return {
        title: "I'm here to help",
        description:
          'I can help you with revenue tracking, customer follow-ups, job status, bookings, and performance analysis. Try asking a specific question!',
        items: [
          { label: 'Revenue', value: 'Track pending and collected', icon: '💰' },
          { label: 'Follow-ups', value: 'See who needs attention', icon: '📞' },
          { label: 'Jobs', value: 'Check studio status', icon: '🔧' },
          { label: 'Bookings', value: 'Manage schedule', icon: '📅' },
        ],
      }
    },
    [
      leads,
      retentionCustomers,
      invoices,
      jobs,
      bookings,
      customers,
      getCustomer,
      getVehicle,
    ]
  )

  const doSearch = useCallback(
    (q: string) => {
      if (q.length < 2) {
        setSearchResults([])
        return
      }
      const lower = q.toLowerCase()
      const results: typeof searchResults = []

      for (const c of customers) {
        if (c.name.toLowerCase().includes(lower) || c.phone.includes(q)) {
          results.push({
            type: 'customer',
            id: c.id,
            label: c.name,
            sub: c.phone,
            route: `/customers/${c.id}`,
          })
        }
        if (results.length >= 8) break
      }

      for (const v of vehicles) {
        if (
          v.registrationNumber.toLowerCase().includes(lower) ||
          v.make.toLowerCase().includes(lower) ||
          v.model.toLowerCase().includes(lower)
        ) {
          results.push({
            type: 'vehicle',
            id: v.id,
            label: `${v.make} ${v.model}`,
            sub: v.registrationNumber,
            route: `/vehicles/${v.id}`,
          })
        }
        if (results.length >= 8) break
      }

      setSearchResults(results.slice(0, 8))
    },
    [customers, vehicles]
  )

  const handleSubmit = useCallback(
    (text?: string) => {
      const q = text || query
      if (!q.trim()) return

      setRecentQueries((prev) => [q, ...prev.filter((p) => p !== q)].slice(0, 3))
      setSearchResults([])
      setIsThinking(true)
      setResponse(null)

      setTimeout(() => {
        setIsThinking(false)
        setResponse(generateResponse(q))
      }, 1200)
    },
    [query, generateResponse]
  )

  const handleInputChange = useCallback(
    (val: string) => {
      setQuery(val)
      setResponse(null)
      setIsThinking(false)
      doSearch(val)
    },
    [doSearch]
  )

  const handleAction = useCallback(
    (route: string) => {
      closeAskMovo()
      navigate(route)
    },
    [closeAskMovo, navigate]
  )

  const handleSearchResultClick = useCallback(
    (route: string) => {
      closeAskMovo()
      navigate(route)
    },
    [closeAskMovo, navigate]
  )

  const searchIconMap: Record<string, React.ReactNode> = useMemo(
    () => ({
      customer: <User className="w-4 h-4 text-indigo-500" />,
      vehicle: <Car className="w-4 h-4 text-emerald-500" />,
      job: <Wrench className="w-4 h-4 text-amber-500" />,
    }),
    []
  )

  const showSuggestions =
    !query && !response && !isThinking && searchResults.length === 0

  return (
    <AnimatePresence>
      {askMovoOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeAskMovo}
          />

          {/* Palette */}
          <motion.div
            className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
              <Sparkles className="w-5 h-5 text-indigo-500 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit()
                  if (e.key === 'Escape') closeAskMovo()
                }}
                placeholder="Ask Movo anything..."
                className="flex-1 text-lg text-slate-900 placeholder-slate-400 outline-none bg-transparent"
              />
              {query && (
                <button
                  onClick={() => handleSubmit()}
                  className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={closeAskMovo}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {/* Search results */}
              {searchResults.length > 0 && !isThinking && !response && (
                <div className="p-3">
                  <p className="px-2 pb-2 text-xs font-medium text-slate-400 uppercase tracking-wide">
                    Search results
                  </p>
                  {searchResults.map((r) => (
                    <button
                      key={`${r.type}-${r.id}`}
                      onClick={() => handleSearchResultClick(r.route)}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
                    >
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100">
                        {searchIconMap[r.type] || (
                          <Search className="w-4 h-4 text-slate-400" />
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {r.label}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {r.sub}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300" />
                    </button>
                  ))}
                </div>
              )}

              {/* Suggestions */}
              {showSuggestions && (
                <div className="p-4">
                  <p className="px-1 pb-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                    Try asking
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setQuery(s)
                          handleSubmit(s)
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 text-left transition-colors group"
                      >
                        <Search className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                        <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                          {s}
                        </span>
                      </button>
                    ))}
                  </div>

                  {recentQueries.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <p className="px-1 pb-2 text-xs font-medium text-slate-400 uppercase tracking-wide">
                        Recent
                      </p>
                      {recentQueries.map((rq) => (
                        <button
                          key={rq}
                          onClick={() => {
                            setQuery(rq)
                            handleSubmit(rq)
                          }}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-left transition-colors w-full"
                        >
                          <Clock className="w-4 h-4 text-slate-300" />
                          <span className="text-sm text-slate-500">
                            {rq}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Thinking indicator */}
              {isThinking && (
                <div className="px-5 py-8 flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-indigo-400"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-slate-400">
                    Movo is thinking...
                  </span>
                </div>
              )}

              {/* Response */}
              {response && !isThinking && (
                <motion.div
                  className="p-5"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {response.title}
                      </h3>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {response.description}
                      </p>
                    </div>
                  </div>

                  {response.items && response.items.length > 0 && (
                    <div className="ml-11 space-y-2 mb-4">
                      {response.items.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50"
                        >
                          <span className="text-base">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-slate-700">
                              {item.label}
                            </span>
                          </div>
                          <span className="text-sm text-slate-500 text-right">
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {response.action && (
                    <div className="ml-11">
                      <button
                        onClick={() => handleAction(response.action!.route)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        {response.action.label}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 font-mono text-[10px]">
                    ↵
                  </kbd>
                  to ask
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 font-mono text-[10px]">
                    esc
                  </kbd>
                  to close
                </span>
              </div>
              <span className="text-xs text-slate-400">
                Powered by Movo AI
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
