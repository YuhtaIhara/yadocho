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

export async function upsertMealDay(input: Omit<MealDay, 'id' | 'created_at' | 'updated_at'>): Promise<MealDay> {
  const { data, error } = await supabase
    .from('meal_days')
    .upsert(input, { onConflict: 'reservation_id,date' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function upsertMealDays(inputs: Omit<MealDay, 'id' | 'created_at' | 'updated_at'>[]): Promise<MealDay[]> {
  const { data, error } = await supabase
    .from('meal_days')
    .upsert(inputs, { onConflict: 'reservation_id,date' })
    .select()

  if (error) throw error
  return data ?? []
}
