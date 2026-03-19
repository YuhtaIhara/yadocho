'use client'

import { useState, useMemo } from 'react'
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addDays,
  subDays,
  isSameMonth,
  format,
} from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import CalendarGrid from '@/components/calendar/CalendarGrid'
import DayPanel from '@/components/calendar/DayPanel'
import { useReservations } from '@/lib/hooks/useReservations'
import { useRooms } from '@/lib/hooks/useRooms'
import { useBlockedDates } from '@/lib/hooks/useBlockedDates'
import { toDateStr } from '@/lib/utils/date'

export default function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(() => new Date())

  const monthEnd = endOfMonth(currentMonth)
  const from = toDateStr(currentMonth)
  const to = toDateStr(monthEnd)

  const dates = useMemo(
    () => eachDayOfInterval({ start: currentMonth, end: monthEnd }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [from, to],
  )

  const { data: rooms = [], isLoading: roomsLoading } = useRooms()
  const { data: reservations = [] } = useReservations(from, to)
  const { data: blockedDates = [] } = useBlockedDates(from, to)

  function goMonth(dir: 1 | -1) {
    const next = dir === 1 ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1)
    setCurrentMonth(next)
    const today = new Date()
    setSelectedDate(isSameMonth(today, next) ? today : next)
  }

  function goToday() {
    const today = new Date()
    setCurrentMonth(startOfMonth(today))
    setSelectedDate(today)
  }

  function handleSelectDate(d: Date) {
    setSelectedDate(d)
    if (!isSameMonth(d, currentMonth)) {
      setCurrentMonth(startOfMonth(d))
    }
  }

  function handleDayNav(dir: 1 | -1) {
    const next = dir === 1 ? addDays(selectedDate, 1) : subDays(selectedDate, 1)
    handleSelectDate(next)
  }

  const isCurrentMonth = isSameMonth(currentMonth, new Date())

  return (
    <div>
      {/* ── Month navigation ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-background/90 backdrop-blur-lg border-b border-border/40">
        <button
          type="button"
          onClick={() => goMonth(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-primary-soft transition-colors"
        >
          <ChevronLeft size={20} className="text-text-2" />
        </button>

        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">
            {format(currentMonth, 'yyyy年M月', { locale: ja })}
          </h1>
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={goToday}
              className="text-xs font-semibold text-primary bg-primary-soft px-2.5 py-1 rounded-full active:brightness-95 transition-all"
            >
              今日
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => goMonth(1)}
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-primary-soft transition-colors"
        >
          <ChevronRight size={20} className="text-text-2" />
        </button>
      </div>

      {/* ── Calendar grid ── */}
      {roomsLoading ? (
        <div className="flex items-center justify-center h-48">
          <span className="text-sm text-text-3">読み込み中…</span>
        </div>
      ) : (
        <CalendarGrid
          rooms={rooms}
          reservations={reservations}
          blockedDates={blockedDates}
          dates={dates}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
        />
      )}

      {/* ── Day panel ── */}
      <DayPanel
        date={selectedDate}
        reservations={reservations}
        onPrevDay={() => handleDayNav(-1)}
        onNextDay={() => handleDayNav(1)}
        onToday={goToday}
      />
    </div>
  )
}
