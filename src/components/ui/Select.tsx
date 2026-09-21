import React from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string
  options: SelectOption[]
  placeholder?: string
  error?: string
  wrapperClassName?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, placeholder, error, className = '', wrapperClassName = '', ...props }, ref) => {
    return (
      <div className={wrapperClassName}>
        {label && (
          <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5">{label}</label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`w-full appearance-none rounded-md border bg-white/[0.04] text-sm text-white transition-colors duration-150 focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 disabled:opacity-40 pl-3 pr-10 py-2 ${
              error ? 'border-red-400/50' : 'border-white/[0.10]'
            } ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
        </div>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'
