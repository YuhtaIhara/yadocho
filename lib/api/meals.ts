import { supabase } from '@/lib/supabase'
import type { MealDay } from '@/lib/types'

export async function fetchMealDaysByDate(date: string, innId: string): Promise<(MealDay & { reservation: { guest: { name: string }; room: { name: string } } })[]> {
  const { data, error } = await supabase
    .from('meal_days')
    .select('*, reservation:reservations!inner(guest:guests(name), room:rooms(name))')
    .eq('date', date)
    .eq('reservation.inn_id', innId)
    .order('created_at')

  if (error) throw error
  return data ?? []
}

export async function fetchMealDaysByReservation(reservationId: string): Promise<MealDay[]> {
  const { data, error } = await supabase
    .from('meal_days')
    .select('*')
    .eq('reservation_id', reservationId)
    .order('date')

  if (error) throw error
  return data ?? []
}

/** Check reservation is not settled before allowing meal edits */
async function guardSettled(reservationId: string) {
  const { data } = await supabase
    .from('reservations')
    .select('status')
    .eq('id', reservationId)
    .single()
  if (data?.status === 'settled' || data?.status === 'cancelled') {
    throw new Error('精算済み・キャンセル済みの予約の食事データは変更できません')
  }
}

/** Validate meal count fields are non-negative */
function validateMealCounts(input: Omit<MealDay, 'id' | 'created_at' | 'updated_at'>) {
  const countFields = [
    'dinner_adults', 'dinner_children',
    'breakfast_adults', 'breakfast_children',
    'lunch_adults', 'lunch_children',
  ] as const
  for (const field of countFields) {
    if (input[field] < 0) {
      throw new Error('食事人数は0以上で入力してください')
    }
  }
}

export async function upsertMealDay(input: Omit<MealDay, 'id' | 'created_at' | 'updated_at'>): Promise<MealDay> {
  validateMealCounts(input)
  await guardSettled(input.reservation_id)
  const { data, error } = await supabase
    .from('meal_days')
    .upsert(input, { onConflict: 'reservation_id,date' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function upsertMealDays(inputs: Omit<MealDay, 'id' | 'created_at' | 'updated_at'>[]): Promise<MealDay[]> {
  if (inputs.length === 0) return []
  for (const input of inputs) validateMealCounts(input)
  await guardSettled(inputs[0].reservation_id)
  const { data, error } = await supabase
    .from('meal_days')
    .upsert(inputs, { onConflict: 'reservation_id,date' })
    .select()

  if (error) throw error
  return data ?? []
}
