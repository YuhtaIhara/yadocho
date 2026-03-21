'use client'

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type ToastType = 'error' | 'success' | 'info'

type Toast = {
  id: number
  message: string
  type: ToastType
}

type ToastContextType = {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'error') => {
    const id = ++nextId
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 2000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  const borderColor = toast.type === 'error' ? 'var(--color-danger)' : toast.type === 'success' ? 'var(--color-checkin)' : 'var(--color-border)'
  const icon = toast.type === 'success' ? <Check size={16} className="text-checkin" /> : toast.type === 'error' ? <X size={16} className="text-danger" /> : null

  return (
    <div
      className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl bg-surface shadow-elevated text-[15px] text-text-1 animate-fade-in-up border-l-4"
      style={{ borderLeftColor: borderColor }}
    >
      {icon}
      <span className="flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full opacity-70 active:opacity-100"
      >
        <X size={14} className="text-text-3" />
      </button>
    </div>
  )
}
