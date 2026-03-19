import { supabase } from '@/lib/supabase'
import { getInnId } from '@/lib/auth'
import type { Reservation } from '@/lib/types'

export async function fetchReservations(from: string, to: string): Promise<Reservation[]> {
  const innId = await getInnId()
  if (!innId) return []

  const { data, error } = await supabase
    .from('reservations')
    .select('*, room:rooms(*), guest:guests(*)')
    .eq('inn_id', innId)
    .lte('checkin', to)
    .gte('checkout', from)
    .neq('status', 'cancelled')
    .order('checkin')

  if (error) throw error
  return data ?? []
}

export async function fetchReservation(id: string): Promise<Reservation | null> {
  const { data, error } = await supabase
    .from('reservations')
    .select('*, room:rooms(*), guest:guests(*)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createReservation(input: {
  room_id: string
  guest_id: string
  checkin: string
  checkout: string
  adults: number
  children: number
  adult_price: number
  child_price: number
  checkin_time?: string
  notes?: string
  tax_exempt?: boolean
  group_id?: string
}): Promise<Reservation> {
  const innId = await getInnId()
  if (!innId) throw new Error('ログインが必要です')

  const { data, error } = await supabase
    .from('reservations')
    .insert({ ...input, inn_id: innId })
    .select('*, room:rooms(*), guest:guests(*)')
    .single()

  if (error) throw error
  return data
}

export async function updateReservation(
  id: string,
  updates: Partial<Omit<Reservation, 'id' | 'inn_id' | 'created_at' | 'updated_at' | 'room' | 'guest'>>,
): Promise<Reservation> {
  const { data, error } = await supabase
    .from('reservations')
    .update(updates)
    .eq('id', id)
    .select('*, room:rooms(*), guest:guests(*)')
    .single()

  if (error) throw error
  return data
}

export async function deleteReservation(id: string): Promise<void> {
  const { error } = await supabase.from('reservations').delete().eq('id', id)
  if (error) throw error
}
