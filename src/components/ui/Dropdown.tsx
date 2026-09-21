import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface DropdownItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  danger?: boolean
}

interface DropdownProps {
  trigger: React.ReactNode
  items: DropdownItem[]
  align?: 'left' | 'right'
  className?: string
}

export function Dropdown({ trigger, items, align = 'right', className = '' }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className={`absolute z-50 mt-1 min-w-[180px] bg-[#282c3a] border border-white/[0.08] rounded-lg shadow-xl py-1 ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            {items.map((item, i) => (
              <button
                key={i}
                onClick={() => {
                  item.onClick()
                  setOpen(false)
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors duration-150 cursor-pointer ${
                  item.danger
                    ? 'text-red-400 hover:bg-red-500/10'
                    : 'text-white/80 hover:bg-white/[0.06]'
                }`}
              >
                {item.icon && <span className="text-white/30 shrink-0">{item.icon}</span>}
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
