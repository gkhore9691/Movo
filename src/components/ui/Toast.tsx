import React, { createContext, useCallback, useContext, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

type ToastVariant = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const variantConfig: Record<ToastVariant, { icon: React.ReactNode; accent: string }> = {
  success: {
    icon: <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />,
    accent: 'border-l-emerald-400',
  },
  error: {
    icon: <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />,
    accent: 'border-l-red-400',
  },
  info: {
    icon: <Info className="w-4 h-4 text-blue-400 shrink-0" />,
    accent: 'border-l-blue-400',
  },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = Math.random().toString(36).slice(2, 9)
    setToasts((prev) => [...prev, { id, message, variant }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => {
            const config = variantConfig[t.variant]
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 80 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 80 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={`pointer-events-auto flex items-center gap-3 bg-[#282c3a] border border-white/[0.08] border-l-2 ${config.accent} rounded-lg shadow-xl px-4 py-3 min-w-[280px] max-w-sm`}
              >
                {config.icon}
                <span className="text-sm text-white/80 flex-1">{t.message}</span>
                <button
                  onClick={() => removeToast(t.id)}
                  className="text-white/30 hover:text-white/60 transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
