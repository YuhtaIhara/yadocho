'use client'
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type Props = {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export default function Modal({ open, onClose, title, children, className }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (open) ref.current?.showModal()
    else ref.current?.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className={cn(
        'backdrop:bg-black/40 backdrop:animate-fade-in bg-transparent p-0 max-w-lg w-[calc(100%-2rem)] mx-auto rounded-2xl',
        'open:animate-in open:fade-in open:zoom-in-95',
      )}
    >
      <div className={cn('bg-surface rounded-2xl shadow-elevated animate-scale-in', className)}>
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <h2 className="text-base font-medium">{title}</h2>
            <button type="button" onClick={onClose} className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full active:bg-primary-soft">
              <X size={20} className="text-text-2" />
            </button>
          </div>
        )}
        <div className="px-4 py-4">{children}</div>
      </div>
    </dialog>
  )
}
