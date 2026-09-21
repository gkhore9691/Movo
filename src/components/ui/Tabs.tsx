import { motion } from 'framer-motion'

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
    <div className={`flex items-center gap-0 border-b border-white/[0.06] ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative px-4 py-2.5 text-sm font-medium transition-colors duration-150 cursor-pointer ${
            active === tab.id
              ? 'text-white'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          <span className="flex items-center gap-1.5">
            {tab.label}
            {tab.count !== undefined && (
              <span className="text-xs text-white/30">
                {tab.count}
              </span>
            )}
          </span>
          {active === tab.id && (
            <motion.span
              layoutId="active-tab-indicator"
              className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#6366f1] rounded-t-full"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
        </button>
      ))}
    </div>
  )
}
