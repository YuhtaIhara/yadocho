'use client'

import { useMemo, useCallback, useRef, useEffect } from 'react'
import {
  format,
  parseISO,
  differenceInCalendarDays,
  isToday as dateFnsIsToday,
  isSameDay,
  getDay,
} from 'date-fns'
import { ja } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'
import type { Room, Reservation, BlockedDate } from '@/lib/types'
import { isJapaneseHoliday } from '@/lib/utils/holidays'

const COL_W = 48
const ROOM_W = 56
const ROW_H = 44
const BAR_Y = 6
const BAR_H = ROW_H - BAR_Y * 2

const BAR_COLORS: Record<string, { bg: string; text: string; border: string; shadow: string }> = {
  scheduled:  { bg: 'linear-gradient(135deg, #E8A65D 0%, #E09B4E 100%)', text: '#FFFFFF', border: '#D49548', shadow: '0 2px 6px rgba(232,166,93,0.35), inset 0 1px 0 rgba(255,255,255,0.2)' },
  checked_in: { bg: 'linear-gradient(135deg, #5B9A6E 0%, #4F8A60 100%)', text: '#FFFFFF', border: '#4A8A5D', shadow: '0 2px 6px rgba(91,154,110,0.35), inset 0 1px 0 rgba(255,255,255,0.2)' },
  settled:    { bg: 'linear-gradient(135deg, #9B9490 0%, #8A8380 100%)', text: '#FFFFFF', border: '#8A8380', shadow: '0 2px 6px rgba(155,148,144,0.25), inset 0 1px 0 rgba(255,255,255,0.15)' },
}

type Props = {
  rooms: Room[]
  reservations: Reservation[]
  blockedDates: BlockedDate[]
  dates: Date[]
  selectedDate: Date
  onSelectDate: (date: Date) => void
  onSelectReservation?: (id: string) => void
  onCellClick?: (date: string, roomId: string) => void
  onBlockToggle?: (date: string, roomId: string) => void
  onEdgeSwipe?: (dir: 'left' | 'right') => void
}

export default function CalendarGrid({
  rooms,
  reservations,
  blockedDates,
  dates,
  selectedDate,
  onSelectDate,
  onSelectReservation,
  onCellClick,
  onBlockToggle,
  onEdgeSwipe,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const firstDate = dates[0]
  const totalDays = dates.length

  const resByRoom = useMemo(() => {
    const map: Record<string, Reservation[]> = {}
    for (const r of reservations) {
      if (r.rooms) {
        for (const room of r.rooms) {
          ;(map[room.id] ??= []).push(r)
        }
      }
    }
    return map
  }, [reservations])

  const blockedLookup = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    for (const b of blockedDates) {
      if (!b.room_id) continue
      ;(map[b.room_id] ??= new Set()).add(b.date)
    }
    return map
  }, [blockedDates])

  const isBlocked = useCallback(
    (roomId: string, dateStr: string) =>
      blockedLookup[roomId]?.has(dateStr) || false,
    [blockedLookup],
  )

  // Always center selectedDate in view
  const isFirstScroll = useRef(true)
  useEffect(() => {
    if (!scrollRef.current || !firstDate) return
    const idx = dates.findIndex(d => isSameDay(d, selectedDate))
    if (idx < 0) return
    const el = scrollRef.current
    const targetLeft = Math.max(0, idx * COL_W - (el.clientWidth - ROOM_W) / 2 + COL_W / 2)
    if (isFirstScroll.current) {
      el.scrollLeft = targetLeft
      isFirstScroll.current = false
    } else {
      el.scrollTo({ left: targetLeft, behavior: 'smooth' })
    }
  }, [selectedDate, dates, firstDate])

  // Edge swipe: detect overscroll at edges to trigger month change
  useEffect(() => {
    if (!scrollRef.current || !onEdgeSwipe) return
    const el = scrollRef.current
    let touchStartX = 0

    function handleTouchStart(e: TouchEvent) {
      touchStartX = e.touches[0].clientX
    }

    function handleTouchEnd(e: TouchEvent) {
      if (!onEdgeSwipe) return
      const dx = e.changedTouches[0].clientX - touchStartX
      const threshold = 60
      if (Math.abs(dx) < threshold) return
      if (el.scrollLeft <= 5 && dx > 0) {
        onEdgeSwipe('left')
      }
      const maxScroll = el.scrollWidth - el.clientWidth
      if (el.scrollLeft >= maxScroll - 5 && dx < 0) {
        onEdgeSwipe('right')
      }
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onEdgeSwipe])

  function barPosition(res: Reservation) {
    if (!firstDate) return null
    const ci = parseISO(res.checkin)
    const co = parseISO(res.checkout)
    const rawStart = differenceInCalendarDays(ci, firstDate)
    const rawEnd = differenceInCalendarDays(co, firstDate)
    // Half-day offset: bar starts at 50% of checkin day, ends at 50% of checkout day
    const HALF = COL_W / 2
    const pxStart = ROOM_W + rawStart * COL_W + HALF
    const pxEnd = ROOM_W + rawEnd * COL_W + HALF
    const visStart = Math.max(ROOM_W, pxStart)
    const visEnd = Math.min(ROOM_W + totalDays * COL_W, pxEnd)
    if (visStart >= visEnd) return null
    return {
      left: visStart + 2,
      width: visEnd - visStart - 4,
      clipL: pxStart < ROOM_W,
      clipR: pxEnd > ROOM_W + totalDays * COL_W,
    }
  }

  if (!firstDate || rooms.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-text-3">
        {rooms.length === 0 ? '部屋が登録されていません' : '読み込み中…'}
      </div>
    )
  }

  const totalW = ROOM_W + totalDays * COL_W

  return (
    <div ref={scrollRef} className="overflow-x-auto scrollbar-hide">
      <div style={{ width: totalW }}>
        {/* ── Date header ── */}
        <div className="flex border-b border-border/40">
          <div
            className="shrink-0 sticky left-0 z-20 bg-background"
            style={{ width: ROOM_W, minWidth: ROOM_W }}
          />
          {dates.map(d => {
            const ds = format(d, 'yyyy-MM-dd')
            const today = dateFnsIsToday(d)
            const selected = isSameDay(d, selectedDate)
            const dow = getDay(d)
            const holiday = isJapaneseHoliday(ds)
            const isRed = dow === 0 || holiday
            return (
              <button
                key={ds}
                type="button"
                onClick={() => onSelectDate(d)}
                className={cn(
                  'shrink-0 flex flex-col items-center justify-center py-1',
                  selected && !today && 'bg-primary/[0.06]',
                )}
                style={{ width: COL_W, minWidth: COL_W }}
              >
                <span
                  className={cn(
                    'text-[15px] leading-none w-7 h-7 flex items-center justify-center rounded-full',
                    today
                      ? 'font-medium text-white bg-primary'
                      : selected
                        ? 'font-medium text-primary'
                        : isRed
                          ? 'text-danger font-medium'
                          : dow === 6
                            ? 'text-blue-500 font-medium'
                            : 'text-text-2',
                  )}
                >
                  {format(d, 'd')}
                </span>
                <span
                  className={cn(
                    'text-[13px] leading-none mt-0.5',
                    today ? 'font-medium text-primary' : isRed ? 'text-danger/70' : dow === 6 ? 'text-blue-400' : 'text-text-3',
                  )}
                >
                  ({format(d, 'E', { locale: ja })})
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Room rows ── */}
        {rooms.map(room => (
          <div key={room.id} className="flex relative" style={{ height: ROW_H }}>
            {/* Room label — sticky left */}
            <div
              className="shrink-0 sticky left-0 z-10 bg-surface flex items-center px-2 border-r border-b border-border/30"
              style={{ width: ROOM_W, minWidth: ROOM_W }}
            >
              <span className="text-[13px] font-medium text-text-1 truncate">{room.name}</span>
            </div>

            {/* Date cells */}
            {dates.map(d => {
              const ds = format(d, 'yyyy-MM-dd')
              const blocked = isBlocked(room.id, ds)
              const today = dateFnsIsToday(d)
              const selected = isSameDay(d, selectedDate)
              const occupied = resByRoom[room.id]?.some(
                r => r.checkin <= ds && r.checkout > ds,
              ) ?? false
              return (
                <div
                  key={ds}
                  onClick={() => {
                    if (onBlockToggle) {
                      onBlockToggle(ds, room.id)
                      return
                    }
                    onSelectDate(d)
                    if (onCellClick && !blocked && !occupied) {
                      onCellClick(ds, room.id)
                    }
                  }}
                  className={cn(
                    'shrink-0 border-r border-b border-border/30 cursor-pointer hover:bg-primary/[0.05] transition-colors',
                    today && 'bg-primary/[0.06] border-l border-l-primary/20',
                    selected && !today && 'bg-primary/[0.06]',
                  )}
                  style={{
                    width: COL_W,
                    minWidth: COL_W,
                    height: ROW_H,
                    ...(blocked
                      ? {
                          backgroundImage:
                            'repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(136,142,126,0.08) 3px, rgba(136,142,126,0.08) 6px)',
                        }
                      : {}),
                  }}
                >
                  {!blocked && !occupied && (
                    <span className="flex items-center justify-center w-full h-full text-[15px] text-text-3/40 select-none">＋</span>
                  )}
                </div>
              )
            })}

            {/* Reservation bars */}
            {resByRoom[room.id]?.map(res => {
              const pos = barPosition(res)
              if (!pos) return null
              const c = BAR_COLORS[res.status] ?? BAR_COLORS.scheduled
              return (
                <button
                  key={res.id}
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    onSelectReservation?.(res.id)
                  }}
                  className="absolute flex items-center gap-0.5 px-1.5 text-[13px] font-semibold truncate active:brightness-90 transition-all"
                  style={{
                    left: pos.left,
                    width: pos.width,
                    top: BAR_Y,
                    height: BAR_H,
                    background: c.bg,
                    color: c.text,
                    border: `1px solid ${c.border}`,
                    boxShadow: c.shadow,
                    borderRadius: `${pos.clipL ? 0 : 6}px ${pos.clipR ? 0 : 6}px ${pos.clipR ? 0 : 6}px ${pos.clipL ? 0 : 6}px`,
                    zIndex: 5,
                  }}
                >
                  <span style={{ textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
                    {(res.guest?.name ?? '—').split(/[\s　]/)[0]}
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
