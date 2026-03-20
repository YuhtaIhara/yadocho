import { supabase } from '@/lib/supabase'
import { getInnId } from '@/lib/auth'
import type { TaxPeriod, TaxRule, TaxRuleRate } from '@/lib/types'

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

export async function updateTaxPeriod(
  id: string,
  updates: Partial<Pick<TaxPeriod, 'rate_percent' | 'threshold' | 'effective_from' | 'effective_to' | 'notes'>>,
): Promise<TaxPeriod> {
  const { data, error } = await supabase
    .from('tax_periods')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTaxPeriod(id: string): Promise<void> {
  const { error } = await supabase.from('tax_periods').delete().eq('id', id)
  if (error) throw error
}

// ── New tax system API ──

export async function fetchTaxRules(): Promise<TaxRule[]> {
  const innId = await getInnId()
  if (!innId) return []

  const { data, error } = await supabase
    .from('tax_rules')
    .select('*')
    .eq('inn_id', innId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function fetchTaxRuleRates(ruleIds: string[]): Promise<TaxRuleRate[]> {
  if (ruleIds.length === 0) return []

  const { data, error } = await supabase
    .from('tax_rule_rates')
    .select('*')
    .in('tax_rule_id', ruleIds)
    .order('bracket_min', { ascending: true })

  if (error) throw error
  return data ?? []
}

export type MunicipalityCode =
  | 'nozawa' | 'hakuba' | 'karuizawa' | 'matsumoto'
  | 'achi' | 'nagano_other' | 'tokyo' | 'kutchan'

export async function setupMunicipalityTaxRules(municipality: MunicipalityCode): Promise<void> {
  const innId = await getInnId()
  if (!innId) throw new Error('ログインが必要です')

  const { error } = await supabase.rpc('setup_municipality_tax_rules', {
    p_inn_id: innId,
    p_municipality: municipality,
  })

  if (error) throw error
}
