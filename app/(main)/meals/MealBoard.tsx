'use client'

import { useState, useMemo, useCallback } from 'react'
import { format, addDays, subDays, isSameDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronDown, ChevronRight, FileText, AlertTriangle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Textarea } from '@/components/ui/Textarea'
import { useInn } from '@/lib/hooks/useInn'
import { useReservations } from '@/lib/hooks/useReservations'
import { useMealDaysForDate } from '@/lib/hooks/useMealDays'
import { fetchKondate, upsertKondate } from '@/lib/api/kondate'
import { toDateStr } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'
import { roomLabel, type Reservation, type MealDay } from '@/lib/types'
import type { MealEntry } from '@/lib/pdf/MealDailyReport'
import DatePicker from '@/components/DatePicker'
import MealEditor from '@/components/MealEditor'
import { useToast } from '@/components/ui/Toast'

function useKondateDB(dateStr: string) {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['kondate', dateStr],
    queryFn: () => fetchKondate(dateStr),
  })
  const [expanded, setExpanded] = useState(true)
  const [localValue, setLocalValue] = useState<string | null>(null)

  const value = localValue ?? data?.content ?? ''

  const save = useCallback(
    (text: string) => {
      setLocalValue(text)
      upsertKondate(dateStr, text).then(() => {
        qc.invalidateQueries({ queryKey: ['kondate', dateStr] })
      })
    },
    [dateStr, qc],
  )

  // Reset local value when date changes
  if (localValue !== null && data?.content === localValue) {
    setLocalValue(null)
  }

  return { value, save, expanded, setExpanded }
}

export default function MealBoard() {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const { data: inn } = useInn()
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [pdfLoading, setPdfLoading] = useState(false)
  const dateStr = toDateStr(selectedDate)
  const isToday = isSameDay(selectedDate, new Date())
  const kondate = useKondateDB(dateStr)

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

  async function generateDailyPDF() {
    setPdfLoading(true)
    try {
      const React = await import('react')
      const { pdf } = await import('@react-pdf/renderer')
      const { default: MealDailyReport } = await import('@/lib/pdf/MealDailyReport')

      const toEntry = (m: typeof enriched[0], type: 'dinner' | 'breakfast' | 'lunch'): MealEntry => ({
        roomName: m.reservation ? roomLabel(m.reservation) : '—',
        guestName: m.reservation?.guest?.name ?? '—',
        adults: type === 'dinner' ? m.dinner_adults : type === 'breakfast' ? m.breakfast_adults : m.lunch_adults,
        children: type === 'dinner' ? m.dinner_children : type === 'breakfast' ? m.breakfast_children : m.lunch_children,
        time: type === 'dinner' ? m.dinner_time?.slice(0, 5) : undefined,
        allergy: m.reservation?.guest?.allergy || undefined,
      })

      const element = React.createElement(MealDailyReport, {
        innName: inn?.name ?? '',
        date: format(selectedDate, 'yyyy年M月d日（E）', { locale: ja }),
        dinner: dinnerItems.map(m => toEntry(m, 'dinner')),
        breakfast: breakfastItems.map(m => toEntry(m, 'breakfast')),
        lunch: lunchItems.map(m => toEntry(m, 'lunch')),
        kondate: kondate.value,
        allergies,
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await pdf(element as any).toBlob()
      const filename = `料理帳票_${format(selectedDate, 'yyyyMMdd')}.pdf`

      if (typeof navigator !== 'undefined' && navigator.share) {
        const file = new File([blob], filename, { type: 'application/pdf' })
        await navigator.share({ files: [file] })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.error('PDF generation failed:', e)
        showToast('PDF生成に失敗しました')
      }
    } finally {
      setPdfLoading(false)
    }
  }

  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [editingReservationId, setEditingReservationId] = useState<string | null>(null)
  const editingMealDays = useMemo(
    () => editingReservationId ? mealDays.filter(m => m.reservation_id === editingReservationId) : [],
    [editingReservationId, mealDays],
  )

  return (
    <div>
      <PageHeader
        title="食事ボード"
        showBack={false}
        rightSlot={
          <button
            type="button"
            onClick={generateDailyPDF}
            disabled={pdfLoading}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-surface border border-border text-text-2 active:bg-primary-soft transition-colors disabled:opacity-50"
          >
            <FileText size={14} />
            {pdfLoading ? '生成中…' : 'PDF'}
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
          <span className="text-lg text-text-2">◀</span>
        </button>

        <button
          type="button"
          onClick={() => setDatePickerOpen(true)}
          className="flex items-center gap-2"
        >
          <span className="text-base font-medium">
            {format(selectedDate, 'M/d（E）', { locale: ja })}
          </span>
          {isToday && <Badge>今日</Badge>}
        </button>

        <button
          type="button"
          onClick={() => goDay(1)}
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-primary-soft transition-colors"
        >
          <span className="text-lg text-text-2">▶</span>
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
            <h2 className="text-sm font-medium text-text-2">献立</h2>
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

        {/* Breakfast — 1名以上のみ表示 */}
        {totalBreakfast > 0 && (
          <MealSection title="朝食" count={totalBreakfast}>
            {breakfastItems.map(m => (
              <MealCard key={m.id} meal={m} type="breakfast" onEdit={() => setEditingReservationId(m.reservation_id)} />
            ))}
          </MealSection>
        )}

        {/* Lunch — 1名以上のみ表示 */}
        {totalLunch > 0 && (
          <MealSection title="昼食" count={totalLunch}>
            {lunchItems.map(m => (
              <MealCard key={m.id} meal={m} type="lunch" onEdit={() => setEditingReservationId(m.reservation_id)} />
            ))}
          </MealSection>
        )}

        {/* Dinner — 1名以上のみ表示 */}
        {totalDinner > 0 && (
          <MealSection title="夕食" count={totalDinner}>
            {dinnerByTime.map(([time, items]) => (
              <div key={time}>
                <p className="text-xs font-semibold text-text-3 mb-1 mt-2">
                  {time} — {items.reduce((s, m) => s + m.dinner_adults + m.dinner_children, 0)}名
                </p>
                {items.map(m => (
                  <MealCard key={m.id} meal={m} type="dinner" onEdit={() => setEditingReservationId(m.reservation_id)} />
                ))}
              </div>
            ))}
          </MealSection>
        )}

        {/* Allergies */}
        {allergies.length > 0 && (
          <Card className="!bg-danger-soft border border-danger/10">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-danger" />
              <span className="text-sm font-medium text-danger">アレルギー注意</span>
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

      {editingReservationId && (
        <MealEditor
          reservationId={editingReservationId}
          mealDays={editingMealDays}
          open={!!editingReservationId}
          onClose={() => setEditingReservationId(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['mealDaysForDate'] })
          }}
        />
      )}

      <DatePicker
        open={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        onSelect={(d) => { setSelectedDate(d); setDatePickerOpen(false) }}
        selectedDate={selectedDate}
      />
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
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 mb-2 w-full text-left min-h-[48px] active:bg-primary-soft/50 rounded-lg px-1"
      >
        {open ? <ChevronDown size={16} className="text-text-3" /> : <ChevronRight size={16} className="text-text-3" />}
        <h2 className="text-[15px] font-medium text-text-2 flex-1">{title}</h2>
        <Badge>{count}名</Badge>
      </button>
      {open && <div className="flex flex-col gap-4">{children}</div>}
    </div>
  )
}

function MealCard({
  meal,
  type,
  onEdit,
}: {
  meal: MealDay & { reservation?: Reservation }
  type: 'breakfast' | 'lunch' | 'dinner'
  onEdit?: () => void
}) {
  const r = meal.reservation
  const adults = type === 'breakfast' ? meal.breakfast_adults : type === 'lunch' ? meal.lunch_adults : meal.dinner_adults
  const children = type === 'breakfast' ? meal.breakfast_children : type === 'lunch' ? meal.lunch_children : meal.dinner_children
  const total = adults + children

  return (
    <Card className="py-3.5 px-3 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform" onClick={onEdit}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs font-medium text-primary bg-primary-soft px-2 py-0.5 rounded">
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
