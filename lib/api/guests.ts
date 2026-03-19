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
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
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
  phone?: string
  email?: string
  address?: string
  allergy?: string
  notes?: string
}): Promise<Guest> {
  const innId = await getInnId()
  if (!innId) throw new Error('ログインが必要です')

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
  const { data, error } = await supabase
    .from('guests')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}
