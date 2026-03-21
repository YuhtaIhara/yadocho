'use client'

import { useParams } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import { useReservation } from '@/lib/hooks/useReservations'
import { useMealDays } from '@/lib/hooks/useMealDays'
import ReservationForm from '../../new/ReservationForm'

export default function EditReservation() {
  const { id } = useParams<{ id: string }>()
  const { data: reservation, isLoading: resLoading } = useReservation(id)
  const { data: mealDays = [], isLoading: mealsLoading } = useMealDays(id)

  if (resLoading || mealsLoading) {
    return (
      <div>
        <PageHeader title="予約を編集" />
        <div className="flex items-center justify-center h-48 text-sm text-text-3">
          読み込み中…
        </div>
      </div>
    )
  }

  if (!reservation || !reservation.guest) {
    return (
      <div>
        <PageHeader title="予約を編集" />
        <div className="flex items-center justify-center h-48 text-sm text-text-3">
          予約が見つかりません
        </div>
      </div>
    )
  }

  return (
    <ReservationForm
      mode="edit"
      initialData={{
        id: reservation.id,
        guest: {
          id: reservation.guest.id,
          name: reservation.guest.name,
          phone: reservation.guest.phone,
        },
        room_ids: reservation.rooms?.map(r => r.id) ?? [],
        checkin: reservation.checkin,
        checkout: reservation.checkout,
        adults: reservation.adults,
        children: reservation.children,
        adult_price: reservation.adult_price,
        child_price: reservation.child_price,
        checkin_time: reservation.checkin_time,
        pricing_plan_id: reservation.pricing_plan_id,
        tax_exempt: reservation.tax_exempt,
        tax_exempt_reason: reservation.tax_exempt_reason,
        notes: reservation.notes,
        mealDays,
      }}
    />
  )
}
