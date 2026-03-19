'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Phone, Pencil, Trash2 } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useReservation, useUpdateReservation, useDeleteReservation } from '@/lib/hooks/useReservations'
import { useMealDays } from '@/lib/hooks/useMealDays'
import { formatDateJP, nightCount } from '@/lib/utils/date'
import { formatYen } from '@/lib/utils/format'
import { calcLodgingTax } from '@/lib/utils/tax'
import { cn } from '@/lib/utils/cn'
import { STATUS_LABELS, type ReservationStatus } from '@/lib/types'

const STATUS_OPTIONS: ReservationStatus[] = ['scheduled', 'checked_in', 'checked_out', 'cancelled']
const STATUS_BADGE: Record<string, 'default' | 'accent' | 'warning' | 'danger' | 'outline'> = {
  scheduled: 'default',
  checked_in: 'accent',
  checked_out: 'outline',
  cancelled: 'danger',
}

export default function ReservationDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: res, isLoading } = useReservation(id)
  const { data: mealDays = [] } = useMealDays(id)
  const updateRes = useUpdateReservation()
  const deleteRes = useDeleteReservation()
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  if (isLoading) {
    return (
      <div>
        <PageHeader title="予約詳細" />
        <div className="flex items-center justify-center h-48 text-sm text-text-3">読み込み中…</div>
      </div>
    )
  }

  if (!res) {
    return (
      <div>
        <PageHeader title="予約詳細" />
        <div className="flex items-center justify-center h-48 text-sm text-text-3">予約が見つかりません</div>
      </div>
    )
  }

  const nights = nightCount(res.checkin, res.checkout)
  const stayCost = (res.adult_price * res.adults + res.child_price * res.children) * nights
  const mealCost = 0 // TODO: calculate from meal_days + pricing
  const tax = calcLodgingTax(res.adult_price, res.adults, nights, res.checkin)
  const total = stayCost + mealCost + tax.taxAmount

  function handleStatusChange(status: ReservationStatus) {
    setShowStatusMenu(false)
    updateRes.mutate({ id, status })
  }

  function handleDelete() {
    if (!confirm('この予約を削除しますか？')) return
    deleteRes.mutate(id, { onSuccess: () => router.push('/calendar') })
  }

  return (
    <div>
      <PageHeader
        title="予約詳細"
        rightSlot={
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowStatusMenu(v => !v)}
              className="flex items-center gap-1"
            >
              <Badge variant={STATUS_BADGE[res.status]}>{STATUS_LABELS[res.status]}</Badge>
            </button>
            {showStatusMenu && (
              <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-xl shadow-elevated z-20 min-w-[140px] py-1">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStatusChange(s)}
                    className={cn(
                      'w-full text-left px-4 py-2.5 text-sm active:bg-primary-soft',
                      s === res.status && 'font-bold text-primary',
                    )}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      />

      <div className="px-4 py-4 space-y-4 pb-32">
        {/* Guest info */}
        <Card>
          <Link href={`/guests/${res.guest_id}`} className="block">
            <p className="text-lg font-bold">{res.guest?.name ?? '—'} 様</p>
          </Link>
          {res.guest?.phone && (
            <a
              href={`tel:${res.guest.phone}`}
              className="flex items-center gap-2 mt-2 text-sm text-primary"
            >
              <Phone size={14} />
              {res.guest.phone}
            </a>
          )}
        </Card>

        {/* Stay info */}
        <Card>
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <div>
              <span className="text-text-3">部屋</span>
              <p className="font-semibold">{res.room?.name ?? '—'}</p>
            </div>
            <div>
              <span className="text-text-3">人数</span>
              <p className="font-semibold">
                大人{res.adults}名{res.children > 0 && ` 子供${res.children}名`}
              </p>
            </div>
            <div className="col-span-2">
              <span className="text-text-3">期間</span>
              <p className="font-semibold">
                {formatDateJP(res.checkin)} 〜 {formatDateJP(res.checkout)}（{nights}泊）
              </p>
            </div>
            {res.checkin_time && (
              <div>
                <span className="text-text-3">到着</span>
                <p className="font-semibold">{res.checkin_time.slice(0, 5)}</p>
              </div>
            )}
          </div>
          {res.notes && (
            <p className="mt-3 text-sm text-text-2 bg-primary-soft/30 rounded-lg px-3 py-2">
              {res.notes}
            </p>
          )}
        </Card>

        {/* Meals */}
        <Card>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-text-2">食事</h3>
            <Pencil size={14} className="text-text-3" />
          </div>
          {mealDays.length > 0 ? (
            <div className="space-y-1.5 text-sm">
              {mealDays.map(md => {
                const parts: string[] = []
                if (md.breakfast_adults + md.breakfast_children > 0)
                  parts.push(`朝${md.breakfast_adults + md.breakfast_children}名`)
                if (md.lunch_adults + md.lunch_children > 0)
                  parts.push(`昼${md.lunch_adults + md.lunch_children}名`)
                if (md.dinner_adults + md.dinner_children > 0) {
                  let d = `夕${md.dinner_adults + md.dinner_children}名`
                  if (md.dinner_time) d += ` ${md.dinner_time.slice(0, 5)}`
                  parts.push(d)
                }
                if (parts.length === 0) return null
                return (
                  <div key={md.id} className="flex justify-between">
                    <span className="text-text-3">{formatDateJP(md.date)}</span>
                    <span>{parts.join(' / ')}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-text-3">食事データなし</p>
          )}
        </Card>

        {/* Price breakdown */}
        <Card>
          <h3 className="text-sm font-bold text-text-2 mb-2">料金内訳</h3>
          <div className="text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-text-2">
                宿泊料 {formatYen(res.adult_price)}×{res.adults}名×{nights}泊
              </span>
              <span className="font-medium">{formatYen(res.adult_price * res.adults * nights)}</span>
            </div>
            {res.children > 0 && (
              <div className="flex justify-between">
                <span className="text-text-2">
                  子供 {formatYen(res.child_price)}×{res.children}名×{nights}泊
                </span>
                <span className="font-medium">{formatYen(res.child_price * res.children * nights)}</span>
              </div>
            )}
            {tax.taxable && (
              <div className="flex justify-between">
                <span className="text-text-2">宿泊税({tax.ratePercent}%)</span>
                <span className="font-medium">{formatYen(tax.taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-border/40">
              <span className="font-bold">合計</span>
              <span className="font-bold text-lg">{formatYen(total)}</span>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            size="lg"
            className="w-full"
            onClick={() => router.push(`/billing/${id}`)}
          >
            請求書を作成
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => router.push(`/guests/${res.guest_id}`)}
          >
            ゲスト詳細を見る
          </Button>
          {res.status !== 'cancelled' && (
            <Button
              variant="ghost"
              size="lg"
              className="w-full text-warning"
              onClick={() => handleStatusChange('cancelled')}
            >
              キャンセルにする
            </Button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            className="w-full flex items-center justify-center gap-2 text-sm text-danger py-3"
          >
            <Trash2 size={14} />
            削除
          </button>
        </div>
      </div>
    </div>
  )
}
