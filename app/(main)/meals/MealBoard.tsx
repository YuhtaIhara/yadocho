'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { format, addDays, subDays, isSameDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, ChevronDown, Printer, AlertTriangle } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Textarea } from '@/components/ui/Textarea'
import { useReservations } from '@/lib/hooks/useReservations'
import { useMealDaysForDate } from '@/lib/hooks/useMealDays'
import { toDateStr } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'
import { roomLabel } from '@/lib/types'
import type { Reservation, MealDay } from '@/lib/types'

function useKondate(dateStr: string) {
  const storageKey = `yadocho-kondate-${dateStr}`
  const [value, setValue] = useState('')
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    setValue(saved ?? '')
  }, [storageKey])

  const save = useCallback(
    (text: string) => {
      setValue(text)
      if (text.trim()) {
        localStorage.setItem(storageKey, text)
      } else {
        localStorage.removeItem(storageKey)
      }
    },
    [storageKey],
  )

  return { value, save, expanded, setExpanded }
}

export default function MealBoard() {
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const dateStr = toDateStr(selectedDate)
  const isToday = isSameDay(selectedDate, new Date())
  const kondate = useKondate(dateStr)

  // Fetch reservations covering the selected date
  const from = toDateStr(subDays(selectedDate, 1))
  const to = toDateStr(addDays(selectedDate, 1))
  const { data: reservations = [] } = useReservations(from, to)

  const activeRes = useMemo(
    () => reservations.filter(r => r.checkin <= dateStr && r.checkout > dateStr),
    [reservations, dateStr],
  )
  const resIds = useMemo(() => activeRes.map(r => r.id), [activeRes])
  const { data: mealDays = [] } = useMealDaysForDate(dateStr, resIds)

  const resMap = useMemo(
    () => Object.fromEntries(activeRes.map(r => [r.id, r])),
    [activeRes],
  )

  const enriched = useMemo(
    () => mealDays.map(md => ({ ...md, reservation: resMap[md.reservation_id] })),
    [mealDays, resMap],
  )

  const breakfastItems = enriched.filter(
    m => m.breakfast_adults + m.breakfast_children > 0,
  )
  const dinnerItems = enriched.filter(
    m => m.dinner_adults + m.dinner_children > 0,
  )
  const lunchItems = enriched.filter(
    m => m.lunch_adults + m.lunch_children > 0,
  )

  const dinnerByTime = useMemo(() => {
    const map: Record<string, typeof dinnerItems> = {}
    for (const m of dinnerItems) {
      const key = m.dinner_time?.slice(0, 5) ?? '未定'
      ;(map[key] ??= []).push(m)
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [dinnerItems])

  const allergies = useMemo(() => {
    const set = new Map<string, { name: string; allergy: string }>()
    for (const m of enriched) {
      const g = m.reservation?.guest
      if (g?.allergy) set.set(g.id, { name: g.name, allergy: g.allergy })
    }
    return [...set.values()]
  }, [enriched])

  const totalBreakfast = breakfastItems.reduce(
    (s, m) => s + m.breakfast_adults + m.breakfast_children,
    0,
  )
  const totalDinner = dinnerItems.reduce(
    (s, m) => s + m.dinner_adults + m.dinner_children,
    0,
  )
  const totalLunch = lunchItems.reduce(
    (s, m) => s + m.lunch_adults + m.lunch_children,
    0,
  )

  function goDay(dir: 1 | -1) {
    setSelectedDate(d => (dir === 1 ? addDays(d, 1) : subDays(d, 1)))
  }

  function goToday() {
    setSelectedDate(new Date())
  }

  return (
    <div>
      <PageHeader
        title="食事ボード"
        showBack={false}
        rightSlot={
          <button
            type="button"
            onClick={() => window.print()}
            className="w-10 h-10 flex items-center justify-center rounded-full active:bg-primary-soft"
          >
            <Printer size={18} className="text-text-2" />
          </button>
        }
      />

      {/* Date navigation */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => goDay(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-primary-soft transition-colors"
        >
          <ChevronLeft size={20} className="text-text-2" />
        </button>

        <button
          type="button"
          onClick={goToday}
          className="flex items-center gap-2"
        >
          <span className="text-base font-bold">
            {format(selectedDate, 'M/d（E）', { locale: ja })}
          </span>
          {isToday && <Badge>今日</Badge>}
        </button>

        <button
          type="button"
          onClick={() => goDay(1)}
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-primary-soft transition-colors"
        >
          <ChevronRight size={20} className="text-text-2" />
        </button>
      </div>

      {/* "今日" reset button when not today */}
      {!isToday && (
        <div className="flex justify-center pb-2">
          <button
            type="button"
            onClick={goToday}
            className="text-xs font-semibold text-primary bg-primary-soft px-2.5 py-1 rounded-full active:brightness-95 transition-all"
          >
            今日に戻る
          </button>
        </div>
      )}

      <div className="px-4 pb-32 space-y-4">
        {/* Kondate (menu) */}
        <div className="print-visible">
          <button
            type="button"
            onClick={() => kondate.setExpanded(!kondate.expanded)}
            className="flex items-center gap-2 mb-2 w-full text-left"
          >
            <h2 className="text-sm font-bold text-text-2">献立</h2>
            {kondate.value && <Badge>入力済</Badge>}
            <ChevronDown
              size={16}
              className={cn(
                'text-text-3 transition-transform ml-auto no-print',
                kondate.expanded && 'rotate-180',
              )}
            />
          </button>
          {kondate.expanded && (
            <Textarea
              placeholder="今日の献立を入力…"
              value={kondate.value}
              onChange={e => kondate.save(e.target.value)}
              rows={3}
              className="no-print"
            />
          )}
          {/* Print-only: always show kondate if there's content */}
          {kondate.value && (
            <div className="hidden print:block whitespace-pre-wrap text-sm border border-border rounded-xl p-3 mt-1">
              {kondate.value}
            </div>
          )}
        </div>

        {/* Breakfast */}
        <MealSection title="朝食" count={totalBreakfast}>
          {breakfastItems.length === 0 ? (
            <p className="text-sm text-text-3">なし</p>
          ) : (
            breakfastItems.map(m => (
              <MealCard key={m.id} meal={m} type="breakfast" />
            ))
          )}
        </MealSection>

        {/* Lunch */}
        <MealSection title="昼食" count={totalLunch}>
          {lunchItems.length === 0 ? (
            <p className="text-sm text-text-3">なし</p>
          ) : (
            lunchItems.map(m => (
              <MealCard key={m.id} meal={m} type="lunch" />
            ))
          )}
        </MealSection>

        {/* Dinner */}
        <MealSection title="夕食" count={totalDinner}>
          {dinnerItems.length === 0 ? (
            <p className="text-sm text-text-3">なし</p>
          ) : (
            dinnerByTime.map(([time, items]) => (
              <div key={time}>
                <p className="text-xs font-semibold text-text-3 mb-1 mt-2">
                  {time} — {items.reduce((s, m) => s + m.dinner_adults + m.dinner_children, 0)}名
                </p>
                {items.map(m => (
                  <MealCard key={m.id} meal={m} type="dinner" />
                ))}
              </div>
            ))
          )}
        </MealSection>

        {/* Allergies */}
        {allergies.length > 0 && (
          <Card className="!bg-danger-soft border border-danger/10">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-danger" />
              <span className="text-sm font-bold text-danger">アレルギー注意</span>
            </div>
            {allergies.map(a => (
              <p key={a.name} className="text-sm">
                <span className="font-medium">{a.name}</span> 様 — {a.allergy}
              </p>
            ))}
          </Card>
        )}

        {totalBreakfast === 0 && totalDinner === 0 && totalLunch === 0 && (
          <p className="text-sm text-text-3 text-center py-8">この日の食事はありません</p>
        )}
      </div>
    </div>
  )
}

function MealSection({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-sm font-bold text-text-2">{title}</h2>
        <Badge>{count}名</Badge>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function MealCard({
  meal,
  type,
}: {
  meal: MealDay & { reservation?: Reservation }
  type: 'breakfast' | 'lunch' | 'dinner'
}) {
  const r = meal.reservation
  const adults = type === 'breakfast' ? meal.breakfast_adults : type === 'lunch' ? meal.lunch_adults : meal.dinner_adults
  const children = type === 'breakfast' ? meal.breakfast_children : type === 'lunch' ? meal.lunch_children : meal.dinner_children
  const total = adults + children

  return (
    <Card className="py-3.5 px-3 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs font-bold text-primary bg-primary-soft px-2 py-0.5 rounded">
          {r ? roomLabel(r) : '—'}
        </span>
        <span className="text-sm font-medium truncate">{r?.guest?.name ?? '—'}</span>
      </div>
      <span className="text-sm text-text-2 shrink-0">
        大人{adults}{children > 0 && ` 子供${children}`}
      </span>
    </Card>
  )
}
