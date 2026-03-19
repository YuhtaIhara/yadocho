'use client'

import { useState, useRef, useEffect } from 'react'
import { startOfMonth, isSameMonth } from 'date-fns'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type Props = {
  open: boolean
  onClose: () => void
  onSelect: (date: Date) => void
  currentMonth: Date
}

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

export default function MonthPicker({ open, onClose, onSelect, currentMonth }: Props) {
  const [year, setYear] = useState(() => currentMonth.getFullYear())
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (open) {
      setYear(currentMonth.getFullYear())
      ref.current?.showModal()
    } else {
      ref.current?.close()
    }
  }, [open, currentMonth])

  function handleSelect(month: number) {
    onSelect(new Date(year, month, 1))
    onClose()
  }

  const now = new Date()
  const thisMonth = startOfMonth(now)

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className={cn(
        'backdrop:bg-black/40 bg-transparent p-0 max-w-xs w-[calc(100%-2rem)] mx-auto rounded-2xl',
        'open:animate-in open:fade-in open:zoom-in-95',
      )}
    >
      <div className="bg-surface rounded-2xl shadow-elevated">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <button
            type="button"
            onClick={() => setYear(y => y - 1)}
            className="w-8 h-8 flex items-center justify-center rounded-full active:bg-primary-soft"
          >
            <ChevronLeft size={18} className="text-text-2" />
          </button>
          <span className="text-base font-bold">{year}年</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setYear(y => y + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-full active:bg-primary-soft"
            >
              <ChevronRight size={18} className="text-text-2" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full active:bg-primary-soft"
            >
              <X size={18} className="text-text-2" />
            </button>
          </div>
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-3 gap-2 p-4">
          {MONTHS.map((label, i) => {
            const target = new Date(year, i, 1)
            const isCurrent = isSameMonth(target, thisMonth)
            const isSelected = isSameMonth(target, currentMonth)
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(i)}
                className={cn(
                  'py-2.5 rounded-xl text-sm font-semibold transition-colors',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : isCurrent
                      ? 'bg-primary-soft text-primary'
                      : 'text-text-1 active:bg-primary-soft',
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </dialog>
  )
}
