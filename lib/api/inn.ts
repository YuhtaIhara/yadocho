import { supabase } from '@/lib/supabase'
import { getInnId } from '@/lib/auth'
import type { Inn } from '@/lib/types'

export async function fetchInn(): Promise<Inn | null> {
  const innId = await getInnId()
  if (!innId) return null

  const { data, error } = await supabase
    .from('inns')
    .select('*')
    .eq('id', innId)
    .single()

  if (error) return null
  return data
}

export async function updateInn(
  updates: Partial<Pick<Inn, 'name' | 'address' | 'phone' | 'representative'>>,
): Promise<Inn> {
  const innId = await getInnId()
  if (!innId) throw new Error('ログインが必要です')

  const { data, error } = await supabase
    .from('inns')
    .update(updates)
    .eq('id', innId)
    .select()
    .single()

  if (error) throw error
  return data
}
