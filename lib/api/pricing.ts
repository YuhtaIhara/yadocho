import { supabase } from '@/lib/supabase'
import { getInnId } from '@/lib/auth'
import type { PricingConfig } from '@/lib/types'

export async function fetchPricing(): Promise<PricingConfig | null> {
  const innId = await getInnId()
  if (!innId) return null

  const { data, error } = await supabase
    .from('pricing_config')
    .select('*')
    .eq('inn_id', innId)
    .single()

  if (error) return null
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
