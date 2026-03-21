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

/** Fetch all reservations (no date filter, includes cancelled) for search/list */
export async function searchReservations(): Promise<Reservation[]> {
  const innId = await getInnId()
  if (!innId) return []

  const { data, error } = await supabase
    .from('reservations')
    .select(SELECT)
    .eq('inn_id', innId)
    .order('checkin', { ascending: false })

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

/** Check for double booking: any room already booked for the date range */
async function checkDoubleBooking(
  roomIds: string[],
  checkin: string,
  checkout: string,
  excludeReservationId?: string,
) {
  for (const roomId of roomIds) {
    const { data: links } = await supabase
      .from('reservation_rooms')
      .select('reservation_id, reservations!inner(checkin, checkout, status)')
      .eq('room_id', roomId)
    if (!links) continue
    for (const link of links) {
      const r = (link as Record<string, any>).reservations as { checkin: string; checkout: string; status: string } | null
      if (!r || r.status === 'cancelled') continue
      if (excludeReservationId && link.reservation_id === excludeReservationId) continue
      if (r.checkin < checkout && r.checkout > checkin) {
        throw new Error('この期間は既に予約が入っています（部屋の空きがありません）')
      }
    }
  }
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
  source?: string
}): Promise<Reservation> {
  // Server-side validation
  if (input.adult_price < 0 || input.child_price < 0) {
    throw new Error('料金は0以上で入力してください')
  }
  if (!input.room_ids || input.room_ids.length === 0) {
    throw new Error('部屋を1つ以上選択してください')
  }

  // Double booking check
  await checkDoubleBooking(input.room_ids, input.checkin, input.checkout)

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

/** Valid status transitions */
const STATUS_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['checked_in', 'cancelled'],
  checked_in: ['settled', 'cancelled'],
  settled: ['checked_in'], // undo settlement only
  cancelled: ['scheduled'], // undo cancellation
}

export async function updateReservation(
  id: string,
  updates: Partial<Omit<Reservation, 'id' | 'inn_id' | 'created_at' | 'updated_at' | 'rooms' | 'guest'>> & { room_ids?: string[] },
): Promise<Reservation> {
  const { room_ids, ...fields } = updates

  // Validate status transition
  if (fields.status) {
    const { data: current } = await supabase
      .from('reservations')
      .select('status')
      .eq('id', id)
      .single()
    if (!current) throw new Error('予約が見つかりません')
    const allowed = STATUS_TRANSITIONS[current.status] ?? []
    if (!allowed.includes(fields.status)) {
      const STATUS_JP: Record<string, string> = {
        scheduled: '予約済み', checked_in: 'チェックイン', settled: '精算済み', cancelled: 'キャンセル',
      }
      throw new Error(`${STATUS_JP[current.status] ?? current.status} から ${STATUS_JP[fields.status] ?? fields.status} への変更はできません`)
    }
  }

  // Block edits to settled reservations (except status changes)
  if (Object.keys(fields).some(k => k !== 'status') || room_ids) {
    const { data: current } = await supabase
      .from('reservations')
      .select('status')
      .eq('id', id)
      .single()
    if (current?.status === 'settled') {
      throw new Error('精算済みの予約は編集できません')
    }
  }

  // Double booking check if dates or rooms changed
  if (fields.checkin || fields.checkout || room_ids) {
    const { data: current } = await supabase
      .from('reservations')
      .select('checkin, checkout')
      .eq('id', id)
      .single()
    const checkin = fields.checkin ?? current?.checkin ?? ''
    const checkout = fields.checkout ?? current?.checkout ?? ''
    // Get current room_ids if not being changed
    let checkRoomIds = room_ids
    if (!checkRoomIds) {
      const { data: rr } = await supabase
        .from('reservation_rooms')
        .select('room_id')
        .eq('reservation_id', id)
      checkRoomIds = rr?.map(r => r.room_id) ?? []
    }
    if (checkRoomIds.length > 0 && checkin && checkout) {
      await checkDoubleBooking(checkRoomIds, checkin, checkout, id)
    }
  }

  // Record change history
  if (Object.keys(fields).length > 0) {
    const { data: before } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', id)
      .single()
    if (before) {
      const historyRows = Object.entries(fields)
        .filter(([key, val]) => String(before[key as keyof typeof before] ?? '') !== String(val ?? ''))
        .map(([key, val]) => ({
          reservation_id: id,
          field_name: key,
          old_value: String(before[key as keyof typeof before] ?? ''),
          new_value: String(val ?? ''),
        }))
      if (historyRows.length > 0) {
        await supabase.from('reservation_history').insert(historyRows)
      }
    }
  }

  // Update reservation fields
  if (Object.keys(fields).length > 0) {
    const { error } = await supabase
      .from('reservations')
      .update(fields)
      .eq('id', id)

    if (error) throw error
  }

  // Clean up orphaned meal_days if dates changed
  if (fields.checkin || fields.checkout) {
    const { data: updated } = await supabase
      .from('reservations')
      .select('checkin, checkout')
      .eq('id', id)
      .single()
    if (updated) {
      await supabase
        .from('meal_days')
        .delete()
        .eq('reservation_id', id)
        .or(`date.lt.${updated.checkin},date.gte.${updated.checkout}`)
    }
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
  // Prevent deletion of settled reservations
  const { data: current } = await supabase
    .from('reservations')
    .select('status')
    .eq('id', id)
    .single()
  if (current?.status === 'settled') {
    throw new Error('精算済みの予約は削除できません')
  }
  // reservation_rooms cascade-deleted via FK
  const { error } = await supabase.from('reservations').delete().eq('id', id)
  if (error) throw error
}
