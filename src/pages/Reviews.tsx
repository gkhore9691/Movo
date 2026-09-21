import { useState, useMemo } from 'react'
import { Star, Send, ExternalLink, MessageSquare, ArrowRight, CheckCircle, Clock, Globe, Plus } from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import { Card, CardHeader, Stat, Tabs, Badge, Button, Avatar, StatusBadge, EmptyState, Modal, Select } from '@/components/ui'
import { formatDate, formatRelativeDate } from '@/utils/format'
import { api } from '@/api/client'
import type { Review } from '@/types'

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'received', label: 'Received' },
  { id: 'requested', label: 'Requested' },
  { id: 'published', label: 'Published' },
]

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < rating ? 'text-amber-400 fill-amber-400' : 'text-white/20'
          }`}
        />
      ))}
    </div>
  )
}

export default function Reviews() {
  const { reviews, customers, jobs, getCustomer, getService, updateReviewStatus } = useApp()
  const [activeTab, setActiveTab] = useState('all')

  // Modal state
  const [showRequestReview, setShowRequestReview] = useState(false)
  const [showViewFeedback, setShowViewFeedback] = useState<Review | null>(null)
  const [showRespondPrivately, setShowRespondPrivately] = useState<Review | null>(null)
  const [responseText, setResponseText] = useState('')
  const [responseSent, setResponseSent] = useState(false)

  const avgRating = useMemo(() => {
    const withRatings = reviews.filter(r => r.status !== 'requested' && r.rating > 0)
    if (withRatings.length === 0) return 0
    return withRatings.reduce((s, r) => s + r.rating, 0) / withRatings.length
  }, [reviews])

  const receivedCount = reviews.filter(r => r.status === 'received').length
  const requestedCount = reviews.filter(r => r.status === 'requested').length
  const publishedCount = reviews.filter(r => r.status === 'published').length

  const tabCounts = useMemo(() => ({
    all: reviews.length,
    received: receivedCount,
    requested: requestedCount,
    published: publishedCount,
  }), [reviews, receivedCount, requestedCount, publishedCount])

  const filtered = useMemo(() => {
    if (activeTab === 'all') return reviews
    return reviews.filter(r => r.status === activeTab)
  }, [reviews, activeTab])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Reviews</h1>
          <p className="text-sm text-white/40 mt-0.5">Customer feedback and Google reviews</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowRequestReview(true)}>
          Request Review
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat
          label="Average Rating"
          value={`${avgRating.toFixed(1)} ★`}
          icon={<Star className="w-5 h-5" />}
        />
        <Stat label="Received" value={receivedCount + publishedCount} icon={<MessageSquare className="w-5 h-5" />} />
        <Stat label="Pending Requests" value={requestedCount} icon={<Clock className="w-5 h-5" />} />
        <Stat label="Google Reviews" value={publishedCount} icon={<Globe className="w-5 h-5" />} />
      </div>

      <Card className="mb-6">
        <CardHeader title="Review Workflow" subtitle="Automated post-delivery flow" />
        <div className="flex items-center gap-2 flex-wrap">
          <WorkflowStep label="Job Delivered" icon={<CheckCircle className="w-3.5 h-3.5" />} active />
          <ArrowRight className="w-4 h-4 text-white/20 shrink-0" />
          <WorkflowStep label="Wait 1 Day" icon={<Clock className="w-3.5 h-3.5" />} />
          <ArrowRight className="w-4 h-4 text-white/20 shrink-0" />
          <WorkflowStep label="Request Review" icon={<Send className="w-3.5 h-3.5" />} />
          <ArrowRight className="w-4 h-4 text-white/20 shrink-0" />
          <div className="flex flex-col gap-1">
            <WorkflowStep label="★ 4-5 → Google Review" icon={<Star className="w-3.5 h-3.5" />} variant="success" />
            <WorkflowStep label="★ 1-3 → Private Feedback" icon={<MessageSquare className="w-3.5 h-3.5" />} variant="warning" />
          </div>
        </div>
      </Card>

      <Tabs
        tabs={TABS.map(t => ({ ...t, count: tabCounts[t.id as keyof typeof tabCounts] }))}
        active={activeTab}
        onChange={setActiveTab}
        className="mb-6"
      />

      <div className="space-y-3">
        {filtered.map(review => {
          const customer = getCustomer(review.customerId)
          const job = jobs.find(j => j.id === review.jobId)
          const svcNames = job?.serviceIds.map(id => getService(id)?.name).filter(Boolean).join(', ') ?? 'Service'
          const isPositive = review.rating >= 4
          const isNegative = review.rating > 0 && review.rating <= 3

          return (
            <Card
              key={review.id}
              className={`${
                review.status === 'published'
                  ? 'border-emerald-500/20'
                  : isNegative && review.status === 'received'
                    ? 'border-amber-500/20'
                    : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <Avatar name={customer?.name ?? 'Unknown'} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{customer?.name}</h3>
                      <p className="text-xs text-white/40 mt-0.5">{svcNames} · {formatRelativeDate(review.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={review.status} />
                    </div>
                  </div>

                  {review.rating > 0 && review.status !== 'requested' && (
                    <div className="mt-2">
                      <StarRating rating={review.rating} />
                    </div>
                  )}

                  {review.comment && (
                    <p className="text-sm text-white/60 mt-2 leading-relaxed">
                      "{review.comment}"
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    {review.status === 'requested' && (
                      <Button variant="secondary" size="sm" icon={<Send className="w-3.5 h-3.5" />} onClick={() => updateReviewStatus(review.id, 'requested')}>
                        Resend Request
                      </Button>
                    )}
                    {review.status === 'received' && isPositive && (
                      <Button variant="primary" size="sm" icon={<Star className="w-3.5 h-3.5" />} onClick={() => {
                        updateReviewStatus(review.id, 'published')
                        const phone = customer?.phone?.replace(/\D/g, '').slice(-10)
                        const msg = encodeURIComponent(`Hi ${customer?.name}, thank you for choosing us! We'd love your feedback. Please leave us a Google review: https://g.page/review`)
                        window.open(`https://wa.me/91${phone}?text=${msg}`, '_blank')
                      }}>
                        Request Google Review
                      </Button>
                    )}
                    {review.status === 'received' && isNegative && (
                      <>
                        <Button variant="secondary" size="sm" icon={<MessageSquare className="w-3.5 h-3.5" />} onClick={() => setShowViewFeedback(review)}>
                          View Feedback
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setShowRespondPrivately(review); setResponseText(''); setResponseSent(false) }}>
                          Respond Privately
                        </Button>
                      </>
                    )}
                    {review.status === 'published' && review.googleReviewUrl && (
                      <Button variant="ghost" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />} onClick={() => window.open(review.googleReviewUrl || 'https://g.page/review', '_blank')}>
                        View on Google
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )
        })}

        {filtered.length === 0 && (
          <EmptyState
            icon={<Star className="w-12 h-12" />}
            title="No reviews yet"
            description="Start requesting reviews after job deliveries to build your reputation."
          />
        )}
      </div>

      {/* Request Review Modal */}
      <RequestReviewModal
        open={showRequestReview}
        onClose={() => setShowRequestReview(false)}
        customers={customers}
        jobs={jobs}
      />

      {/* View Feedback Modal */}
      <Modal
        open={!!showViewFeedback}
        onClose={() => setShowViewFeedback(null)}
        title="Customer Feedback"
        size="md"
        footer={<Button variant="secondary" onClick={() => setShowViewFeedback(null)}>Close</Button>}
      >
        {showViewFeedback && (() => {
          const fbCustomer = getCustomer(showViewFeedback.customerId)
          const fbJob = jobs.find(j => j.id === showViewFeedback.jobId)
          const fbSvcNames = fbJob?.serviceIds.map(id => getService(id)?.name).filter(Boolean).join(', ') ?? 'Service'
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar name={fbCustomer?.name ?? 'Unknown'} size="lg" />
                <div>
                  <p className="text-sm font-semibold text-white">{fbCustomer?.name}</p>
                  <p className="text-xs text-white/40">{fbSvcNames} · {formatRelativeDate(showViewFeedback.createdAt)}</p>
                </div>
              </div>
              <div>
                <StarRating rating={showViewFeedback.rating} />
              </div>
              <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                <p className="text-sm text-white/70 leading-relaxed italic">
                  "{showViewFeedback.comment || 'No comment provided.'}"
                </p>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Respond Privately Modal */}
      <Modal
        open={!!showRespondPrivately}
        onClose={() => setShowRespondPrivately(null)}
        title="Respond Privately"
        subtitle={showRespondPrivately ? `To ${getCustomer(showRespondPrivately.customerId)?.name}` : ''}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowRespondPrivately(null)}>Cancel</Button>
            <Button
              disabled={!responseText.trim() || responseSent}
              onClick={async () => {
                if (!showRespondPrivately) return
                try {
                  await api.patch(`/reviews/${showRespondPrivately.id}`, { response: responseText })
                } catch { /* best-effort */ }
                setResponseSent(true)
                setTimeout(() => setShowRespondPrivately(null), 1500)
              }}
            >
              {responseSent ? 'Sent!' : 'Send Response'}
            </Button>
          </>
        }
      >
        {showRespondPrivately && (
          <div className="space-y-4">
            <div className="p-3 bg-white/[0.03] rounded-lg border border-white/[0.06]">
              <p className="text-xs text-white/40 mb-1">Original feedback:</p>
              <p className="text-sm text-white/70 italic">"{showRespondPrivately.comment || 'No comment'}"</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Your response</label>
              <textarea
                className="w-full text-sm text-white bg-white/[0.04] border border-white/[0.10] rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-[#6366f1]/30 focus:border-[#6366f1]/30 placeholder-white/30"
                rows={4}
                placeholder="Write a private response to address their concerns..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function RequestReviewModal({
  open,
  onClose,
  customers,
  jobs,
}: {
  open: boolean
  onClose: () => void
  customers: any[]
  jobs: any[]
}) {
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [selectedJob, setSelectedJob] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const deliveredJobs = useMemo(() => {
    if (!selectedCustomer) return []
    return jobs.filter(j => j.customerId === selectedCustomer && j.status === 'delivered')
  }, [selectedCustomer, jobs])

  const customerOptions = customers.map(c => ({ value: c.id, label: c.name }))
  const jobOptions = deliveredJobs.map(j => ({ value: j.id, label: `Job ${j.id} — ${formatDate(j.createdAt)}` }))

  async function handleSubmit() {
    if (!selectedCustomer || !selectedJob) return
    setSubmitting(true)
    try {
      await api.post('/reviews', {
        customerId: selectedCustomer,
        jobId: selectedJob,
        rating: 0,
        comment: '',
        status: 'requested',
      })
      setSelectedCustomer('')
      setSelectedJob('')
      onClose()
    } catch {
      // best-effort
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request Review"
      subtitle="Send a review request to a customer"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={!selectedCustomer || !selectedJob || submitting} onClick={handleSubmit}>
            {submitting ? 'Sending...' : 'Send Request'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Customer"
          placeholder="Select a customer"
          options={customerOptions}
          value={selectedCustomer}
          onChange={(e) => { setSelectedCustomer(e.target.value); setSelectedJob('') }}
        />
        <Select
          label="Delivered Job"
          placeholder={selectedCustomer ? 'Select a job' : 'Select a customer first'}
          options={jobOptions}
          value={selectedJob}
          onChange={(e) => setSelectedJob(e.target.value)}
          disabled={!selectedCustomer || deliveredJobs.length === 0}
        />
        {selectedCustomer && deliveredJobs.length === 0 && (
          <p className="text-xs text-amber-400">No delivered jobs found for this customer.</p>
        )}
      </div>
    </Modal>
  )
}

function WorkflowStep({
  label,
  icon,
  active,
  variant = 'default',
}: {
  label: string
  icon: React.ReactNode
  active?: boolean
  variant?: 'default' | 'success' | 'warning'
}) {
  const variantClasses = {
    default: active ? 'bg-[#6366f1]/10 border-[#6366f1]/20 text-[#818cf8]' : 'bg-white/[0.03] border-white/[0.06] text-white/60',
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${variantClasses[variant]}`}>
      {icon}
      {label}
    </div>
  )
}
