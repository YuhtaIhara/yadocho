'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addDays,
  subDays,
  isSameMonth,
  format,
} from 'date-fns'
import { ja } from 'date-fns/locale'
import CalendarGrid from '@/components/calendar/CalendarGrid'
import DayPanel from '@/components/calendar/DayPanel'
import MonthPicker from '@/components/MonthPicker'
import { useReservations } from '@/lib/hooks/useReservations'
import { useRooms } from '@/lib/hooks/useRooms'
import { useBlockedDates, useCreateBlockedDate, useDeleteBlockedDate } from '@/lib/hooks/useBlockedDates'
import { toDateStr } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'
import { Palmtree } from 'lucide-react'

export default function CalendarView() {
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [blockMode, setBlockMode] = useState(false)
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)

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
  const createBlocked = useCreateBlockedDate()
  const deleteBlocked = useDeleteBlockedDate()

  function goToday() {
    const today = new Date()
    setCurrentMonth(startOfMonth(today))
    setSelectedDate(today)
  }

  /** Date header tap in block mode -> toggle all-room block */
  function handleSelectDate(d: Date) {
    if (blockMode) {
      const dateStr = toDateStr(d)
      // Check if ANY blocks exist for this date
      const existingBlocks = blockedDates.filter(b => b.date === dateStr)
      if (existingBlocks.length > 0) {
        // Remove ALL blocks for this date
        existingBlocks.forEach(b => deleteBlocked.mutate(b.id))
      } else {
        // Block ALL rooms for this date
        rooms.forEach(room => createBlocked.mutate({ date: dateStr, room_id: room.id }))
      }
      return
    }
    setSelectedDate(d)
    if (!isSameMonth(d, currentMonth)) {
      setCurrentMonth(startOfMonth(d))
    }
  }

  /** Cell tap in block mode -> toggle per-room block */
  function handleBlockToggle(date: string, roomId: string) {
    const existing = blockedDates.find(b => b.date === date && b.room_id === roomId)
    if (existing) {
      deleteBlocked.mutate(existing.id)
    } else {
      createBlocked.mutate({ date, room_id: roomId })
    }
  }

  function handleDayNav(dir: 1 | -1) {
    const next = dir === 1 ? addDays(selectedDate, 1) : subDays(selectedDate, 1)
    handleSelectDate(next)
  }

  function handleCellClick(date: string, roomId: string) {
    router.push(`/reservations/new?date=${date}&room=${roomId}`)
  }

  function handleMonthSelect(d: Date) {
    setCurrentMonth(startOfMonth(d))
    const today = new Date()
    setSelectedDate(isSameMonth(today, d) ? today : d)
  }

  const isCurrentMonth = isSameMonth(currentMonth, new Date())

  // Blocked dates for selected day (for DayPanel)
  const selectedDateStr = toDateStr(selectedDate)
  const blockedForSelectedDay = useMemo(
    () => blockedDates.filter(b => b.date === selectedDateStr),
    [blockedDates, selectedDateStr],
  )

  return (
    <div>
      {/* ── Month navigation ── */}
      <div className="flex items-center justify-between px-5 py-3 bg-background/90 backdrop-blur-lg border-b border-border/40">
        <button
          type="button"
          onClick={goToday}
          className="text-xs font-bold px-3.5 py-1.5 rounded-full text-white bg-primary active:brightness-95 transition-all"
        >
          今日
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMonthPickerOpen(true)}
            className="flex items-center gap-1 text-lg font-bold active:opacity-70 transition-opacity"
          >
            {format(currentMonth, 'yyyy年M月', { locale: ja })} <span className="text-text-2">▼</span>
          </button>
          <MonthPicker
            open={monthPickerOpen}
            onClose={() => setMonthPickerOpen(false)}
            onSelect={handleMonthSelect}
            currentMonth={currentMonth}
          />
        </div>

        <button
          type="button"
          onClick={() => setBlockMode(v => !v)}
          className={cn(
            'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors',
            blockMode
              ? 'bg-danger text-white'
              : 'bg-surface border border-border text-text-2 active:bg-primary-soft',
          )}
        >
          <Palmtree size={14} />
          休設定
        </button>
      </div>

      {/* Block mode banner */}
      {blockMode && (
        <div className="px-4 py-2 bg-danger/10 border-b border-danger/20 text-center">
          <span className="text-xs font-semibold text-danger">
            日付ヘッダー = 全室休業 ／ セル = 部屋別休業
          </span>
        </div>
      )}

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
          onSelectReservation={(id) => router.push(`/reservations/${id}`)}
          onCellClick={blockMode ? undefined : handleCellClick}
          onBlockToggle={blockMode ? handleBlockToggle : undefined}
        />
      )}

      {/* ── Day panel ── */}
      <DayPanel
        date={selectedDate}
        reservations={reservations}
        blockedDates={blockedForSelectedDay}
        rooms={rooms}
        onPrevDay={() => handleDayNav(-1)}
        onNextDay={() => handleDayNav(1)}
        onToday={goToday}
        onSelectDate={handleSelectDate}
        onSelectReservation={(id) => router.push(`/reservations/${id}`)}
      />

    </div>
  )
}
