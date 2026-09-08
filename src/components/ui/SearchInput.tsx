import { Search, X } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  shortcutHint?: string
  className?: string
  onFocus?: () => void
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  shortcutHint,
  className = '',
  onFocus,
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
        className="w-full rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 pl-9 pr-14 py-2 transition-colors duration-150 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
      />
      {value ? (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors duration-150"
        >
          <X className="w-4 h-4" />
        </button>
      ) : shortcutHint ? (
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">
          {shortcutHint}
        </kbd>
      ) : null}
    </div>
  )
}
