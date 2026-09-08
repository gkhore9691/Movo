import { Bell, Menu, Search } from 'lucide-react'

interface TopBarProps {
  title: string
  onMenuClick: () => void
  onSearchClick?: () => void
}

export default function TopBar({ title, onMenuClick, onSearchClick }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-neutral-200 bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-1 text-neutral-400 hover:text-neutral-600 lg:hidden"
        >
          <Menu size={18} />
        </button>
        <h1 className="text-sm font-medium text-neutral-900">{title}</h1>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onSearchClick}
          className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1 text-[13px] text-neutral-400 hover:border-neutral-300 transition-colors duration-150"
        >
          <Search size={13} />
          <span className="hidden sm:inline">Search…</span>
          <kbd className="hidden rounded bg-white border border-neutral-200 px-1.5 py-0.5 text-[10px] text-neutral-400 sm:inline-block">
            ⌘K
          </kbd>
        </button>

        <button className="relative rounded-md p-1.5 text-neutral-400 hover:text-neutral-600 transition-colors duration-150">
          <Bell size={16} />
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />
        </button>

        <div className="ml-1 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-medium text-neutral-600">
            SP
          </div>
        </div>
      </div>
    </header>
  )
}
