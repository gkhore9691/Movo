import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
  wrapperClassName?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', wrapperClassName = '', ...props }, ref) => {
    return (
      <div className={wrapperClassName}>
        {label && (
          <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5">{label}</label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full rounded-md border bg-white/[0.04] text-sm text-white placeholder:text-white/25 transition-colors duration-150 focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 disabled:opacity-40 ${
              error ? 'border-red-400/50' : 'border-white/[0.10]'
            } ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 ${className}`}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
