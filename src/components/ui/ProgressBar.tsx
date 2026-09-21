interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  color?: 'primary' | 'success' | 'warning' | 'danger'
  showLabel?: boolean
}

const colorClasses = {
  primary: 'bg-indigo-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-red-400',
}

export function ProgressBar({
  value,
  max = 100,
  className = '',
  color = 'primary',
  showLabel = false,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorClasses[color]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-white/40 tabular-nums">{Math.round(pct)}%</span>
      )}
    </div>
  )
}

interface StepProgressProps {
  current: number
  total: number
  labels?: string[]
  className?: string
}

export function StepProgress({ current, total, labels, className = '' }: StepProgressProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-1 flex-1">
          <div
            className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${
              i < current
                ? 'bg-indigo-400'
                : i === current
                  ? 'bg-indigo-400/30'
                  : 'bg-white/[0.06]'
            }`}
          />
          {labels && i < total && (
            <span className="text-[10px] text-white/30 hidden sm:inline">{labels[i]}</span>
          )}
        </div>
      ))}
    </div>
  )
}
