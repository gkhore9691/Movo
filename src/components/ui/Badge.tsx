import React from 'react'

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'outline'
type BadgeSize = 'sm' | 'md'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-white/[0.06] text-white/60',
  primary: 'bg-[#6366f1]/15 text-[#818cf8]',
  success: 'bg-emerald-500/15 text-emerald-400',
  warning: 'bg-amber-500/15 text-amber-400',
  danger: 'bg-red-500/15 text-red-400',
  outline: 'border border-white/[0.12] text-white/60',
}

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-white/40',
  primary: 'bg-[#818cf8]',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-red-400',
  outline: 'bg-white/40',
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-0.5',
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  )
}
