'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format, addDays, subDays, isSameDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useQuery } from '@tanstack/react-query'
import DatePicker from '@/components/DatePicker'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useReservations } from '@/lib/hooks/useReservations'
import { fetchSettledReservationIds } from '@/lib/api/invoices'
import { formatDateJP, nightCount, toDateStr } from '@/lib/utils/date'
import { formatYen } from '@/lib/utils/format'
import { calcMealCost } from '@/lib/utils/pricing'
import { calcAllTaxes, sumTaxResults } from '@/lib/utils/tax'
import { useTaxData } from '@/lib/hooks/useTaxRules'
import { roomLabel, STATUS_LABELS } from '@/lib/types'
import type { Reservation, MealDay } from '@/lib/types'
import { supabase } from '@/lib/supabase'

export default function BillingList() {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const dateStr = toDateStr(selectedDate)
  const isToday = isSameDay(selectedDate, new Date())

  // Fetch reservations where checkout matches the selected date
  // Use a range of selectedDate to selectedDate+1 so the query covers the checkout day
  const from = toDateStr(subDays(selectedDate, 1))
  const to = toDateStr(addDays(selectedDate, 1))

  const { data: reservations = [], isLoading } = useReservations(from, to)

  // Filter to reservations that check out on the selected date
  const billingCandidates = useMemo(
    () => reservations.filter(r =>
      r.checkout === dateStr && r.status !== 'cancelled',
    ),
    [reservations, dateStr],
  )

  const { taxRules, taxRuleRates } = useTaxData()

  // Fetch meal_days for all billing candidates
  const candidateIds = useMemo(() => billingCandidates.map(r => r.id), [billingCandidates])
  const { data: allMealDays = [] } = useQuery({
    queryKey: ['billing-meal-days', candidateIds],
    queryFn: async () => {
      if (candidateIds.length === 0) return []
      const { data } = await supabase
        .from('meal_days')
        .select('*')
        .in('reservation_id', candidateIds)
      return (data ?? []) as MealDay[]
    },
    enabled: candidateIds.length > 0,
  })

  // Fetch invoice_items for settled reservations (to include extras in total)
  const { data: allInvoiceItems = [] } = useQuery({
    queryKey: ['billing-invoice-items', candidateIds],
    queryFn: async () => {
      if (candidateIds.length === 0) return []
      const { data } = await supabase
        .from('invoice_items')
        .select('reservation_id, category, unit_price, quantity')
        .in('reservation_id', candidateIds)
        .eq('category', 'extra')
      return data ?? []
    },
    enabled: candidateIds.length > 0,
  })

  const { data: settledIds = new Set<string>() } = useQuery({
    queryKey: ['settled-ids', billingCandidates.map(r => r.id)],
    queryFn: () => fetchSettledReservationIds(billingCandidates.map(r => r.id)),
    enabled: billingCandidates.length > 0,
  })

  /** Calculate total for a reservation (stay + meal + tax + extras) */
  function calcTotal(r: Reservation): number {
    const nights = nightCount(r.checkin, r.checkout)
    const stay = (r.adult_price * r.adults + r.child_price * r.children) * nights
    const resMeals = allMealDays.filter(md => md.reservation_id === r.id)
    const meal = calcMealCost(resMeals, r)
    const taxResults = calcAllTaxes(
      r.adult_price, r.adults, nights, r.checkin,
      r.tax_exempt, false, taxRules, taxRuleRates,
    )
    const extras = allInvoiceItems
      .filter(item => item.reservation_id === r.id)
      .reduce((s, item) => s + item.unit_price * item.quantity, 0)
    return stay + meal + sumTaxResults(taxResults) + extras
  }

  const { unsettled, settled } = useMemo(() => {
    const u: Reservation[] = []
    const s: Reservation[] = []
    for (const r of billingCandidates) {
      if (r.status === 'settled' || settledIds.has(r.id)) s.push(r)
      else u.push(r)
    }
    return { unsettled: u, settled: s }
  }, [billingCandidates, settledIds])

  function goDay(dir: 1 | -1) {
    setSelectedDate(d => (dir === 1 ? addDays(d, 1) : subDays(d, 1)))
  }

  function goToday() {
    setSelectedDate(new Date())
  }

  const settledTotal = useMemo(() => {
    let total = 0
    for (const r of settled) {
      total += calcTotal(r)
    }
    return total
  }, [settled, allMealDays, allInvoiceItems, taxRules, taxRuleRates])

  return (
    <div>
      <PageHeader title="請求" showBack={false} />

      {/* Date navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
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
        <div className="flex justify-center py-2">
          <button
            type="button"
            onClick={goToday}
            className="text-xs font-semibold text-primary bg-primary-soft px-2.5 py-1 rounded-full active:brightness-95 transition-all"
          >
            今日に戻る
          </button>
        </div>
      )}

      <p className="text-xs text-text-3 text-center py-1">
        チェックアウト日: {format(selectedDate, 'yyyy/MM/dd')}
      </p>

      <div className="px-4 py-4 pb-32 space-y-6">
        {/* Unsettled */}
        <section>
          <h2 className="text-sm font-medium text-text-2 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-warning" />
            未精算（{unsettled.length}件）
          </h2>
          {unsettled.length === 0 && !isLoading && (
            <p className="text-sm text-text-3 text-center py-6">未精算の予約はありません</p>
          )}
          <div className="flex flex-col gap-4">
            {unsettled.map(r => {
              const nights = nightCount(r.checkin, r.checkout)
              const amount = calcTotal(r)
              return (
                <Card
                  key={r.id}
                  className="stagger-item active:scale-[0.98] transition-transform cursor-pointer"
                  onClick={() => router.push(`/billing/${r.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.guest?.name ?? '—'} 様</p>
                      <p className="text-xs text-text-2 mt-0.5">
                        {roomLabel(r)} · {formatDateJP(r.checkin)}〜 {nights}泊
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-medium">{formatYen(amount)}</p>
                      <Badge
                        variant="outline"
                        className="mt-1"
                      >
                        {STATUS_LABELS[r.status] ?? r.status}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full mt-2 text-primary">
                    請求書を見る
                  </Button>
                </Card>
              )
            })}
          </div>
        </section>

        {/* Settled */}
        {settled.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-text-2 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary/60" />
              精算済み（{settled.length}件 · {formatYen(settledTotal)}）
            </h2>
            <div className="flex flex-col gap-4">
              {settled.map(r => {
                const nights = nightCount(r.checkin, r.checkout)
                const amount = calcTotal(r)
                return (
                  <Card
                    key={r.id}
                    className="stagger-item active:scale-[0.98] transition-transform cursor-pointer"
                    onClick={() => router.push(`/billing/${r.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.guest?.name ?? '—'} 様</p>
                        <p className="text-xs text-text-2 mt-0.5">
                          {roomLabel(r)} · {formatDateJP(r.checkin)}〜 {nights}泊
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-sm font-medium">{formatYen(amount)}</p>
                        <Badge variant="outline" className="mt-1">精算済み</Badge>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </section>
        )}

        {isLoading && (
          <p className="text-sm text-text-3 text-center py-8">読み込み中…</p>
        )}
      </div>

      <DatePicker
        open={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        onSelect={(d) => { setSelectedDate(d); setDatePickerOpen(false) }}
        selectedDate={selectedDate}
      />
    </div>
  )
}
