import { supabase } from '@/lib/supabase'
import { getInnId } from '@/lib/auth'
import type { Kondate } from '@/lib/types'

export async function fetchKondate(date: string): Promise<Kondate | null> {
  const innId = await getInnId()
  if (!innId) return null

  const { data, error } = await supabase
    .from('kondate')
    .select('*')
    .eq('inn_id', innId)
    .eq('date', date)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertKondate(date: string, content: string): Promise<void> {
  const innId = await getInnId()
  if (!innId) throw new Error('ログインが必要です')

  if (!content.trim()) {
    // 空なら削除
    await supabase.from('kondate').delete().eq('inn_id', innId).eq('date', date)
    return
  }

  const { error } = await supabase
    .from('kondate')
    .upsert(
      { inn_id: innId, date, content },
      { onConflict: 'inn_id,date' },
    )

  if (error) throw error
}
