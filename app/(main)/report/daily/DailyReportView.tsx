'use client'

import { useState, useMemo } from 'react'
import {
  format,
  addDays,
  subDays,
  parseISO,
  differenceInCalendarDays,
} from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useReservations } from '@/lib/hooks/useReservations'
import { useTaxData } from '@/lib/hooks/useTaxRules'
import { toDateStr } from '@/lib/utils/date'
import { formatYen } from '@/lib/utils/format'
import { calcAllTaxes, sumTaxResults } from '@/lib/utils/tax'
import { roomLabel, STATUS_LABELS } from '@/lib/types'

export default function DailyReportView() {
  const router = useRouter()
  const [date, setDate] = useState(() => new Date())
  const { taxRules, taxRuleRates } = useTaxData()

  const dateStr = toDateStr(date)
  const from = toDateStr(subDays(date, 1))
  const to = toDateStr(addDays(date, 1))
  const { data: reservations = [] } = useReservations(from, to)

  // Reservations active on this date (checkin <= date < checkout) or checking out
  const activeReservations = useMemo(
    () =>
      reservations.filter(
        (r) => r.checkin <= dateStr && r.checkout >= dateStr,
      ),
    [reservations, dateStr],
  )

  // Revenue breakdown per reservation
  const rows = useMemo(() => {
    return activeReservations.map((res) => {
      const nights = differenceInCalendarDays(
        parseISO(res.checkout),
        parseISO(res.checkin),
      )
      const stayCost =
        (res.adult_price * res.adults + res.child_price * res.children) * nights
      const taxResults = calcAllTaxes(
        res.adult_price,
        res.adults,
        nights,
        res.checkin,
        res.tax_exempt,
        false,
        taxRules,
        taxRuleRates,
      )
      const tax = sumTaxResults(taxResults)
      return { res, nights, stayCost, tax, total: stayCost + tax }
    })
  }, [activeReservations, taxRules, taxRuleRates])

  const grandTotal = rows.reduce((s, r) => s + r.total, 0)
  const stayTotal = rows.reduce((s, r) => s + r.stayCost, 0)
  const taxTotal = rows.reduce((s, r) => s + r.tax, 0)

  return (
    <div>
      <PageHeader
        title="売上日報"
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

      {/* Date selector */}
      <div className="flex items-center justify-center gap-4 px-4 py-3 border-b border-border/40">
        <button
          type="button"
          onClick={() => setDate((d) => subDays(d, 1))}
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-primary-soft transition-colors"
        >
          <ChevronLeft size={20} className="text-text-2" />
        </button>
        <h2 className="text-lg font-medium">
          {format(date, 'M月d日（E）', { locale: ja })}
        </h2>
        <button
          type="button"
          onClick={() => setDate((d) => addDays(d, 1))}
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-primary-soft transition-colors"
        >
          <ChevronRight size={20} className="text-text-2" />
        </button>
      </div>

      <div className="px-4 py-4 space-y-4 pb-32">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center py-3">
            <p className="text-2xl font-medium text-primary">{rows.length}</p>
            <p className="text-xs text-text-3 mt-1">予約数</p>
          </Card>
          <Card className="text-center py-3">
            <p className="text-2xl font-medium text-primary">
              {rows.reduce((s, r) => s + r.res.adults + r.res.children, 0)}
            </p>
            <p className="text-xs text-text-3 mt-1">ゲスト数</p>
          </Card>
          <Card className="text-center py-3">
            <p className="text-xl font-medium text-primary">
              {formatYen(grandTotal)}
            </p>
            <p className="text-xs text-text-3 mt-1">売上合計</p>
          </Card>
        </div>

        {/* Detail table */}
        {rows.length === 0 ? (
          <p className="text-center text-sub text-text-sub py-12">
            この日の予約はありません
          </p>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-text-sub">
                  <th className="text-left p-3 font-medium">ゲスト</th>
                  <th className="text-left p-3 font-medium">部屋</th>
                  <th className="text-right p-3 font-medium">人数</th>
                  <th className="text-right p-3 font-medium">宿泊料</th>
                  <th className="text-right p-3 font-medium">税</th>
                  <th className="text-right p-3 font-medium">合計</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ res, nights, stayCost, tax, total }) => (
                  <tr
                    key={res.id}
                    onClick={() => router.push(`/reservations/${res.id}`)}
                    className="border-b border-border/20 active:bg-primary/[0.04] cursor-pointer"
                  >
                    <td className="p-3">
                      <p className="font-medium truncate max-w-[120px]">
                        {res.guest?.name ?? '—'}
                      </p>
                      {res.reservation_number && (
                        <p className="text-xs text-text-sub">
                          {res.reservation_number}
                        </p>
                      )}
                    </td>
                    <td className="p-3 text-text-body">{roomLabel(res)}</td>
                    <td className="p-3 text-right">
                      {res.adults + res.children}名
                    </td>
                    <td className="p-3 text-right font-medium">
                      {formatYen(stayCost)}
                    </td>
                    <td className="p-3 text-right text-text-sub">
                      {formatYen(tax)}
                    </td>
                    <td className="p-3 text-right font-medium">
                      {formatYen(total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border/40 font-medium">
                  <td colSpan={3} className="p-3">
                    合計
                  </td>
                  <td className="p-3 text-right">{formatYen(stayTotal)}</td>
                  <td className="p-3 text-right text-text-sub">
                    {formatYen(taxTotal)}
                  </td>
                  <td className="p-3 text-right text-lg">
                    {formatYen(grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </Card>
        )}

        <Button
          size="lg"
          className="w-full print:hidden"
          onClick={() => window.print()}
        >
          <Printer size={18} />
          印刷
        </Button>
      </div>
    </div>
  )
}
