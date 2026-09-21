interface StatusBadgeProps {
  status: string
  className?: string
}

const statusMap: Record<string, { bg: string; text: string; dot: string }> = {
  enquiry: { bg: 'bg-white/[0.06]', text: 'text-white/60', dot: 'bg-white/40' },
  new: { bg: 'bg-white/[0.06]', text: 'text-white/60', dot: 'bg-white/40' },
  contacted: { bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-400' },
  quoted: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', dot: 'bg-indigo-400' },
  negotiation: { bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400' },
  booked: { bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-400' },
  confirmed: { bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-400' },
  'car-received': { bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400' },
  received: { bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400' },
  inspection: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', dot: 'bg-indigo-400' },
  'in-progress': { bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-400' },
  'work-in-progress': { bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400' },
  'quality-check': { bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400' },
  ready: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  delivered: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  completed: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  cancelled: { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400' },
  lost: { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400' },
  won: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  overdue: { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400' },
  pending: { bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400' },
  paid: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  sent: { bg: 'bg-violet-500/15', text: 'text-violet-400', dot: 'bg-violet-400' },
  draft: { bg: 'bg-white/[0.06]', text: 'text-white/40', dot: 'bg-white/30' },
  partial: { bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400' },
  unpaid: { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400' },
  active: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  inactive: { bg: 'bg-white/[0.06]', text: 'text-white/40', dot: 'bg-white/30' },
  hot: { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400' },
  warm: { bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400' },
  cold: { bg: 'bg-white/[0.06]', text: 'text-white/60', dot: 'bg-white/40' },
  dormant: { bg: 'bg-white/[0.06]', text: 'text-white/40', dot: 'bg-white/30' },
  requested: { bg: 'bg-violet-500/15', text: 'text-violet-400', dot: 'bg-violet-400' },
  published: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  due: { bg: 'bg-violet-500/15', text: 'text-violet-400', dot: 'bg-violet-400' },
  declined: { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400' },
}

function formatStatus(s: string): string {
  return s
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const key = status.toLowerCase().replace(/[\s_]+/g, '-')
  const style = statusMap[key] ?? { bg: 'bg-white/[0.06]', text: 'text-white/40', dot: 'bg-white/30' }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {formatStatus(status)}
    </span>
  )
}
