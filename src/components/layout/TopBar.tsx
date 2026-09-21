import { Bell, Menu, Search } from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import { getInitials } from '@/utils/format'

interface TopBarProps {
  title: string
  onMenuClick: () => void
  onSearchClick?: () => void
}

export default function TopBar({ title, onMenuClick, onSearchClick }: TopBarProps) {
  const { currentUser } = useApp()
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#0f1117]/80 backdrop-blur-xl px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-1 text-white/60 hover:text-white lg:hidden"
        >
          <Menu size={18} />
        </button>
        <h1 className="text-lg font-semibold text-white tracking-tight" style={{ fontFamily: 'Geist, Inter, sans-serif' }}>{title}</h1>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onSearchClick}
          className="flex items-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.04] px-3 py-1.5 text-sm text-white/30 hover:border-white/[0.10] transition-colors duration-150"
        >
          <Search size={13} />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-white/30 sm:inline-block">
            ⌘K
          </kbd>
        </button>

        <button className="relative rounded-md p-1.5 text-white/40 hover:text-white/60 transition-colors duration-150">
          <Bell size={16} />
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#6366f1]" />
        </button>

        <div className="ml-1 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6366f1] text-[10px] font-medium text-white">
            {getInitials(currentUser?.name ?? '')}
          </div>
        </div>
      </div>
    </header>
  )
}
