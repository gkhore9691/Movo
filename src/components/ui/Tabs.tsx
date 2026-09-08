interface Tab {
  id: string
  label: string
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
  className?: string
}

export function Tabs({ tabs, active, onChange, className = '' }: TabsProps) {
  return (
    <div className={`flex items-center gap-0 border-b border-neutral-200 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative px-4 py-2 text-sm font-medium transition-colors duration-150 cursor-pointer ${
            active === tab.id
              ? 'text-neutral-900'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <span className="flex items-center gap-1.5">
            {tab.label}
            {tab.count !== undefined && (
              <span className="text-xs text-neutral-400">
                {tab.count}
              </span>
            )}
          </span>
          {active === tab.id && (
            <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-neutral-900 rounded-t-full" />
          )}
        </button>
      ))}
    </div>
  )
}
