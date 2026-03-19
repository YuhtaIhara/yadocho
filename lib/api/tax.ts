import { supabase } from '@/lib/supabase'
import { getInnId } from '@/lib/auth'
import type { TaxPeriod } from '@/lib/types'

export async function fetchTaxPeriods(): Promise<TaxPeriod[]> {
  const innId = await getInnId()
  if (!innId) return []

  const { data, error } = await supabase
    .from('tax_periods')
    .select('*')
    .eq('inn_id', innId)
    .order('effective_from', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function createTaxPeriod(input: {
  rate_percent: number
  threshold: number
  effective_from: string
  effective_to?: string | null
  notes?: string
}): Promise<TaxPeriod> {
  const innId = await getInnId()
  if (!innId) throw new Error('ログインが必要です')

  const { data, error } = await supabase
    .from('tax_periods')
    .insert({ ...input, inn_id: innId })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTaxPeriod(id: string): Promise<void> {
  const { error } = await supabase.from('tax_periods').delete().eq('id', id)
  if (error) throw error
}
