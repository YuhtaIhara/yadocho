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
import { ROOM_TYPE_LABELS, type RoomType } from '@/lib/types'
import SegmentControl from '@/components/ui/SegmentControl'

type ViewDays = 7 | 14 | 'month'

export default function CalendarView() {
  const router = useRouter()
  const [viewStart, setViewStart] = useState(() => new Date())
  const [viewDays, setViewDays] = useState<ViewDays>('month')
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [blockMode, setBlockMode] = useState(false)
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)

  // Swipe removed — conflicts with horizontal scroll

  // Compute date range based on view mode
  const { from, to, dates } = useMemo(() => {
    if (viewDays === 'month') {
      const monthStart = startOfMonth(viewStart)
      const monthEnd = endOfMonth(viewStart)
      return {
        from: toDateStr(monthStart),
        to: toDateStr(monthEnd),
        dates: eachDayOfInterval({ start: monthStart, end: monthEnd }),
      }
    }
    const end = addDays(viewStart, viewDays - 1)
    return {
      from: toDateStr(viewStart),
      to: toDateStr(end),
      dates: eachDayOfInterval({ start: viewStart, end }),
    }
  }, [viewStart, viewDays])

  const { data: rooms = [], isLoading: roomsLoading } = useRooms()
  const { data: reservations = [] } = useReservations(from, to)
  const { data: blockedDates = [] } = useBlockedDates(from, to)
  const createBlocked = useCreateBlockedDate()
  const deleteBlocked = useDeleteBlockedDate()

  // Sort rooms by room_type then sort_order
  const sortedRooms = useMemo(() => {
    const typeOrder: Record<RoomType, number> = { japanese: 0, western: 1, mixed: 2, other: 3 }
    return [...rooms].sort((a, b) => {
      const ta = typeOrder[a.room_type ?? 'japanese'] ?? 3
      const tb = typeOrder[b.room_type ?? 'japanese'] ?? 3
      if (ta !== tb) return ta - tb
      return a.sort_order - b.sort_order
    })
  }, [rooms])

  function goToday() {
    const today = new Date()
    setViewStart(viewDays === 'month' ? startOfMonth(today) : today)
    setSelectedDate(today)
  }

  function navigate(dir: 1 | -1) {
    if (viewDays === 'month') {
      setViewStart(prev => {
        const next = new Date(prev)
        next.setMonth(next.getMonth() + dir)
        return startOfMonth(next)
      })
    } else {
      setViewStart(prev => (dir === 1 ? addDays(prev, viewDays) : subDays(prev, viewDays)))
    }
  }

  function handleViewChange(v: ViewDays) {
    setViewDays(v)
    if (v === 'month') {
      setViewStart(startOfMonth(selectedDate))
    } else {
      setViewStart(selectedDate)
    }
  }

  /** Date header tap in block mode -> toggle all-room block */
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
    if (viewDays === 'month' && !isSameMonth(d, viewStart)) {
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

  function handleDayNav(dir: 1 | -1) {
    const next = dir === 1 ? addDays(selectedDate, 1) : subDays(selectedDate, 1)
    handleSelectDate(next)
  }

  function handleCellClick(date: string, roomId: string) {
    router.push(`/reservations/new?date=${date}&room=${roomId}`)
  }

  function handleMonthSelect(d: Date) {
    setViewStart(startOfMonth(d))
    const today = new Date()
    setSelectedDate(isSameMonth(today, d) ? today : d)
  }


  // Header label
  const headerLabel = useMemo(() => {
    if (viewDays === 'month') {
      return format(viewStart, 'yyyy年M月', { locale: ja })
    }
    const end = addDays(viewStart, (viewDays as number) - 1)
    if (viewStart.getMonth() === end.getMonth()) {
      return `${format(viewStart, 'M/d')}〜${format(end, 'd日')}`
    }
    return `${format(viewStart, 'M/d')}〜${format(end, 'M/d')}`
  }, [viewStart, viewDays])

  // Blocked dates for selected day
  const selectedDateStr = toDateStr(selectedDate)
  const blockedForSelectedDay = useMemo(
    () => blockedDates.filter(b => b.date === selectedDateStr),
    [blockedDates, selectedDateStr],
  )

  return (
    <div>
      {/* ── Navigation bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-background/90 backdrop-blur-lg border-b border-border/40">
        <button
          type="button"
          onClick={goToday}
          className="text-[15px] font-medium px-3 py-1.5 rounded-full text-white bg-primary active:brightness-95 transition-all min-h-[48px]"
        >
          今日
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full active:bg-primary-soft"
          >
            <span className="text-sm text-text-2">◀</span>
          </button>
          <button
            type="button"
            onClick={() => viewDays === 'month' ? setMonthPickerOpen(true) : undefined}
            className="text-sm font-medium px-2 min-w-[120px] text-center"
          >
            {headerLabel}
          </button>
          <button
            type="button"
            onClick={() => navigate(1)}
            className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full active:bg-primary-soft"
          >
            <span className="text-sm text-text-2">▶</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setBlockMode(v => !v)}
          className={cn(
            'flex items-center gap-1 text-[15px] font-medium px-2.5 py-1.5 rounded-full transition-colors min-h-[48px]',
            blockMode
              ? 'bg-danger text-white'
              : 'bg-surface border border-border text-text-2 active:bg-primary-soft',
          )}
        >
          <Palmtree size={14} />
          休み
        </button>
      </div>

      {/* ── View toggle ── */}
      <div className="flex items-center justify-center px-4 py-2 border-b border-border/40">
        <SegmentControl
          options={[
            { value: '7', label: '週' },
            { value: '14', label: '2週' },
            { value: 'month', label: '月' },
          ]}
          selected={String(viewDays)}
          onChange={v => handleViewChange(v === 'month' ? 'month' : Number(v) as 7 | 14)}
        />
      </div>

      {/* Block mode banner */}
      {blockMode && (
        <div className="px-4 py-2 bg-danger/10 border-b border-danger/20 text-center">
          <span className="text-xs font-semibold text-danger">
            日付ヘッダー = 全室休業 ／ セル = 部屋別休業
          </span>
        </div>
      )}

      {/* ── Calendar grid (with swipe) ── */}
      {roomsLoading ? (
        <div className="flex items-center justify-center h-48">
          <span className="text-sm text-text-3">読み込み中…</span>
        </div>
      ) : (
        <div>
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
        </div>
      )}

      {/* ── Day panel ── */}
      <DayPanel
        date={selectedDate}
        reservations={reservations}
        blockedDates={blockedForSelectedDay}
        rooms={sortedRooms}
        onPrevDay={() => handleDayNav(-1)}
        onNextDay={() => handleDayNav(1)}
        onToday={goToday}
        onSelectDate={handleSelectDate}
        onSelectReservation={(id) => router.push(`/reservations/${id}`)}
      />

      <MonthPicker
        open={monthPickerOpen}
        onClose={() => setMonthPickerOpen(false)}
        onSelect={handleMonthSelect}
        currentMonth={viewDays === 'month' ? viewStart : startOfMonth(viewStart)}
      />
    </div>
  )
}
