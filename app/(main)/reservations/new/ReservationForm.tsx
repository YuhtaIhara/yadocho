'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, addDays } from 'date-fns'
import PageHeader from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Textarea'
import Stepper from '@/components/ui/Stepper'
import { useRooms } from '@/lib/hooks/useRooms'
import { useReservations } from '@/lib/hooks/useReservations'
import { usePricing } from '@/lib/hooks/usePricing'
import { useCreateReservation } from '@/lib/hooks/useReservations'
import { fetchGuests, createGuest } from '@/lib/api/guests'
import { createMealDays } from '@/lib/api/meal-days'
import { nightCount } from '@/lib/utils/date'
import { formatYen } from '@/lib/utils/format'
import { calcLodgingTax } from '@/lib/utils/tax'
import { cn } from '@/lib/utils/cn'
import type { Guest } from '@/lib/types'

const schema = z
  .object({
    guest_name: z.string().min(1, '名前を入力してください'),
    guest_phone: z.string().optional(),
    checkin: z.string().min(1, 'チェックイン日を選択'),
    checkout: z.string().min(1, 'チェックアウト日を選択'),
    room_id: z.string().min(1, '部屋を選択してください'),
    adults: z.number().min(1),
    children: z.number().min(0),
    adult_price: z.number().min(0),
    child_price: z.number().min(0),
    dinner: z.boolean(),
    breakfast: z.boolean(),
    lunch: z.boolean(),
    dinner_count: z.number().min(0),
    breakfast_count: z.number().min(0),
    lunch_count: z.number().min(0),
    dinner_time: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(d => d.checkout > d.checkin, {
    message: 'チェックアウトはチェックインより後の日付にしてください',
    path: ['checkout'],
  })

type FormValues = z.infer<typeof schema>

export default function ReservationForm() {
  const router = useRouter()
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)
  const [suggestions, setSuggestions] = useState<Guest[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const { data: rooms = [] } = useRooms()
  const { data: pricing } = usePricing()
  const createRes = useCreateReservation()

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      guest_name: '',
      guest_phone: '',
      checkin: format(new Date(), 'yyyy-MM-dd'),
      checkout: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      room_id: '',
      adults: 1,
      children: 0,
      adult_price: 8500,
      child_price: 5000,
      dinner: true,
      breakfast: true,
      lunch: false,
      dinner_count: 1,
      breakfast_count: 1,
      lunch_count: 0,
      dinner_time: '18:00',
      notes: '',
    },
  })

  useEffect(() => {
    if (pricing) {
      setValue('adult_price', pricing.adult_price)
      setValue('child_price', pricing.child_price)
    }
  }, [pricing, setValue])

  const checkin = watch('checkin')
  const checkout = watch('checkout')
  const roomId = watch('room_id')
  const adults = watch('adults')
  const children = watch('children')
  const adultPrice = watch('adult_price')
  const childPrice = watch('child_price')
  const dinner = watch('dinner')
  const breakfast = watch('breakfast')
  const lunch = watch('lunch')
  const dinnerCount = watch('dinner_count')
  const breakfastCount = watch('breakfast_count')
  const lunchCount = watch('lunch_count')
  const dinnerTime = watch('dinner_time')

  const { data: existingRes = [] } = useReservations(checkin, checkout)

  const unavailableRoomIds = useMemo(() => {
    const set = new Set<string>()
    for (const r of existingRes) {
      if (r.checkin < checkout && r.checkout > checkin) {
        set.add(r.room_id)
      }
    }
    return set
  }, [existingRes, checkin, checkout])

  const nights = useMemo(() => {
    if (!checkin || !checkout || checkout <= checkin) return 0
    return nightCount(checkin, checkout)
  }, [checkin, checkout])

  const estimate = useMemo(() => {
    if (nights <= 0) return null
    const stay = (adultPrice * adults + childPrice * children) * nights
    const dp = pricing?.dinner_price ?? 2000
    const cdp = pricing?.child_dinner_price ?? 1500
    const bp = pricing?.breakfast_price ?? 800
    const cbp = pricing?.child_breakfast_price ?? 500
    const lp = pricing?.lunch_price ?? 0
    const clp = pricing?.child_lunch_price ?? 0

    const dA = Math.min(dinnerCount, adults)
    const dC = dinnerCount - dA
    const bA = Math.min(breakfastCount, adults)
    const bC = breakfastCount - bA
    const lA = Math.min(lunchCount, adults)
    const lC = lunchCount - lA

    const mealPerNight =
      (dinner ? dA * dp + dC * cdp : 0) +
      (breakfast ? bA * bp + bC * cbp : 0) +
      (lunch ? lA * lp + lC * clp : 0)
    const meal = mealPerNight * nights

    const pricePerPerson = adults > 0 ? Math.floor((adultPrice * nights) / 1) : 0
    const tax = calcLodgingTax(adultPrice, adults, nights, checkin)

    return { stay, meal, tax: tax.taxAmount, total: stay + meal + tax.taxAmount }
  }, [
    nights, adultPrice, adults, childPrice, children,
    dinner, breakfast, lunch, dinnerCount, breakfastCount, lunchCount,
    pricing, checkin,
  ])

  async function handleGuestSearch(name: string) {
    setSelectedGuest(null)
    if (name.length < 1) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    try {
      const guests = await fetchGuests(name)
      setSuggestions(guests)
      setShowSuggestions(guests.length > 0)
    } catch {
      setSuggestions([])
    }
  }

  function selectGuest(guest: Guest) {
    setSelectedGuest(guest)
    setValue('guest_name', guest.name)
    setValue('guest_phone', guest.phone ?? '')
    setShowSuggestions(false)
  }

  function syncMealCount(newAdults: number, newChildren: number) {
    const total = newAdults + newChildren
    if (dinner) setValue('dinner_count', total)
    if (breakfast) setValue('breakfast_count', total)
    if (lunch) setValue('lunch_count', total)
  }

  async function onSubmit(data: FormValues) {
    setSubmitting(true)
    setFormError(null)
    try {
      let guestId = selectedGuest?.id
      if (!guestId) {
        const guest = await createGuest({
          name: data.guest_name,
          phone: data.guest_phone || undefined,
        })
        guestId = guest.id
      }

      const res = await createRes.mutateAsync({
        room_id: data.room_id,
        guest_id: guestId,
        checkin: data.checkin,
        checkout: data.checkout,
        adults: data.adults,
        children: data.children,
        adult_price: data.adult_price,
        child_price: data.child_price,
        notes: data.notes || undefined,
      })

      await createMealDays(res.id, {
        checkin: data.checkin,
        checkout: data.checkout,
        dinner: data.dinner,
        breakfast: data.breakfast,
        lunch: data.lunch,
        dinnerCount: data.dinner_count,
        breakfastCount: data.breakfast_count,
        lunchCount: data.lunch_count,
        dinnerTime: data.dinner_time,
        adults: data.adults,
        children: data.children,
      })

      router.push('/calendar')
    } catch (err) {
      console.error('Reservation creation failed:', err)
      setFormError('予約の登録に失敗しました。もう一度お試しください。')
    } finally {
      setSubmitting(false)
    }
  }

  const totalPersons = adults + children

  return (
    <div>
      <PageHeader title="新規予約" />

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-4 space-y-6 pb-32">
        {/* ── ゲスト ── */}
        <Section title="ゲスト">
          <Controller
            name="guest_name"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <Input
                  label="名前"
                  placeholder="山田 太郎"
                  value={field.value}
                  onChange={e => {
                    field.onChange(e.target.value)
                    handleGuestSearch(e.target.value)
                  }}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true)
                  }}
                  onBlur={() => {
                    field.onBlur()
                    setTimeout(() => setShowSuggestions(false), 200)
                  }}
                  error={errors.guest_name?.message}
                  autoComplete="off"
                />
                {showSuggestions && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-elevated max-h-40 overflow-y-auto">
                    {suggestions.map(g => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => selectGuest(g)}
                        className="w-full text-left px-4 py-2.5 active:bg-primary-soft text-sm"
                      >
                        <span className="font-medium">{g.name}</span>
                        {g.phone && (
                          <span className="text-text-3 ml-2">{g.phone}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          />
          <div className="mt-3">
            <Input
              label="電話番号"
              placeholder="09012345678"
              type="tel"
              {...register('guest_phone')}
            />
          </div>
        </Section>

        {/* ── 日程 ── */}
        <Section title="日程">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="チェックイン"
              type="date"
              {...register('checkin')}
              error={errors.checkin?.message}
            />
            <Input
              label="チェックアウト"
              type="date"
              {...register('checkout')}
              error={errors.checkout?.message}
            />
          </div>
          {nights > 0 && (
            <p className="text-sm text-text-2 mt-2">
              {nights}泊 · 空き{' '}
              <span className="font-semibold">
                {rooms.length - unavailableRoomIds.size}/{rooms.length}
              </span>
              室
            </p>
          )}
        </Section>

        {/* ── 部屋 ── */}
        <Section title="部屋">
          <div className="flex flex-wrap gap-2">
            {rooms.map(room => {
              const unavailable = unavailableRoomIds.has(room.id)
              const selected = roomId === room.id
              return (
                <button
                  key={room.id}
                  type="button"
                  disabled={unavailable}
                  onClick={() => setValue('room_id', room.id, { shouldValidate: true })}
                  className={cn(
                    'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all min-w-[56px]',
                    selected
                      ? 'bg-primary text-primary-foreground shadow-card'
                      : unavailable
                        ? 'bg-border/30 text-text-3 cursor-not-allowed line-through'
                        : 'bg-surface border border-border text-text-1 active:scale-95',
                  )}
                >
                  {room.name}
                </button>
              )
            })}
          </div>
          {errors.room_id && (
            <p className="text-sm text-danger mt-1">{errors.room_id.message}</p>
          )}
        </Section>

        {/* ── 人数・料金 ── */}
        <Section title="人数・料金">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold">大人</span>
                <span className="text-xs text-text-3 ml-2">
                  {formatYen(adultPrice)}/泊
                </span>
              </div>
              <Controller
                name="adults"
                control={control}
                render={({ field }) => (
                  <Stepper
                    value={field.value}
                    onChange={v => {
                      field.onChange(v)
                      syncMealCount(v, children)
                    }}
                    min={1}
                    max={10}
                  />
                )}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold">子供</span>
                <span className="text-xs text-text-3 ml-2">
                  {formatYen(childPrice)}/泊
                </span>
              </div>
              <Controller
                name="children"
                control={control}
                render={({ field }) => (
                  <Stepper
                    value={field.value}
                    onChange={v => {
                      field.onChange(v)
                      syncMealCount(adults, v)
                    }}
                    min={0}
                    max={10}
                  />
                )}
              />
            </div>
          </div>
        </Section>

        {/* ── 食事 ── */}
        <Section title="食事">
          <div className="space-y-4">
            <MealRow
              label="夕食"
              enabled={dinner}
              onToggle={v => {
                setValue('dinner', v)
                if (v) setValue('dinner_count', totalPersons)
              }}
              count={dinnerCount}
              onCountChange={v => setValue('dinner_count', v)}
              maxCount={totalPersons}
              timeValue={dinnerTime}
              onTimeChange={v => setValue('dinner_time', v)}
              showTime
            />
            <MealRow
              label="朝食"
              enabled={breakfast}
              onToggle={v => {
                setValue('breakfast', v)
                if (v) setValue('breakfast_count', totalPersons)
              }}
              count={breakfastCount}
              onCountChange={v => setValue('breakfast_count', v)}
              maxCount={totalPersons}
            />
            <MealRow
              label="昼食"
              enabled={lunch}
              onToggle={v => {
                setValue('lunch', v)
                if (v) setValue('lunch_count', totalPersons)
              }}
              count={lunchCount}
              onCountChange={v => setValue('lunch_count', v)}
              maxCount={totalPersons}
            />
          </div>
        </Section>

        {/* ── メモ ── */}
        <Section title="メモ">
          <Textarea placeholder="備考・連絡事項" {...register('notes')} />
        </Section>

        {/* ── 概算 ── */}
        {estimate && (
          <Card className="!bg-primary/[0.04] border border-primary/10">
            <div className="text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-text-2">宿泊料</span>
                <span className="font-medium">{formatYen(estimate.stay)}</span>
              </div>
              {estimate.meal > 0 && (
                <div className="flex justify-between">
                  <span className="text-text-2">食事</span>
                  <span className="font-medium">{formatYen(estimate.meal)}</span>
                </div>
              )}
              {estimate.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-text-2">宿泊税</span>
                  <span className="font-medium">{formatYen(estimate.tax)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-primary/10">
                <span className="font-bold">概算合計</span>
                <span className="font-bold text-lg">{formatYen(estimate.total)}</span>
              </div>
            </div>
          </Card>
        )}

        {/* ── エラー ── */}
        {formError && (
          <p className="text-sm text-danger text-center bg-danger-soft rounded-xl py-3 px-4">
            {formError}
          </p>
        )}

        {/* ── 登録 ── */}
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? '登録中…' : '予約を登録'}
        </Button>
      </form>
    </div>
  )
}

/* ── Sub-components ── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-bold text-text-2 mb-3 flex items-center gap-2">
        <span className="w-1 h-4 bg-primary rounded-full" />
        {title}
      </h2>
      {children}
    </section>
  )
}

function MealRow({
  label,
  enabled,
  onToggle,
  count,
  onCountChange,
  maxCount,
  timeValue,
  onTimeChange,
  showTime,
}: {
  label: string
  enabled: boolean
  onToggle: (v: boolean) => void
  count: number
  onCountChange: (v: number) => void
  maxCount: number
  timeValue?: string
  onTimeChange?: (v: string) => void
  showTime?: boolean
}) {
  return (
    <div className="flex items-center justify-between min-h-[44px]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onToggle(!enabled)}
          className={cn(
            'w-12 h-7 rounded-full transition-colors relative shrink-0',
            enabled ? 'bg-primary' : 'bg-border',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform',
              enabled ? 'translate-x-5' : 'translate-x-0.5',
            )}
          />
        </button>
        <span className={cn('text-sm font-semibold', !enabled && 'text-text-3')}>
          {label}
        </span>
      </div>
      {enabled && (
        <div className="flex items-center gap-2">
          <Stepper value={count} onChange={onCountChange} min={1} max={maxCount} />
          {showTime && onTimeChange && (
            <select
              value={timeValue}
              onChange={e => onTimeChange(e.target.value)}
              className="text-xs bg-surface border border-border rounded-lg px-2 py-1.5 h-8"
            >
              {['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'].map(
                t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ),
              )}
            </select>
          )}
        </div>
      )}
    </div>
  )
}
