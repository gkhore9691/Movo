import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  onClick?: () => void
}

const paddings = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' }

export function Card({ children, className = '', padding = 'md', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-[#181b25] rounded-lg border border-white/[0.06] ${paddings[padding]} ${
        onClick ? 'cursor-pointer hover:border-white/[0.12] hover:-translate-y-0.5 transition-all duration-200' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export function CardHeader({ title, subtitle, actions, className = '' }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between mb-4 ${className}`}>
      <div>
        <h3 className="text-[15px] font-semibold text-white tracking-tight font-[Geist,var(--font-sans)]">{title}</h3>
        {subtitle && <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
