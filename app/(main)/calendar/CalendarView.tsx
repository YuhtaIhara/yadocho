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
  isSameDay,
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
import { Palmtree, CalendarDays } from 'lucide-react'
import type { RoomType } from '@/lib/types'

export default function CalendarView() {
  const router = useRouter()
  const [viewStart, setViewStart] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [blockMode, setBlockMode] = useState(false)
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)

  // Always month view
  const { from, to, dates } = useMemo(() => {
    const monthStart = startOfMonth(viewStart)
    const monthEnd = endOfMonth(viewStart)
    return {
      from: toDateStr(monthStart),
      to: toDateStr(monthEnd),
      dates: eachDayOfInterval({ start: monthStart, end: monthEnd }),
    }
  }, [viewStart])

  const { data: rooms = [], isLoading: roomsLoading } = useRooms()
  const { data: reservations = [] } = useReservations(from, to)
  const { data: blockedDates = [] } = useBlockedDates(from, to)
  const createBlocked = useCreateBlockedDate()
  const deleteBlocked = useDeleteBlockedDate()

  // Sort rooms by sort_order
  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => {
      return a.sort_order - b.sort_order
    })
  }, [rooms])

  function goToday() {
    const today = new Date()
    setViewStart(startOfMonth(today))
    setSelectedDate(today)
  }

  function handleDayNav(dir: 1 | -1) {
    const next = dir === 1 ? addDays(selectedDate, 1) : subDays(selectedDate, 1)
    if (!isSameMonth(next, viewStart)) {
      setViewStart(startOfMonth(next))
    }
    setSelectedDate(next)
  }

  function handleSelectDate(d: Date) {
    if (blockMode) {
      const dateStr = toDateStr(d)
      const existingBlocks = blockedDates.filter(b => b.date === dateStr)
      if (existingBlocks.length > 0) {
        existingBlocks.forEach(b => deleteBlocked.mutate(b.id))
      } else {
        rooms.forEach(room => createBlocked.mutate({ date: dateStr, room_id: room.id }))
      }
      return
    }
    setSelectedDate(d)
    if (!isSameMonth(d, viewStart)) {
      setViewStart(startOfMonth(d))
    }
  }

  function handleBlockToggle(date: string, roomId: string) {
    const existing = blockedDates.find(b => b.date === date && b.room_id === roomId)
    if (existing) {
      deleteBlocked.mutate(existing.id)
    } else {
      createBlocked.mutate({ date, room_id: roomId })
    }
  }

  function handleCellClick(date: string, roomId: string) {
    router.push(`/reservations/new?date=${date}&room=${roomId}`)
  }

  function handleMonthSelect(d: Date) {
    setViewStart(startOfMonth(d))
    const today = new Date()
    setSelectedDate(isSameMonth(today, d) ? today : d)
  }

  const isToday = isSameDay(selectedDate, new Date())

  // Blocked dates for selected day
  const selectedDateStr = toDateStr(selectedDate)
  const blockedForSelectedDay = useMemo(
    () => blockedDates.filter(b => b.date === selectedDateStr),
    [blockedDates, selectedDateStr],
  )

  return (
    <div>
      {/* ── Unified header: [今日]  ◀ M/d(E) ▶  [休み] ── */}
      <div
        className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border/20"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}
      >
        <div className="flex items-center justify-between px-3 py-1.5">
          <button
            type="button"
            onClick={goToday}
            className={cn(
              'flex items-center gap-1 text-[15px] font-medium px-3 py-1.5 rounded-full active:brightness-95 transition-all min-h-[48px] shrink-0 whitespace-nowrap',
              isToday
                ? 'bg-primary text-white'
                : 'bg-primary/10 text-primary',
            )}
          >
            <CalendarDays size={16} />
            今日
          </button>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => handleDayNav(-1)}
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full active:bg-primary-soft"
            >
              <span className="text-[18px] text-text-2">◀</span>
            </button>
            <button
              type="button"
              onClick={() => setMonthPickerOpen(true)}
              className="text-[17px] font-medium px-1 min-h-[44px] flex items-center whitespace-nowrap"
            >
              {format(selectedDate, 'M/d（E）', { locale: ja })}
            </button>
            <button
              type="button"
              onClick={() => handleDayNav(1)}
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full active:bg-primary-soft"
            >
              <span className="text-[18px] text-text-2">▶</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setBlockMode(v => !v)}
            className={cn(
              'flex items-center gap-1 text-[15px] font-medium px-2.5 py-1.5 rounded-full transition-colors min-h-[48px] shrink-0 whitespace-nowrap',
              blockMode
                ? 'bg-danger text-white'
                : 'bg-surface border border-border text-text-2 active:bg-primary-soft',
            )}
          >
            <Palmtree size={14} />
            休み
          </button>
        </div>

        {/* ── Status legend (inline) ── */}
        <div className="flex items-center justify-center gap-4 px-4 py-1 text-[13px] text-text-sub border-t border-border/10">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'linear-gradient(135deg, #E8A65D, #E09B4E)' }} />
            予約済み
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'linear-gradient(135deg, #5B9A6E, #4F8A60)' }} />
            チェックイン
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'linear-gradient(135deg, #9B9490, #8A8380)' }} />
            精算済み
          </span>
        </div>
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
          rooms={sortedRooms}
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

      {/* ── Day panel (without its own date nav) ── */}
      <DayPanel
        date={selectedDate}
        reservations={reservations}
        blockedDates={blockedForSelectedDay}
        rooms={sortedRooms}
        onSelectReservation={(id) => router.push(`/reservations/${id}`)}
      />

      <MonthPicker
        open={monthPickerOpen}
        onClose={() => setMonthPickerOpen(false)}
        onSelect={handleMonthSelect}
        currentMonth={viewStart}
      />
    </div>
  )
}
