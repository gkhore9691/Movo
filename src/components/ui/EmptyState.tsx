import React from 'react'
import { Button } from './Button'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      {icon && (
        <div className="text-white/[0.10] mb-4 [&_svg]:w-12 [&_svg]:h-12">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-medium text-white/60">{title}</h3>
      {description && <p className="text-sm text-white/30 mt-1 max-w-sm">{description}</p>}
      {action && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
