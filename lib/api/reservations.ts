import { supabase } from '@/lib/supabase'
import { getInnId } from '@/lib/auth'
import type { Reservation, Room } from '@/lib/types'

/** Flatten PostgREST join: reservation_rooms(room:rooms(*)) → rooms[] */
function flattenRooms(row: Record<string, unknown>): Reservation {
  const rr = row.reservation_rooms as { room: Room }[] | undefined
  const rooms = rr?.map(r => r.room).filter(Boolean) ?? []
  const { reservation_rooms: _, ...rest } = row
  return { ...rest, rooms } as unknown as Reservation
}

const SELECT = '*, reservation_rooms(room:rooms(*)), guest:guests(*)'

export async function fetchReservations(from: string, to: string): Promise<Reservation[]> {
  const innId = await getInnId()
  if (!innId) return []

  const { data, error } = await supabase
    .from('reservations')
    .select(SELECT)
    .eq('inn_id', innId)
    .lte('checkin', to)
    .gte('checkout', from)
    .neq('status', 'cancelled')
    .order('checkin')

  if (error) throw error
  return (data ?? []).map(flattenRooms)
}

export async function fetchReservation(id: string): Promise<Reservation | null> {
  const { data, error } = await supabase
    .from('reservations')
    .select(SELECT)
    .eq('id', id)
    .single()

  if (error) throw error
  return data ? flattenRooms(data) : null
}

export async function createReservation(input: {
  room_ids: string[]
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
  tax_exempt_reason?: string
}): Promise<Reservation> {
  const innId = await getInnId()
  if (!innId) throw new Error('ログインが必要です')

  const { room_ids, ...fields } = input

  // Create reservation (without joins first)
  const { data: res, error } = await supabase
    .from('reservations')
    .insert({ ...fields, inn_id: innId })
    .select('*')
    .single()

  if (error) throw error

  // Link rooms
  if (room_ids.length > 0) {
    const { error: rrError } = await supabase
      .from('reservation_rooms')
      .insert(room_ids.map(rid => ({ reservation_id: res.id, room_id: rid })))

    if (rrError) throw rrError
  }

  // Re-fetch with joins
  const { data: full, error: fetchErr } = await supabase
    .from('reservations')
    .select(SELECT)
    .eq('id', res.id)
    .single()

  if (fetchErr) throw fetchErr
  return flattenRooms(full)
}

export async function updateReservation(
  id: string,
  updates: Partial<Omit<Reservation, 'id' | 'inn_id' | 'created_at' | 'updated_at' | 'rooms' | 'guest'>> & { room_ids?: string[] },
): Promise<Reservation> {
  const { room_ids, ...fields } = updates

  // Update reservation fields
  if (Object.keys(fields).length > 0) {
    const { error } = await supabase
      .from('reservations')
      .update(fields)
      .eq('id', id)

    if (error) throw error
  }

  // Update room links if provided
  if (room_ids) {
    await supabase.from('reservation_rooms').delete().eq('reservation_id', id)
    if (room_ids.length > 0) {
      const { error: rrError } = await supabase
        .from('reservation_rooms')
        .insert(room_ids.map(rid => ({ reservation_id: id, room_id: rid })))

      if (rrError) throw rrError
    }
  }

  // Re-fetch with joins
  const { data, error: fetchErr } = await supabase
    .from('reservations')
    .select(SELECT)
    .eq('id', id)
    .single()

  if (fetchErr) throw fetchErr
  return flattenRooms(data)
}

export async function deleteReservation(id: string): Promise<void> {
  // reservation_rooms cascade-deleted via FK
  const { error } = await supabase.from('reservations').delete().eq('id', id)
  if (error) throw error
}
