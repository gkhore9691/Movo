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
    <div className={`bg-white rounded-xl border border-neutral-200 p-5 ${className}`}>
      <p className="text-xs text-neutral-500 font-medium">{label}</p>
      <p className="text-2xl font-semibold text-neutral-900 mt-1 tracking-tight">{value}</p>
      {trend && (
        <p className={`text-xs mt-1.5 ${trend.positive !== false ? 'text-emerald-600' : 'text-red-600'}`}>
          {trend.positive !== false ? '↑' : '↓'} {Math.abs(trend.value)}%
        </p>
      )}
    </div>
  )
}
