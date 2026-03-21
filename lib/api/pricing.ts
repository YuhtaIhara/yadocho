import { supabase } from '@/lib/supabase'
import { getInnId } from '@/lib/auth'
import type { PricingConfig, PricingPlan } from '@/lib/types'

export async function fetchPricing(): Promise<PricingConfig | null> {
  const innId = await getInnId()
  if (!innId) return null

  const { data, error } = await supabase
    .from('pricing_config')
    .select('*')
    .eq('inn_id', innId)
    .single()

  if (error) throw error
  return data
}

export async function upsertPricing(
  input: Omit<PricingConfig, 'updated_at'>,
): Promise<PricingConfig> {
  const { data, error } = await supabase
    .from('pricing_config')
    .upsert(input)
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Pricing Plans ──

export async function fetchPricingPlans(): Promise<PricingPlan[]> {
  const innId = await getInnId()
  if (!innId) return []

  const { data, error } = await supabase
    .from('pricing_plans')
    .select('*')
    .eq('inn_id', innId)
    .order('sort_order')
    .order('created_at')

  if (error) throw error
  return data ?? []
}

export async function createPricingPlan(
  input: Omit<PricingPlan, 'id' | 'created_at'>,
): Promise<PricingPlan> {
  const { data, error } = await supabase
    .from('pricing_plans')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePricingPlan(
  id: string,
  input: Partial<Omit<PricingPlan, 'id' | 'inn_id' | 'created_at'>>,
): Promise<PricingPlan> {
  const { data, error } = await supabase
    .from('pricing_plans')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deletePricingPlan(id: string): Promise<void> {
  const { error } = await supabase
    .from('pricing_plans')
    .delete()
    .eq('id', id)

  if (error) throw error
}
