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

const COL_W = 48
const ROOM_W = 56
const ROW_H = 44
const BAR_Y = 6
const BAR_H = ROW_H - BAR_Y * 2

const BAR_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  scheduled:   { bg: 'rgba(139,74,63,0.12)',  text: '#8b4a3f', border: 'rgba(139,74,63,0.22)' },
  checked_in:  { bg: 'rgba(118,145,100,0.15)', text: '#5a7048', border: 'rgba(118,145,100,0.28)' },
  checked_out: { bg: 'rgba(136,142,126,0.10)', text: '#888e7e', border: 'rgba(136,142,126,0.15)' },
}

type Props = {
  rooms: Room[]
  reservations: Reservation[]
  blockedDates: BlockedDate[]
  dates: Date[]
  selectedDate: Date
  onSelectDate: (date: Date) => void
  onSelectReservation?: (id: string) => void
}

export default function CalendarGrid({
  rooms,
  reservations,
  blockedDates,
  dates,
  selectedDate,
  onSelectDate,
  onSelectReservation,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const firstDate = dates[0]
  const totalDays = dates.length

  const resByRoom = useMemo(() => {
    const map: Record<string, Reservation[]> = {}
    for (const r of reservations) {
      ;(map[r.room_id] ??= []).push(r)
    }
    return map
  }, [reservations])

  const blockedLookup = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    for (const b of blockedDates) {
      const key = b.room_id ?? '__all__'
      ;(map[key] ??= new Set()).add(b.date)
    }
    return map
  }, [blockedDates])

  const isBlocked = useCallback(
    (roomId: string, dateStr: string) =>
      blockedLookup.__all__?.has(dateStr) || blockedLookup[roomId]?.has(dateStr) || false,
    [blockedLookup],
  )

  useEffect(() => {
    if (!scrollRef.current || !firstDate) return
    const todayIdx = dates.findIndex(d => dateFnsIsToday(d))
    if (todayIdx >= 0) {
      scrollRef.current.scrollLeft = Math.max(0, todayIdx * COL_W - COL_W * 2)
    }
  }, [dates, firstDate])

  function barPosition(res: Reservation) {
    if (!firstDate) return null
    const ci = parseISO(res.checkin)
    const co = parseISO(res.checkout)
    const rawStart = differenceInCalendarDays(ci, firstDate)
    const rawEnd = differenceInCalendarDays(co, firstDate) - 1
    const s = Math.max(0, rawStart)
    const e = Math.min(totalDays - 1, rawEnd)
    if (s > totalDays - 1 || e < 0) return null
    return {
      left: ROOM_W + s * COL_W + 2,
      width: (e - s + 1) * COL_W - 4,
      clipL: rawStart < 0,
      clipR: rawEnd >= totalDays,
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
            return (
              <button
                key={ds}
                type="button"
                onClick={() => onSelectDate(d)}
                className={cn(
                  'shrink-0 flex flex-col items-center justify-center py-1.5',
                  selected && 'bg-primary-soft',
                )}
                style={{ width: COL_W, minWidth: COL_W }}
              >
                <span
                  className={cn(
                    'text-[11px] leading-none',
                    today
                      ? 'font-bold text-primary'
                      : dow === 0
                        ? 'text-danger/70'
                        : dow === 6
                          ? 'text-primary/60'
                          : 'text-text-2',
                  )}
                >
                  {format(d, 'd')}
                </span>
                <span
                  className={cn(
                    'text-[10px] leading-none mt-0.5',
                    today ? 'font-bold text-primary' : 'text-text-3',
                  )}
                >
                  {format(d, 'E', { locale: ja })}
                </span>
                {today && <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
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
              <span className="text-xs font-bold text-text-1 truncate">{room.name}</span>
            </div>

            {/* Date cells */}
            {dates.map(d => {
              const ds = format(d, 'yyyy-MM-dd')
              const blocked = isBlocked(room.id, ds)
              const today = dateFnsIsToday(d)
              const selected = isSameDay(d, selectedDate)
              return (
                <div
                  key={ds}
                  onClick={() => onSelectDate(d)}
                  className={cn(
                    'shrink-0 border-r border-b border-border/15 cursor-pointer',
                    today && 'bg-primary/[0.03]',
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
                />
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
                  className="absolute flex items-center px-1.5 text-[11px] font-semibold truncate active:brightness-90 transition-all"
                  style={{
                    left: pos.left,
                    width: pos.width,
                    top: BAR_Y,
                    height: BAR_H,
                    backgroundColor: c.bg,
                    color: c.text,
                    border: `1px solid ${c.border}`,
                    borderRadius: `${pos.clipL ? 0 : 6}px ${pos.clipR ? 0 : 6}px ${pos.clipR ? 0 : 6}px ${pos.clipL ? 0 : 6}px`,
                    zIndex: 5,
                  }}
                >
                  {res.guest?.name ?? '—'}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
