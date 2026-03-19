import { supabase } from '@/lib/supabase'
import { getInnId } from '@/lib/auth'
import type { Room } from '@/lib/types'

export async function fetchRooms(): Promise<Room[]> {
  const innId = await getInnId()
  if (!innId) return []

  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('inn_id', innId)
    .order('sort_order')

  if (error) throw error
  return data ?? []
}

export async function createRoom(input: { name: string; capacity?: number; sort_order?: number }): Promise<Room> {
  const innId = await getInnId()
  if (!innId) throw new Error('ログインが必要です')

  const { data, error } = await supabase
    .from('rooms')
    .insert({ ...input, inn_id: innId })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRoom(id: string, updates: Partial<Pick<Room, 'name' | 'capacity' | 'sort_order'>>): Promise<Room> {
  const { data, error } = await supabase
    .from('rooms')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteRoom(id: string): Promise<void> {
  const { error } = await supabase.from('rooms').delete().eq('id', id)
  if (error) throw error
}
