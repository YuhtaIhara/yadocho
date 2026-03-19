'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format, subDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useReservations } from '@/lib/hooks/useReservations'
import { formatDateJP, nightCount, toDateStr } from '@/lib/utils/date'
import { formatYen } from '@/lib/utils/format'
import type { Reservation } from '@/lib/types'

export default function BillingList() {
  const router = useRouter()
  const from = toDateStr(subDays(new Date(), 90))
  const to = toDateStr(new Date())
  const { data: reservations = [], isLoading } = useReservations(from, to)

  const { unsettled, settled } = useMemo(() => {
    const u: Reservation[] = []
    const s: Reservation[] = []
    for (const r of reservations) {
      if (r.status === 'checked_in' || r.status === 'checked_out') u.push(r)
      // settled would require invoice_items check — for now show checked_out as unsettled
    }
    return { unsettled: u, settled: s }
  }, [reservations])

  return (
    <div>
      <PageHeader title="会計" showBack={false} />

      <div className="px-4 py-4 pb-32 space-y-6">
        {/* Unsettled */}
        <section>
          <h2 className="text-sm font-bold text-text-2 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-warning" />
            未精算（{unsettled.length}件）
          </h2>
          {unsettled.length === 0 && !isLoading && (
            <p className="text-sm text-text-3 text-center py-6">未精算の予約はありません</p>
          )}
          <div className="space-y-2">
            {unsettled.map(r => {
              const nights = nightCount(r.checkin, r.checkout)
              const amount = (r.adult_price * r.adults + r.child_price * r.children) * nights
              return (
                <Card
                  key={r.id}
                  className="active:scale-[0.98] transition-transform cursor-pointer"
                  onClick={() => router.push(`/billing/${r.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{r.guest?.name ?? '—'} 様</p>
                      <p className="text-xs text-text-2 mt-0.5">
                        {r.room?.name} · {formatDateJP(r.checkin)}〜 {nights}泊
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-bold">{formatYen(amount)}</p>
                      <Badge
                        variant={r.status === 'checked_in' ? 'accent' : 'outline'}
                        className="mt-1"
                      >
                        {r.status === 'checked_in' ? '滞在中' : 'CO済み'}
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

        {isLoading && (
          <p className="text-sm text-text-3 text-center py-8">読み込み中…</p>
        )}
      </div>
    </div>
  )
}
