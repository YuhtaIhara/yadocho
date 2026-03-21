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
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) setViewMonth(startOfMonth(selectedDate))
  }, [open, selectedDate])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose])

  if (!open) return null

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
    <>
      <div className="fixed inset-0 bg-black/20 z-40" />
      <div ref={ref} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[min(300px,calc(100%-2rem))] bg-surface rounded-2xl shadow-elevated animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <button
            type="button"
            onClick={() => setViewMonth(m => subMonths(m, 1))}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full active:bg-primary-soft"
          >
            <span className="text-text-2">◀</span>
          </button>
          <span className="text-base font-medium">
            {format(viewMonth, 'yyyy年M月', { locale: ja })}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMonth(m => addMonths(m, 1))}
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full active:bg-primary-soft"
            >
              <span className="text-text-2">▶</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full active:bg-primary-soft"
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
                'text-center text-[15px] font-medium py-1',
                i === 0 ? 'text-danger' : i === 6 ? 'text-staying' : 'text-text-3',
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
                  'w-11 h-11 min-w-[44px] min-h-[44px] mx-auto flex items-center justify-center rounded-full text-sm transition-colors',
                  !inMonth && 'invisible',
                  isSelected
                    ? 'bg-primary text-white font-medium'
                    : isToday
                      ? 'bg-primary-soft text-primary font-medium'
                      : dow === 0
                        ? 'text-danger'
                        : dow === 6
                          ? 'text-staying'
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
    </>
  )
}
