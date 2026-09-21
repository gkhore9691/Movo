import React from 'react'
import { Loader2 } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: React.ReactNode
  iconRight?: React.ReactNode
  loading?: boolean
  className?: string
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[#6366f1] text-white hover:bg-[#5558e6] active:scale-[0.98]',
  secondary:
    'bg-white/[0.06] text-white/80 border border-white/[0.08] hover:bg-white/[0.10]',
  ghost:
    'text-white/60 hover:bg-white/[0.06]',
  danger:
    'bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2 gap-2',
  lg: 'text-sm px-5 py-2.5 gap-2',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon,
      iconRight,
      loading,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center font-medium rounded-md transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]/40 disabled:opacity-40 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children}
        {iconRight && <span className="shrink-0">{iconRight}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'
