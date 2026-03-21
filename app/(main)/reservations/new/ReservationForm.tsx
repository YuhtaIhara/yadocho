'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, addDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import PageHeader from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Textarea'
import Stepper from '@/components/ui/Stepper'
import { useRooms } from '@/lib/hooks/useRooms'
import { useReservations } from '@/lib/hooks/useReservations'
import { usePricing } from '@/lib/hooks/usePricing'
import { usePricingPlans } from '@/lib/hooks/usePricingPlans'
import { useCreateReservation, useUpdateReservation } from '@/lib/hooks/useReservations'
import { fetchGuests, createGuest, updateGuest } from '@/lib/api/guests'
import { createMealDays } from '@/lib/api/meal-days'
import { upsertMealDays } from '@/lib/api/meals'
import { nightCount } from '@/lib/utils/date'
import { formatYen } from '@/lib/utils/format'
import { getMealPrices } from '@/lib/utils/pricing'
import { calcAllTaxes, sumTaxResults } from '@/lib/utils/tax'
import { useTaxData } from '@/lib/hooks/useTaxRules'
import { cn } from '@/lib/utils/cn'
import DatePicker from '@/components/DatePicker'
import { Calendar } from 'lucide-react'
import type { Guest, MealDay } from '@/lib/types'

const phoneSchema = z
  .string()
  .min(1, '電話番号を入力してください（10〜11桁の半角数字）')
  .transform(v => v.replace(/[-\s]/g, ''))
  .pipe(
    z
      .string()
      .regex(/^\d+$/, '半角数字のみ入力してください')
      .min(10, '電話番号が短すぎます（10〜11桁）')
      .max(11, '電話番号が長すぎます（10〜11桁）')
      .regex(/^0\d{9,10}$/, '正しい電話番号の形式で入力してください'),
  )

const schema = z
  .object({
    guest_phone: phoneSchema,
    guest_name: z.string().optional(),
    guest_address: z.string().optional(),
    guest_allergy: z.string().optional(),
    guest_notes: z.string().optional(),
    checkin: z.string().min(1, 'チェックイン日を選択'),
    checkout: z.string().min(1, 'チェックアウト日を選択'),
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
    breakfast_time: z.string().optional(),
    lunch_time: z.string().optional(),
    checkin_time: z.string().optional(),
    tax_exempt: z.boolean(),
    tax_exempt_reason: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(d => d.checkout > d.checkin, {
    message: 'チェックアウトはチェックインより後の日付にしてください',
    path: ['checkout'],
  })

type FormValues = z.infer<typeof schema>

type Props = {
  mode?: 'create' | 'edit'
  initialData?: {
    id: string
    guest: { id: string; name: string; phone: string | null }
    room_ids: string[]
    checkin: string
    checkout: string
    adults: number
    children: number
    adult_price: number
    child_price: number
    checkin_time: string | null
    tax_exempt: boolean
    tax_exempt_reason: string | null
    notes: string | null
    mealDays: MealDay[]
  }
}

function deriveMealDefaults(mealDays: MealDay[], adults: number, children: number) {
  if (mealDays.length === 0) {
    return {
      dinner: true,
      breakfast: true,
      lunch: false,
      dinner_count: adults + children,
      breakfast_count: adults + children,
      lunch_count: 0,
      dinner_time: '18:00',
      breakfast_time: '07:30',
      lunch_time: '12:00',
    }
  }

  const hasDinner = mealDays.some(m => m.dinner_adults + m.dinner_children > 0)
  const hasBreakfast = mealDays.some(m => m.breakfast_adults + m.breakfast_children > 0)
  const hasLunch = mealDays.some(m => m.lunch_adults + m.lunch_children > 0)

  const dinnerDay = mealDays.find(m => m.dinner_adults + m.dinner_children > 0)
  const breakfastDay = mealDays.find(m => m.breakfast_adults + m.breakfast_children > 0)
  const lunchDay = mealDays.find(m => m.lunch_adults + m.lunch_children > 0)

  return {
    dinner: hasDinner,
    breakfast: hasBreakfast,
    lunch: hasLunch,
    dinner_count: dinnerDay ? dinnerDay.dinner_adults + dinnerDay.dinner_children : adults + children,
    breakfast_count: breakfastDay ? breakfastDay.breakfast_adults + breakfastDay.breakfast_children : adults + children,
    lunch_count: lunchDay ? lunchDay.lunch_adults + lunchDay.lunch_children : 0,
    dinner_time: dinnerDay?.dinner_time?.slice(0, 5) ?? '18:00',
    breakfast_time: breakfastDay?.breakfast_time?.slice(0, 5) ?? '07:30',
    lunch_time: lunchDay?.lunch_time?.slice(0, 5) ?? '12:00',
  }
}

export default function ReservationForm({ mode = 'create', initialData }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEdit = mode === 'edit'

  // URL params for calendar cell direct booking / guest detail link
  const paramDate = searchParams.get('date')
  const paramRoom = searchParams.get('room')
  const paramPhone = searchParams.get('phone')

  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(
    initialData ? { id: initialData.guest.id, name: initialData.guest.name, phone: initialData.guest.phone } as Guest : null,
  )
  const [suggestions, setSuggestions] = useState<Guest[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showNewGuest, setShowNewGuest] = useState(false)
  const [guestLoaded, setGuestLoaded] = useState(!!initialData)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [pickerTarget, setPickerTarget] = useState<'checkin' | 'checkout' | null>(null)
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(
    initialData?.room_ids ?? (paramRoom ? [paramRoom] : []),
  )

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)

  const { data: rooms = [] } = useRooms()
  const { data: pricing } = usePricing()
  const { data: plans = [] } = usePricingPlans()
  const { taxRules, taxRuleRates } = useTaxData()
  const createRes = useCreateReservation()
  const updateRes = useUpdateReservation()

  const mealDefaults = initialData
    ? deriveMealDefaults(initialData.mealDays, initialData.adults, initialData.children)
    : undefined

  const defaultCheckin = initialData?.checkin ?? paramDate ?? format(new Date(), 'yyyy-MM-dd')
  const defaultCheckout = initialData?.checkout ?? (paramDate ? format(addDays(new Date(paramDate), 1), 'yyyy-MM-dd') : format(addDays(new Date(), 1), 'yyyy-MM-dd'))

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
      guest_phone: initialData?.guest.phone ?? paramPhone ?? '',
      guest_name: initialData?.guest.name ?? '',
      guest_address: '',
      guest_allergy: '',
      guest_notes: '',
      checkin: defaultCheckin,
      checkout: defaultCheckout,
      adults: initialData?.adults ?? 1,
      children: initialData?.children ?? 0,
      adult_price: initialData?.adult_price ?? 8500,
      child_price: initialData?.child_price ?? 5000,
      dinner: mealDefaults?.dinner ?? true,
      breakfast: mealDefaults?.breakfast ?? true,
      lunch: mealDefaults?.lunch ?? false,
      dinner_count: mealDefaults?.dinner_count ?? 1,
      breakfast_count: mealDefaults?.breakfast_count ?? 1,
      lunch_count: mealDefaults?.lunch_count ?? 0,
      dinner_time: mealDefaults?.dinner_time ?? '18:00',
      breakfast_time: mealDefaults?.breakfast_time ?? '07:30',
      lunch_time: mealDefaults?.lunch_time ?? '12:00',
      checkin_time: initialData?.checkin_time?.slice(0, 5) ?? '',
      tax_exempt: initialData?.tax_exempt ?? false,
      tax_exempt_reason: initialData?.tax_exempt_reason ?? '',
      notes: initialData?.notes ?? '',
    },
  })

  // 新規作成時: デフォルトプランの料金を初期値に設定
  useEffect(() => {
    if (plans.length > 0 && !initialData && !selectedPlanId) {
      const defaultPlan = plans.find(p => p.is_default) ?? plans[0]
      setSelectedPlanId(defaultPlan.id)
      setValue('adult_price', defaultPlan.adult_price)
      setValue('child_price', defaultPlan.child_price)
    } else if (pricing && !initialData && plans.length === 0) {
      // pricing_plans がなければ旧 pricing_config にフォールバック
      setValue('adult_price', pricing.adult_price)
      setValue('child_price', pricing.child_price)
    }
  }, [plans, pricing, setValue, initialData, selectedPlanId])

  // Auto-search guest when phone param is provided
  useEffect(() => {
    if (paramPhone && !initialData && !selectedGuest) {
      setValue('guest_phone', paramPhone)
      handleGuestSearch(paramPhone)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramPhone])

  const checkin = watch('checkin')
  const checkout = watch('checkout')
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
  const breakfastTime = watch('breakfast_time')
  const lunchTime = watch('lunch_time')
  const taxExempt = watch('tax_exempt')

  const { data: existingRes = [] } = useReservations(checkin, checkout)

  const unavailableRoomIds = useMemo(() => {
    const set = new Set<string>()
    for (const r of existingRes) {
      // When editing, exclude the current reservation from overlap detection
      if (isEdit && initialData && r.id === initialData.id) continue
      if (r.checkin < checkout && r.checkout > checkin) {
        r.rooms?.forEach(room => set.add(room.id))
      }
    }
    return set
  }, [existingRes, checkin, checkout, isEdit, initialData])

  const nights = useMemo(() => {
    if (!checkin || !checkout || checkout <= checkin) return 0
    return nightCount(checkin, checkout)
  }, [checkin, checkout])

  const roomCount = selectedRoomIds.length

  const estimate = useMemo(() => {
    if (nights <= 0) return null
    const stay = (adultPrice * adults + childPrice * children) * nights
    // 食事単価: 選択中のプラン → pricing_config フォールバック
    const selectedPlan = plans.find(p => p.id === selectedPlanId)
    const mealSource = selectedPlan ?? pricing
    const { dp, cdp, bp, cbp, lp, clp } = getMealPrices(mealSource)

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

    const taxResults = calcAllTaxes(
      adultPrice, adults, nights, checkin,
      taxExempt, false, taxRules, taxRuleRates,
    )
    const taxTotal = sumTaxResults(taxResults)

    return { stay, meal, taxResults, taxTotal, total: stay + meal + taxTotal, roomCount }
  }, [
    nights, adultPrice, adults, childPrice, children,
    dinner, breakfast, lunch, dinnerCount, breakfastCount, lunchCount,
    pricing, plans, selectedPlanId, checkin, roomCount, taxExempt, taxRules, taxRuleRates,
  ])

  async function handleGuestSearch(input: string) {
    setSelectedGuest(null)
    setGuestLoaded(false)
    setShowNewGuest(false)
    const trimmed = input.trim()
    if (trimmed.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    try {
      // fetchGuests already handles name vs phone search based on input content
      const guests = await fetchGuests(trimmed)
      setSuggestions(guests)
      setShowSuggestions(guests.length > 0)
      // If no matches and phone looks complete, show new guest section
      const cleaned = trimmed.replace(/[-\s]/g, '')
      const isDigitsOnly = /^\d+$/.test(cleaned)
      if (guests.length === 0 && isDigitsOnly && cleaned.length >= 10) {
        setShowNewGuest(true)
      }
      if (guests.length === 0 && !isDigitsOnly) {
        setShowNewGuest(true)
      }
    } catch (err) {
      console.error('ゲスト検索に失敗:', err)
      setSuggestions([])
    }
  }

  function selectGuest(guest: Guest) {
    setSelectedGuest(guest)
    setValue('guest_name', guest.name)
    setValue('guest_phone', guest.phone ?? '')
    setValue('guest_address', guest.address ?? '')
    setValue('guest_allergy', guest.allergy ?? '')
    setValue('guest_notes', guest.notes ?? '')
    setShowSuggestions(false)
    setShowNewGuest(true)
    setGuestLoaded(true)
  }

  function clearGuest() {
    setSelectedGuest(null)
    setGuestLoaded(false)
    setShowNewGuest(false)
    setValue('guest_name', '')
    setValue('guest_phone', '')
    setValue('guest_address', '')
    setValue('guest_allergy', '')
    setValue('guest_notes', '')
  }

  function syncMealCount(newAdults: number, newChildren: number) {
    const total = newAdults + newChildren
    if (dinner) setValue('dinner_count', total)
    if (breakfast) setValue('breakfast_count', total)
    if (lunch) setValue('lunch_count', total)
  }

  async function onSubmit(data: FormValues) {
    // Validate room selection
    if (selectedRoomIds.length === 0) {
      setFormError('部屋を1つ以上選択してください')
      return
    }

    setSubmitting(true)
    setFormError(null)
    try {
      if (isEdit && initialData) {
        // ── Edit mode ──
        await updateRes.mutateAsync({
          id: initialData.id,
          room_ids: selectedRoomIds,
          guest_id: initialData.guest.id,
          checkin: data.checkin,
          checkout: data.checkout,
          adults: data.adults,
          children: data.children,
          adult_price: data.adult_price,
          child_price: data.child_price,
          checkin_time: data.checkin_time || null,
          tax_exempt: data.tax_exempt,
          tax_exempt_reason: data.tax_exempt_reason || null,
          notes: data.notes || null,
        })

        // Build meal day rows for upsert
        const { eachDayOfInterval, parseISO } = await import('date-fns')
        const dates = eachDayOfInterval({
          start: parseISO(data.checkin),
          end: parseISO(data.checkout),
        })

        const dA = Math.min(data.dinner_count, data.adults)
        const dC = data.dinner_count - dA
        const bA = Math.min(data.breakfast_count, data.adults)
        const bC = data.breakfast_count - bA
        const lA = Math.min(data.lunch_count, data.adults)
        const lC = data.lunch_count - lA

        const mealRows = dates.map((date, i) => {
          const isFirst = i === 0
          const isLast = i === dates.length - 1
          const hasDinner = data.dinner && !isLast
          const hasBreakfast = data.breakfast && !isFirst
          const hasLunch = data.lunch && !isFirst && !isLast

          return {
            reservation_id: initialData.id,
            date: format(date, 'yyyy-MM-dd'),
            dinner_adults: hasDinner ? dA : 0,
            dinner_children: hasDinner ? dC : 0,
            dinner_time: hasDinner ? data.dinner_time ?? null : null,
            breakfast_adults: hasBreakfast ? bA : 0,
            breakfast_children: hasBreakfast ? bC : 0,
            breakfast_time: hasBreakfast ? data.breakfast_time ?? null : null,
            lunch_adults: hasLunch ? lA : 0,
            lunch_children: hasLunch ? lC : 0,
            lunch_time: hasLunch ? data.lunch_time ?? null : null,
            notes: null,
          }
        })

        if (mealRows.length > 0) {
          await upsertMealDays(mealRows)
        }

        router.push(`/reservations/${initialData.id}`)
      } else {
        // ── Create mode ──
        // Require name when creating new guest
        if (!selectedGuest && !data.guest_name) {
          setFormError('新規ゲストの場合、名前を入力してください')
          setSubmitting(false)
          return
        }

        let guestId = selectedGuest?.id
        if (guestId) {
          // 既存ゲスト — 変更があれば更新
          const updates: Record<string, string | undefined> = {}
          if (data.guest_name && data.guest_name !== selectedGuest!.name) updates.name = data.guest_name
          if ((data.guest_address || '') !== (selectedGuest!.address || '')) updates.address = data.guest_address || undefined
          if ((data.guest_allergy || '') !== (selectedGuest!.allergy || '')) updates.allergy = data.guest_allergy || undefined
          if ((data.guest_notes || '') !== (selectedGuest!.notes || '')) updates.notes = data.guest_notes || undefined
          if (Object.keys(updates).length > 0) {
            await updateGuest(guestId, updates)
          }
        } else {
          const guest = await createGuest({
            name: data.guest_name!,
            phone: data.guest_phone || undefined,
            address: data.guest_address || undefined,
            allergy: data.guest_allergy || undefined,
            notes: data.guest_notes || undefined,
          })
          guestId = guest.id
        }

        // 食事単価をスナップショット
        const plan = plans.find(p => p.id === selectedPlanId)
        const mealSnapshot = plan
          ? {
              pricing_plan_id: plan.id,
              dinner_price: plan.dinner_price,
              child_dinner_price: plan.child_dinner_price,
              breakfast_price: plan.breakfast_price,
              child_breakfast_price: plan.child_breakfast_price,
              lunch_price: plan.lunch_price,
              child_lunch_price: plan.child_lunch_price,
            }
          : pricing
            ? {
                pricing_plan_id: null as string | null,
                dinner_price: pricing.dinner_price,
                child_dinner_price: pricing.child_dinner_price,
                breakfast_price: pricing.breakfast_price,
                child_breakfast_price: pricing.child_breakfast_price,
                lunch_price: pricing.lunch_price,
                child_lunch_price: pricing.child_lunch_price,
              }
            : {
                pricing_plan_id: null as string | null,
                dinner_price: 2000,
                child_dinner_price: 1500,
                breakfast_price: 800,
                child_breakfast_price: 500,
                lunch_price: 0,
                child_lunch_price: 0,
              }

        const res = await createRes.mutateAsync({
          room_ids: selectedRoomIds,
          guest_id: guestId,
          checkin: data.checkin,
          checkout: data.checkout,
          adults: data.adults,
          children: data.children,
          adult_price: data.adult_price,
          child_price: data.child_price,
          ...mealSnapshot,
          checkin_time: data.checkin_time || undefined,
          tax_exempt: data.tax_exempt,
          tax_exempt_reason: data.tax_exempt_reason || undefined,
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
          breakfastTime: data.breakfast_time,
          lunchTime: data.lunch_time,
          adults: data.adults,
          children: data.children,
        })

        router.push('/calendar')
      }
    } catch (err) {
      console.error(isEdit ? 'Reservation update failed:' : 'Reservation creation failed:', err)
      const message = err instanceof Error ? err.message : ''
      if (message.includes('network') || message.includes('fetch')) {
        setFormError('インターネット接続を確認してください。')
      } else if (message.includes('duplicate') || message.includes('unique')) {
        setFormError('同じ日程・部屋の予約が既にあります。')
      } else {
        setFormError(isEdit
          ? '予約の更新に失敗しました。入力内容を確認してもう一度お試しください。'
          : '予約の登録に失敗しました。入力内容を確認してもう一度お試しください。')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const totalPersons = adults + children

  return (
    <div>
      <PageHeader title={isEdit ? '予約を編集' : '新規予約'} />

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-4 space-y-6 pb-32">
        {/* ── ゲスト ── */}
        <Section title="ゲスト">
          {/* Phone — primary input with real-time search */}
          <div className="relative">
            <Controller
              name="guest_phone"
              control={control}
              render={({ field }) => (
                <Input
                  label="電話番号（必須）"
                  placeholder="09012345678"
                  type="tel"
                  value={field.value}
                  onChange={e => {
                    const raw = e.target.value.replace(/[-\s]/g, '')
                    field.onChange(raw)
                    // Real-time search by phone
                    if (raw.length >= 3) {
                      handleGuestSearch(raw)
                    } else {
                      setSuggestions([])
                      setShowSuggestions(false)
                    }
                    // Auto-show new guest form when phone is complete but no match
                    if (raw.length >= 10 && !selectedGuest) {
                      // Delay to let search complete
                      setTimeout(() => {
                        if (!selectedGuest) setShowNewGuest(true)
                      }, 500)
                    }
                  }}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true)
                  }}
                  onBlur={() => {
                    field.onBlur()
                    setTimeout(() => setShowSuggestions(false), 200)
                  }}
                  error={errors.guest_phone?.message}
                  autoComplete="off"
                  disabled={!!selectedGuest}
                />
              )}
            />
            {showSuggestions && !selectedGuest && (
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

          {/* Guest loaded indicator */}
          {guestLoaded && selectedGuest && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs font-medium text-accent bg-accent/10 px-2.5 py-1 rounded-full">
                既存ゲスト: {selectedGuest.name}
              </span>
              <button
                type="button"
                className="text-xs text-text-3 underline shrink-0"
                onClick={clearGuest}
              >
                解除
              </button>
            </div>
          )}

          {/* Guest info form — new or existing */}
          {showNewGuest && (
            <div className="mt-3 space-y-3 border border-border rounded-xl p-4">
              {!selectedGuest && (
                <p className="text-xs text-text-2">この電話番号は未登録です。ゲスト情報を入力してください。</p>
              )}
              <Input
                label="名前"
                placeholder="山田 太郎"
                {...register('guest_name')}
              />
              <Input
                label="住所"
                placeholder="東京都渋谷区..."
                {...register('guest_address')}
              />
              <Input
                label="アレルギー"
                placeholder="甲殻類、そばなど"
                {...register('guest_allergy')}
              />
              <Input
                label="メモ"
                placeholder="ゲストに関するメモ"
                {...register('guest_notes')}
              />
            </div>
          )}
        </Section>

        {/* ── 料金プラン ── */}
        {!isEdit && plans.length > 0 && (
          <Section title="料金プラン">
            <div className="flex flex-wrap gap-2">
              {plans.map(plan => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => {
                    setSelectedPlanId(plan.id)
                    setValue('adult_price', plan.adult_price)
                    setValue('child_price', plan.child_price)
                  }}
                  className={cn(
                    'px-3 py-2 rounded-xl text-sm font-medium border transition-colors',
                    selectedPlanId === plan.id
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface border-border text-text-1 active:bg-primary-soft',
                  )}
                >
                  {plan.name}
                  <span className="text-xs ml-1 opacity-75">{formatYen(plan.adult_price)}</span>
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* ── 日程 ── */}
        <Section title="日程">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">チェックイン</label>
              <button
                type="button"
                onClick={() => setPickerTarget('checkin')}
                className="w-full h-11 px-3 flex items-center justify-between rounded-xl bg-surface border border-border text-sm active:bg-primary-soft/50 transition-colors"
              >
                <span>{checkin ? format(new Date(checkin), 'M/d (E)', { locale: ja }) : '日付を選択'}</span>
                <Calendar size={16} className="text-text-3" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">チェックアウト</label>
              <button
                type="button"
                onClick={() => setPickerTarget('checkout')}
                className="w-full h-11 px-3 flex items-center justify-between rounded-xl bg-surface border border-border text-sm active:bg-primary-soft/50 transition-colors"
              >
                <span>{checkout ? format(new Date(checkout), 'M/d (E)', { locale: ja }) : '日付を選択'}</span>
                <Calendar size={16} className="text-text-3" />
              </button>
            </div>
          </div>

          <DatePicker
            open={pickerTarget !== null}
            onClose={() => setPickerTarget(null)}
            selectedDate={pickerTarget === 'checkout' && checkout ? new Date(checkout) : checkin ? new Date(checkin) : new Date()}
            onSelect={(d) => {
              const dateStr = format(d, 'yyyy-MM-dd')
              if (pickerTarget === 'checkin') {
                setValue('checkin', dateStr)
                // チェックインがチェックアウト以降なら、翌日に自動補正
                if (checkout && dateStr >= checkout) {
                  setValue('checkout', format(addDays(d, 1), 'yyyy-MM-dd'))
                }
              } else if (pickerTarget === 'checkout') {
                setValue('checkout', dateStr)
                // チェックアウトがチェックイン以前なら、チェックインをアウト前日に補正
                if (checkin && dateStr <= checkin) {
                  setValue('checkin', format(addDays(d, -1), 'yyyy-MM-dd'))
                }
              }
              setPickerTarget(null)
            }}
          />
          {nights > 0 && (
            <p className="text-sm text-text-2 mt-2">
              {nights}泊 · 空き{' '}
              <span className="font-semibold">
                {rooms.length - unavailableRoomIds.size}/{rooms.length}
              </span>
              室
            </p>
          )}
          <Input label="到着予定" placeholder="15時頃" {...register('checkin_time')} className="mt-3" />
        </Section>

        {/* ── 部屋 ── */}
        <Section title="部屋">
          {selectedRoomIds.length > 1 && (
            <p className="text-xs text-primary font-semibold mb-2">
              {selectedRoomIds.length}室選択中
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {rooms.map(room => {
              const unavailable = unavailableRoomIds.has(room.id)
              const selected = selectedRoomIds.includes(room.id)
              return (
                <button
                  key={room.id}
                  type="button"
                  disabled={unavailable}
                  onClick={() => {
                    setSelectedRoomIds(prev =>
                      prev.includes(room.id)
                        ? prev.filter(rid => rid !== room.id)
                        : [...prev, room.id],
                    )
                  }}
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
              label="朝食"
              enabled={breakfast}
              onToggle={v => {
                setValue('breakfast', v)
                if (v) setValue('breakfast_count', totalPersons)
              }}
              count={breakfastCount}
              onCountChange={v => setValue('breakfast_count', v)}
              maxCount={totalPersons}
              timeValue={breakfastTime}
              onTimeChange={v => setValue('breakfast_time', v)}
              showTime
              timeOptions={['07:00', '07:30', '08:00', '08:30', '09:00', '09:30']}
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
              timeValue={lunchTime}
              onTimeChange={v => setValue('lunch_time', v)}
              showTime
              timeOptions={['11:00', '11:30', '12:00', '12:30', '13:00', '13:30']}
            />
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
              timeOptions={['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00']}
            />
          </div>
        </Section>

        {/* ── メモ ── */}
        <Section title="メモ">
          <Textarea placeholder="備考・連絡事項" {...register('notes')} />
        </Section>

        {/* ── 宿泊税 ── */}
        <Section title="宿泊税">
          <label className="flex items-center gap-3 min-h-[44px]">
            <input
              type="checkbox"
              {...register('tax_exempt')}
              className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
            />
            <div>
              <span className="text-sm font-medium">非課税にする</span>
              <p className="text-xs text-text-3 mt-0.5">修学旅行など課税免除の対象の場合にチェック</p>
            </div>
          </label>
          {taxExempt && (
            <Input
              label="免税理由"
              placeholder="例: 修学旅行（○○中学校）"
              {...register('tax_exempt_reason')}
              className="mt-2"
            />
          )}
        </Section>

        {/* ── 概算 ── */}
        {estimate && (
          <Card className="!bg-primary/[0.04] border border-primary/10">
            <div className="text-sm space-y-1.5">
              {estimate.roomCount >= 2 && (
                <p className="text-xs text-primary font-semibold mb-1">
                  {estimate.roomCount}室を確保
                </p>
              )}
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
              {estimate.taxTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-text-2">宿泊税</span>
                  <span className="font-medium">{formatYen(estimate.taxTotal)}</span>
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
          {submitting
            ? (isEdit ? '保存中…' : '登録中…')
            : (isEdit
              ? '変更を保存'
              : selectedRoomIds.length > 1
                ? `${selectedRoomIds.length}室で予約を登録`
                : '予約を登録')}
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
  timeOptions = ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'],
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
  timeOptions?: string[]
}) {
  return (
    <div className="flex items-center justify-between min-h-[44px]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onToggle(!enabled)}
          className={cn(
            'w-11 h-6 rounded-full transition-colors duration-200 relative shrink-0',
            enabled ? 'bg-primary' : 'bg-border',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out',
              enabled ? 'translate-x-5' : 'translate-x-0',
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
              {timeOptions.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  )
}
