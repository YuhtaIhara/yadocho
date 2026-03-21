'use client'

import { useState, useMemo } from 'react'
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  format,
  parseISO,
  differenceInCalendarDays,
} from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useReservations } from '@/lib/hooks/useReservations'
import { usePricing } from '@/lib/hooks/usePricing'
import { calcMealCost } from '@/lib/utils/pricing'
import { toDateStr } from '@/lib/utils/date'
import { formatYen } from '@/lib/utils/format'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { calcAllTaxes, sumTaxResults } from '@/lib/utils/tax'
import { useTaxData } from '@/lib/hooks/useTaxRules'
import { supabase } from '@/lib/supabase'
import type { MealDay, InvoiceItem } from '@/lib/types'

export default function ReportView() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))

  const from = toDateStr(month)
  const to = toDateStr(endOfMonth(month))

  const { data: reservations = [] } = useReservations(from, to)
  const { data: pricing } = usePricing()
  const { taxRules, taxRuleRates } = useTaxData()

  const reservationIds = useMemo(
    () => reservations.map(r => r.id),
    [reservations],
  )

  // Fetch all meal_days for these reservations
  const { data: allMealDays = [] } = useQuery({
    queryKey: ['report-meal-days', reservationIds],
    queryFn: async () => {
      if (reservationIds.length === 0) return []
      const { data, error } = await supabase
        .from('meal_days')
        .select('*')
        .in('reservation_id', reservationIds)
      if (error) throw error
      return (data ?? []) as MealDay[]
    },
    enabled: reservationIds.length > 0,
  })

  // Fetch all invoice_items for these reservations
  const { data: allInvoiceItems = [] } = useQuery({
    queryKey: ['report-invoice-items', reservationIds],
    queryFn: async () => {
      if (reservationIds.length === 0) return []
      const { data, error } = await supabase
        .from('invoice_items')
        .select('*')
        .in('reservation_id', reservationIds)
      if (error) throw error
      return (data ?? []) as InvoiceItem[]
    },
    enabled: reservationIds.length > 0,
  })

  // Build report numbers
  const report = useMemo(() => {
    const totalReservations = reservations.length
    let totalAdults = 0
    let totalChildren = 0
    let totalNights = 0
    let stayRevenue = 0
    let taxCollected = 0

    for (const res of reservations) {
      totalAdults += res.adults
      totalChildren += res.children
      const nights = differenceInCalendarDays(parseISO(res.checkout), parseISO(res.checkin))
      totalNights += nights
      stayRevenue += (res.adult_price * res.adults + res.child_price * res.children) * nights

      const taxResults = calcAllTaxes(
        res.adult_price, res.adults, nights, res.checkin,
        res.tax_exempt, false, taxRules, taxRuleRates,
      )
      taxCollected += sumTaxResults(taxResults)
    }

    // Meal revenue: 予約ごとにスナップショットされた食事単価で計算
    let mealRevenue = 0
    for (const res of reservations) {
      const resMeals = allMealDays.filter(md => md.reservation_id === res.id)
      mealRevenue += calcMealCost(resMeals, res)
    }

    // Extras from invoice_items
    let extrasRevenue = 0
    for (const item of allInvoiceItems) {
      if (item.category === 'extra') {
        extrasRevenue += item.unit_price * item.quantity
      }
    }

    const grandTotal = stayRevenue + mealRevenue + extrasRevenue + taxCollected

    return {
      totalReservations,
      totalAdults,
      totalChildren,
      totalGuests: totalAdults + totalChildren,
      totalNights,
      stayRevenue,
      mealRevenue,
      extrasRevenue,
      taxCollected,
      grandTotal,
    }
  }, [reservations, allMealDays, allInvoiceItems, pricing, taxRules, taxRuleRates])

  function goMonth(dir: 1 | -1) {
    setMonth(prev => (dir === 1 ? addMonths(prev, 1) : subMonths(prev, 1)))
  }

  return (
    <div>
      <PageHeader
        title="月次レポート"
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

      {/* Month selector */}
      <div className="flex items-center justify-center gap-4 px-4 py-3 border-b border-border/40">
        <button
          type="button"
          onClick={() => goMonth(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-primary-soft transition-colors"
        >
          <ChevronLeft size={20} className="text-text-2" />
        </button>
        <h2 className="text-lg font-medium">
          {format(month, 'yyyy年M月', { locale: ja })}
        </h2>
        <button
          type="button"
          onClick={() => goMonth(1)}
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-primary-soft transition-colors"
        >
          <ChevronRight size={20} className="text-text-2" />
        </button>
      </div>

      <div className="px-4 py-4 space-y-4 pb-32">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center py-3">
            <p className="text-2xl font-medium text-primary">{report.totalReservations}</p>
            <p className="text-xs text-text-3 mt-1">予約数</p>
          </Card>
          <Card className="text-center py-3">
            <p className="text-2xl font-medium text-primary">{report.totalGuests}</p>
            <p className="text-xs text-text-3 mt-1">ゲスト数</p>
          </Card>
          <Card className="text-center py-3">
            <p className="text-2xl font-medium text-primary">{report.totalNights}</p>
            <p className="text-xs text-text-3 mt-1">延べ泊数</p>
          </Card>
        </div>

        {/* Guest breakdown */}
        <Card>
          <h3 className="text-sm font-medium text-text-2 mb-2">ゲスト内訳</h3>
          <div className="text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-text-2">大人</span>
              <span className="font-medium">{report.totalAdults}名</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-2">子供</span>
              <span className="font-medium">{report.totalChildren}名</span>
            </div>
          </div>
        </Card>

        {/* Revenue breakdown */}
        <Card>
          <h3 className="text-sm font-medium text-text-2 mb-2">売上内訳</h3>
          <div className="text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-text-2">宿泊売上</span>
              <span className="font-medium">{formatYen(report.stayRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-2">食事売上</span>
              <span className="font-medium">{formatYen(report.mealRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-2">その他売上</span>
              <span className="font-medium">{formatYen(report.extrasRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-2">宿泊税</span>
              <span className="font-medium">{formatYen(report.taxCollected)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border/40">
              <span className="font-medium">合計</span>
              <span className="font-medium text-lg">{formatYen(report.grandTotal)}</span>
            </div>
          </div>
        </Card>

        {/* Daily report link */}
        <Link href="/report/daily">
          <Card className="!bg-primary/[0.04] border border-primary/10 flex flex-row items-center gap-3">
            <FileText size={20} className="text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">売上日報</p>
              <p className="text-xs text-text-3">日別の予約売上明細を確認</p>
            </div>
          </Card>
        </Link>

        {/* Tax report link */}
        <Link href="/report/tax">
          <Card className="!bg-primary/[0.04] border border-primary/10 flex flex-row items-center gap-3">
            <FileText size={20} className="text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">税申告書を出力</p>
              <p className="text-xs text-text-3">月計表・納入申告書をPDFで生成</p>
            </div>
          </Card>
        </Link>

        {/* Print button */}
        <Button size="lg" className="w-full print:hidden" onClick={() => window.print()}>
          <Printer size={18} />
          印刷
        </Button>
      </div>
    </div>
  )
}
