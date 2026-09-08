import { useState, useMemo } from 'react'
import { Star, Send, ExternalLink, MessageSquare, ArrowRight, CheckCircle, Clock, Globe } from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import { Card, CardHeader, Stat, Tabs, Badge, Button, Avatar, StatusBadge, EmptyState } from '@/components/ui'
import { formatDate, formatRelativeDate } from '@/utils/format'

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
            i < rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
          }`}
        />
      ))}
    </div>
  )
}

export default function Reviews() {
  const { reviews, jobs, getCustomer, getService, updateReviewStatus } = useApp()
  const [activeTab, setActiveTab] = useState('all')

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
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Reviews</h1>
        <p className="text-sm text-slate-500 mt-0.5">Customer feedback and Google reviews</p>
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
          <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
          <WorkflowStep label="Wait 1 Day" icon={<Clock className="w-3.5 h-3.5" />} />
          <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
          <WorkflowStep label="Request Review" icon={<Send className="w-3.5 h-3.5" />} />
          <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
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
                  ? 'border-emerald-200'
                  : isNegative && review.status === 'received'
                    ? 'border-amber-200'
                    : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <Avatar name={customer?.name ?? 'Unknown'} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{customer?.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{svcNames} · {formatRelativeDate(review.createdAt)}</p>
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
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
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
                      <Button variant="primary" size="sm" icon={<Star className="w-3.5 h-3.5" />} onClick={() => { updateReviewStatus(review.id, 'published'); window.open('#google-review', '_blank') }}>
                        Request Google Review
                      </Button>
                    )}
                    {review.status === 'received' && isNegative && (
                      <>
                        <Button variant="secondary" size="sm" icon={<MessageSquare className="w-3.5 h-3.5" />} onClick={() => alert(`Feedback from ${customer?.name}:\n\n"${review.comment || 'No comment'}"`)}>
                          View Feedback
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => alert('Private response sent')}>
                          Respond Privately
                        </Button>
                      </>
                    )}
                    {review.status === 'published' && review.googleReviewUrl && (
                      <Button variant="ghost" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />} onClick={() => window.open('#google-review', '_blank')}>
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
    </div>
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
    default: active ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-600',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${variantClasses[variant]}`}>
      {icon}
      {label}
    </div>
  )
}
