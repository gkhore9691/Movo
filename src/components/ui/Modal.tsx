import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  size?: ModalSize
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = 'md',
  children,
  footer,
  className = '',
}: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`relative w-full ${sizeClasses[size]} rounded-lg bg-[#181b25] border border-white/[0.08] shadow-2xl overflow-hidden ${className}`}
          >
            {title && (
              <div className="flex items-start justify-between px-6 py-4 border-b border-white/[0.06]">
                <div>
                  <h2 className="text-[15px] font-semibold text-white">{title}</h2>
                  {subtitle && (
                    <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-1 -mr-1 text-white/30 hover:text-white/60 transition-colors duration-150 rounded-md hover:bg-white/[0.06]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="px-6 py-4 max-h-[70vh] overflow-y-auto text-white/70">{children}</div>
            {footer && (
              <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-white/[0.06] bg-white/[0.02]">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
