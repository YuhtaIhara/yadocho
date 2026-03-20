'use client'

import { useState, useRef, useEffect } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
  addMonths,
  subMonths,
} from 'date-fns'
import { ja } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'

type Props = {
  open: boolean
  onClose: () => void
  onSelect: (date: Date) => void
  selectedDate: Date
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export default function DatePicker({ open, onClose, onSelect, selectedDate }: Props) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selectedDate))
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (open) {
      setViewMonth(startOfMonth(selectedDate))
      ref.current?.showModal()
    } else {
      ref.current?.close()
    }
  }, [open, selectedDate])

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const calStart = startOfWeek(monthStart, { locale: ja })
  const calEnd = endOfWeek(monthEnd, { locale: ja })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })
  const today = new Date()

  function handleSelect(d: Date) {
    onSelect(d)
    onClose()
  }

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
            onClick={() => setViewMonth(m => subMonths(m, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full active:bg-primary-soft"
          >
            <span className="text-text-2">◀</span>
          </button>
          <span className="text-base font-bold">
            {format(viewMonth, 'yyyy年M月', { locale: ja })}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMonth(m => addMonths(m, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-full active:bg-primary-soft"
            >
              <span className="text-text-2">▶</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full active:bg-primary-soft"
            >
              <span className="text-text-2">✕</span>
            </button>
          </div>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 px-3 pt-3">
          {WEEKDAYS.map((w, i) => (
            <span
              key={w}
              className={cn(
                'text-center text-xs font-medium py-1',
                i === 0 ? 'text-danger' : i === 6 ? 'text-blue-500' : 'text-text-3',
              )}
            >
              {w}
            </span>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 px-3 pb-4">
          {days.map(d => {
            const inMonth = isSameMonth(d, viewMonth)
            const isSelected = isSameDay(d, selectedDate)
            const isToday = isSameDay(d, today)
            const dow = d.getDay()
            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => handleSelect(d)}
                disabled={!inMonth}
                className={cn(
                  'w-10 h-10 mx-auto flex items-center justify-center rounded-full text-sm transition-colors',
                  !inMonth && 'invisible',
                  isSelected
                    ? 'bg-primary text-white font-bold'
                    : isToday
                      ? 'bg-primary-soft text-primary font-bold'
                      : dow === 0
                        ? 'text-danger'
                        : dow === 6
                          ? 'text-blue-500'
                          : 'text-text-1',
                  inMonth && !isSelected && 'active:bg-primary-soft',
                )}
              >
                {format(d, 'd')}
              </button>
            )
          })}
        </div>
      </div>
    </dialog>
  )
}
