interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  className?: string
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className = '',
}: ToggleProps) {
  return (
    <label
      className={`flex items-center gap-3 ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-150 ${
          checked ? 'bg-[#6366f1]' : 'bg-white/[0.10]'
        } ${disabled ? '' : 'cursor-pointer'}`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-150 mt-0.5 ${
            checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </button>
      {(label || description) && (
        <div>
          {label && <span className="text-sm font-medium text-white">{label}</span>}
          {description && <p className="text-xs text-white/40 mt-0.5">{description}</p>}
        </div>
      )}
    </label>
  )
}
