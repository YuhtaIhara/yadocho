import { supabase } from '@/lib/supabase'
import { getInnId } from '@/lib/auth'
import type { BlockedDate } from '@/lib/types'

export async function fetchBlockedDates(from: string, to: string): Promise<BlockedDate[]> {
  const innId = await getInnId()
  if (!innId) return []

  const { data, error } = await supabase
    .from('blocked_dates')
    .select('*')
    .eq('inn_id', innId)
    .gte('date', from)
    .lte('date', to)

  if (error) throw error
  return data ?? []
}

export async function createBlockedDate(input: { date: string; room_id?: string; reason?: string }): Promise<BlockedDate> {
  const innId = await getInnId()
  const { data, error } = await supabase
    .from('blocked_dates')
    .insert({ ...input, inn_id: innId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateBlockedDate(id: string, input: { reason?: string | null }): Promise<BlockedDate> {
  const { data, error } = await supabase
    .from('blocked_dates')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteBlockedDate(id: string): Promise<void> {
  const { error } = await supabase.from('blocked_dates').delete().eq('id', id)
  if (error) throw error
}
