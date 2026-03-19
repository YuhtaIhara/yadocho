'use client'

import { useState, useMemo } from 'react'
import { format, addDays, isToday as dateFnsIsToday } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Printer, AlertTriangle } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useReservations } from '@/lib/hooks/useReservations'
import { useMealDaysForDate } from '@/lib/hooks/useMealDays'
import { toDateStr } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'
import type { Reservation, MealDay } from '@/lib/types'

type Tab = 'today' | 'tomorrow'

export default function MealBoard() {
  const [tab, setTab] = useState<Tab>('today')
  const today = new Date()
  const targetDate = tab === 'today' ? today : addDays(today, 1)
  const dateStr = toDateStr(targetDate)

  const from = toDateStr(today)
  const to = toDateStr(addDays(today, 2))
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

      {/* Tabs */}
      <div className="flex gap-2 px-4 py-3">
        {(['today', 'tomorrow'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
              tab === t
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface border border-border text-text-2',
            )}
          >
            {t === 'today' ? '今日' : '明日'}
          </button>
        ))}
        <span className="self-center text-sm text-text-3 ml-2">
          {format(targetDate, 'M/d（E）', { locale: ja })}
        </span>
      </div>

      <div className="px-4 pb-32 space-y-4">
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
        {totalLunch > 0 && (
          <MealSection title="昼食" count={totalLunch}>
            {lunchItems.map(m => (
              <MealCard key={m.id} meal={m} type="lunch" />
            ))}
          </MealSection>
        )}

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
      <div className="space-y-1.5">{children}</div>
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
    <Card className="py-2.5 px-3 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs font-bold text-primary bg-primary-soft px-2 py-0.5 rounded">
          {r?.room?.name ?? '—'}
        </span>
        <span className="text-sm font-medium truncate">{r?.guest?.name ?? '—'}</span>
      </div>
      <span className="text-sm text-text-2 shrink-0">
        大人{adults}{children > 0 && ` 子供${children}`}
      </span>
    </Card>
  )
}
