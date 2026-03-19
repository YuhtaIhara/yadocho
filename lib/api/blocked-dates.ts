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
