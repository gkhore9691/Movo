interface StatusBadgeProps {
  status: string
  className?: string
}

const statusMap: Record<string, { bg: string; text: string; dot: string }> = {
  enquiry: { bg: 'bg-neutral-100', text: 'text-neutral-600', dot: 'bg-neutral-400' },
  new: { bg: 'bg-neutral-100', text: 'text-neutral-600', dot: 'bg-neutral-400' },
  contacted: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  quoted: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  negotiation: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  booked: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  confirmed: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  'car-received': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  received: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  inspection: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  'in-progress': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  'work-in-progress': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  'quality-check': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  ready: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  delivered: { bg: 'bg-neutral-100', text: 'text-neutral-600', dot: 'bg-neutral-400' },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  lost: { bg: 'bg-neutral-100', text: 'text-neutral-500', dot: 'bg-neutral-400' },
  won: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  overdue: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  paid: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  sent: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  draft: { bg: 'bg-neutral-100', text: 'text-neutral-500', dot: 'bg-neutral-400' },
  partial: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  unpaid: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  active: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  inactive: { bg: 'bg-neutral-100', text: 'text-neutral-500', dot: 'bg-neutral-400' },
  hot: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  warm: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  cold: { bg: 'bg-neutral-100', text: 'text-neutral-600', dot: 'bg-neutral-400' },
  dormant: { bg: 'bg-neutral-100', text: 'text-neutral-500', dot: 'bg-neutral-400' },
  requested: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  published: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  due: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
}

function formatStatus(s: string): string {
  return s
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const key = status.toLowerCase().replace(/[\s_]+/g, '-')
  const style = statusMap[key] ?? { bg: 'bg-neutral-100', text: 'text-neutral-500', dot: 'bg-neutral-400' }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {formatStatus(status)}
    </span>
  )
}
