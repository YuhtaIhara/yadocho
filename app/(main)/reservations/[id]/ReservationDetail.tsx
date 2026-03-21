'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Phone, Pencil } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/Toast'
import { useReservation, useUpdateReservation } from '@/lib/hooks/useReservations'
import { useMealDays } from '@/lib/hooks/useMealDays'
import { usePricing } from '@/lib/hooks/usePricing'
import { useTaxData } from '@/lib/hooks/useTaxRules'
import MealEditor from '@/components/MealEditor'
import { formatDateJP, nightCount } from '@/lib/utils/date'
import { formatYen } from '@/lib/utils/format'
import { calcAllTaxes, sumTaxResults } from '@/lib/utils/tax'
import { calcMealCost, getMealPrices } from '@/lib/utils/pricing'
import { cn } from '@/lib/utils/cn'
import { roomLabel, STATUS_LABELS, SOURCE_OPTIONS, PAYMENT_METHODS, type ReservationStatus } from '@/lib/types'

const STATUS_COLOR: Record<string, string> = {
  scheduled: '#E8A65D',
  checked_in: '#5B9A6E',
  settled: '#9B9490',
  cancelled: '#D47B7B',
}

const STATUS_OPTIONS: ReservationStatus[] = ['scheduled', 'checked_in', 'settled', 'cancelled']
const STATUS_BADGE: Record<string, 'default' | 'accent' | 'warning' | 'danger' | 'outline'> = {
  scheduled: 'default',
  checked_in: 'accent',
  settled: 'outline',
  cancelled: 'danger',
}

/** Next forward status in the lifecycle */
const NEXT_STATUS: Partial<Record<ReservationStatus, { status: ReservationStatus; label: string }>> = {
  scheduled: { status: 'checked_in', label: 'チェックインする' },
  checked_in: { status: 'settled', label: '精算する' },
}

export default function ReservationDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: res, isLoading } = useReservation(id)
  const { data: mealDays = [] } = useMealDays(id)
  const { data: pricing } = usePricing()
  const { taxRules, taxRuleRates } = useTaxData()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const updateRes = useUpdateReservation()
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showMealEditor, setShowMealEditor] = useState(false)

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
  const mealCost = calcMealCost(mealDays, res)
  const taxResults = calcAllTaxes(
    res.adult_price, res.adults, nights, res.checkin,
    res.tax_exempt, false, taxRules, taxRuleRates,
  )
  const taxTotal = sumTaxResults(taxResults)
  const total = stayCost + mealCost + taxTotal

  function handleStatusChange(status: ReservationStatus) {
    setShowStatusMenu(false)
    updateRes.mutate(
      { id, status },
      {
        onSuccess: () => {
          showToast(STATUS_LABELS[status] + ' に変更しました')
        },
        onError: (err) => {
          showToast(err instanceof Error ? err.message : 'ステータスの変更に失敗しました')
        },
      },
    )
  }


  return (
    <div>
      <PageHeader
        title="予約詳細"
        rightSlot={
          <div className="flex items-center gap-2">
            {res.status !== 'settled' && (
              <button
                type="button"
                onClick={() => router.push(`/reservations/${id}/edit`)}
                className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full active:bg-primary-soft"
              >
                <Pencil size={18} className="text-text-2" />
              </button>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowStatusMenu(v => !v)}
                className="flex items-center gap-1 min-h-[48px] px-1"
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
                      s === res.status && 'font-medium text-primary',
                    )}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
            </div>
          </div>
        }
      />

      <div className="px-4 py-4 space-y-4 pb-32">
        {/* Guest info */}
        <Card
          variant="status"
          statusColor={STATUS_COLOR[res.status]}
        >
          {res.reservation_number && (
            <p className="text-[13px] text-text-3 mb-1 tracking-wide">No. {res.reservation_number}</p>
          )}
          <Link href={`/guests/${res.guest_id}`} className="block">
            <p className="text-[24px] font-medium leading-[1.3]" style={{ fontFamily: 'var(--font-heading)' }}>
              {res.guest?.name ?? '—'} 様
            </p>
          </Link>
          {res.guest?.phone && (
            <a
              href={`tel:${res.guest.phone}`}
              className="inline-flex items-center gap-2 mt-2 text-[16px] text-primary"
              style={{ borderBottom: '1px dashed rgba(196,105,74,0.3)', transition: 'border-color 200ms' }}
            >
              <Phone size={16} />
              {res.guest.phone}
            </a>
          )}
        </Card>

        {/* Stay info */}
        <Card>
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <div>
              <span className="text-text-3">部屋</span>
              {res.rooms && res.rooms.length > 1 ? (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {res.rooms.map(room => (
                    <Badge key={room.id} variant="default">{room.name}</Badge>
                  ))}
                </div>
              ) : (
                <p className="font-semibold">{roomLabel(res)}</p>
              )}
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
            {res.source && (
              <div>
                <span className="text-text-3">予約経路</span>
                <p className="font-semibold">{SOURCE_OPTIONS.find(s => s.value === res.source)?.label ?? res.source}</p>
              </div>
            )}
            {res.payment_method && (
              <div>
                <span className="text-text-3">支払方法</span>
                <p className="font-semibold">{PAYMENT_METHODS.find(m => m.value === res.payment_method)?.label ?? res.payment_method}</p>
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
            <h3 className="text-sm font-medium text-text-2">食事</h3>
            {res.status !== 'settled' && res.status !== 'cancelled' && (
              <button type="button" onClick={() => setShowMealEditor(true)} className="flex items-center gap-1 px-3 py-1.5 min-h-[44px] rounded-full active:bg-primary-soft text-[15px] text-primary font-medium">
                <Pencil size={14} />
                編集
              </button>
            )}
          </div>
          {mealDays.length > 0 ? (
            <div className="space-y-2.5 text-sm">
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
          <h3 className="text-sm font-medium text-text-2 mb-2">料金内訳</h3>
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
            {mealCost > 0 && (() => {
              const { dp, cdp, bp, cbp, lp, clp } = getMealPrices(res)
              let dinnerA = 0, dinnerC = 0, breakA = 0, breakC = 0, lunchA = 0, lunchC = 0
              for (const md of mealDays) {
                dinnerA += md.dinner_adults; dinnerC += md.dinner_children
                breakA += md.breakfast_adults; breakC += md.breakfast_children
                lunchA += md.lunch_adults; lunchC += md.lunch_children
              }
              return (
                <>
                  {dinnerA > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-2">夕食（大人）{formatYen(dp)}×{dinnerA}</span>
                      <span className="font-medium">{formatYen(dp * dinnerA)}</span>
                    </div>
                  )}
                  {dinnerC > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-2">夕食（子供）{formatYen(cdp)}×{dinnerC}</span>
                      <span className="font-medium">{formatYen(cdp * dinnerC)}</span>
                    </div>
                  )}
                  {breakA > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-2">朝食（大人）{formatYen(bp)}×{breakA}</span>
                      <span className="font-medium">{formatYen(bp * breakA)}</span>
                    </div>
                  )}
                  {breakC > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-2">朝食（子供）{formatYen(cbp)}×{breakC}</span>
                      <span className="font-medium">{formatYen(cbp * breakC)}</span>
                    </div>
                  )}
                  {lunchA > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-2">昼食（大人）{formatYen(lp)}×{lunchA}</span>
                      <span className="font-medium">{formatYen(lp * lunchA)}</span>
                    </div>
                  )}
                  {lunchC > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-2">昼食（子供）{formatYen(clp)}×{lunchC}</span>
                      <span className="font-medium">{formatYen(clp * lunchC)}</span>
                    </div>
                  )}
                </>
              )
            })()}
            {taxResults.filter(t => t.taxable).map(t => (
              <div key={t.taxRuleId} className="flex justify-between">
                <span className="text-text-2">{t.taxName}({t.displayRate})</span>
                <span className="font-medium">{formatYen(t.taxAmount)}</span>
              </div>
            ))}
            {taxResults.filter(t => t.exemptReason).map(t => (
              <p key={`ex-${t.taxRuleId}`} className="text-text-3 text-xs">
                {t.taxName}: {t.exemptReason}{res.tax_exempt_reason ? `（${res.tax_exempt_reason}）` : ''}
              </p>
            ))}
            <div className="flex justify-between items-baseline pt-3 mt-1" style={{ borderTop: '2px solid rgba(0,0,0,0.08)' }}>
              <span className="text-[17px] font-medium">合計</span>
              <span className="text-[28px] font-medium">{formatYen(total)}</span>
            </div>
          </div>
        </Card>

        {/* Status transition */}
        {NEXT_STATUS[res.status] && (
          <Button
            size="lg"
            className="w-full"
            onClick={() => handleStatusChange(NEXT_STATUS[res.status]!.status)}
          >
            {NEXT_STATUS[res.status]!.label}
          </Button>
        )}

        {/* Actions */}
        <div className="space-y-2.5">
          <div className="flex gap-2.5">
            <Button
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => router.push(`/billing/${id}`)}
            >
              請求書を作成
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => router.push(`/guests/${res.guest_id}`)}
            >
              ゲスト詳細
            </Button>
          </div>
          {res.status !== 'cancelled' && res.status !== 'settled' && (
            <button
              type="button"
              onClick={() => {
                if (!confirm('この予約をキャンセルしますか？')) return
                handleStatusChange('cancelled')
              }}
              className="w-full text-center text-[15px] font-medium text-danger py-3 min-h-[48px]"
            >
              予約をキャンセル
            </button>
          )}
          {res.status === 'cancelled' && (
            <button
              type="button"
              onClick={() => {
                if (!confirm('この予約を復活しますか？')) return
                handleStatusChange('scheduled')
              }}
              className="w-full text-center text-[15px] font-medium text-primary py-3 min-h-[48px]"
            >
              予約を復活する
            </button>
          )}
        </div>
      </div>

      <MealEditor
        reservationId={id}
        mealDays={mealDays}
        open={showMealEditor}
        onClose={() => setShowMealEditor(false)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['mealDays', id] })
        }}
      />
    </div>
  )
}
