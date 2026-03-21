import { supabase } from '@/lib/supabase'
import { getInnId } from '@/lib/auth'
import type { Guest } from '@/lib/types'

export async function fetchGuests(search?: string): Promise<Guest[]> {
  const innId = await getInnId()
  if (!innId) return []

  let query = supabase
    .from('guests')
    .select('*')
    .eq('inn_id', innId)
    .order('updated_at', { ascending: false })

  if (search) {
    const isDigitsOnly = /^\d+$/.test(search.replace(/[-\s]/g, ''))
    if (isDigitsOnly) {
      // Phone search: strip hyphens/spaces and search by phone
      const cleaned = search.replace(/[-\s]/g, '')
      query = query.ilike('phone', `%${cleaned}%`)
    } else {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,furigana.ilike.%${search}%`)
    }
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function fetchGuest(id: string): Promise<Guest | null> {
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createGuest(input: {
  name: string
  furigana?: string
  phone?: string
  email?: string
  address?: string
  company?: string
  allergy?: string
  notes?: string
}): Promise<Guest> {
  const innId = await getInnId()
  if (!innId) throw new Error('ログインが必要です')

  // Duplicate phone check
  if (input.phone) {
    const { data: existing } = await supabase
      .from('guests')
      .select('id')
      .eq('inn_id', innId)
      .eq('phone', input.phone)
      .limit(1)
    if (existing && existing.length > 0) {
      throw new Error('この電話番号は既に登録されています')
    }
  }

  const { data, error } = await supabase
    .from('guests')
    .insert({ ...input, inn_id: innId })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateGuest(
  id: string,
  updates: Partial<Omit<Guest, 'id' | 'inn_id' | 'created_at' | 'updated_at'>>,
): Promise<Guest> {
  // Duplicate phone check (excluding current guest)
  if (updates.phone) {
    const innId = await getInnId()
    if (innId) {
      const { data: existing } = await supabase
        .from('guests')
        .select('id')
        .eq('inn_id', innId)
        .eq('phone', updates.phone)
        .neq('id', id)
        .limit(1)
      if (existing && existing.length > 0) {
        throw new Error('この電話番号は既に登録されています')
      }
    }
  }

  const { data, error } = await supabase
    .from('guests')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteGuest(id: string): Promise<void> {
  // Prevent deletion if guest has settled reservations
  const { data: settled } = await supabase
    .from('reservations')
    .select('id')
    .eq('guest_id', id)
    .eq('status', 'settled')
    .limit(1)
  if (settled && settled.length > 0) {
    throw new Error('精算済みの予約があるゲストは削除できません')
  }
  const { error } = await supabase.from('guests').delete().eq('id', id)
  if (error) throw error
}
