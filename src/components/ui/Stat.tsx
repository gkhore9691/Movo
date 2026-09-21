import React from 'react'

interface StatProps {
  label: string
  value: string | number
  trend?: {
    value: number
    positive?: boolean
  }
  icon?: React.ReactNode
  className?: string
}

export function Stat({ label, value, trend, className = '' }: StatProps) {
  return (
    <div className={`bg-[#181b25] rounded-lg border border-white/[0.06] p-5 ${className}`}>
      <p className="text-xs text-white/40 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-semibold text-white mt-1 tracking-tight font-[Geist,var(--font-sans)]">{value}</p>
      {trend && (
        <p className={`text-xs mt-1.5 ${trend.positive !== false ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend.positive !== false ? '↑' : '↓'} {Math.abs(trend.value)}%
        </p>
      )}
    </div>
  )
}
