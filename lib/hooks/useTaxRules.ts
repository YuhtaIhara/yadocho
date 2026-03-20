'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchTaxRules, fetchTaxRuleRates } from '@/lib/api/tax'
import type { TaxRule, TaxRuleRate } from '@/lib/types'

export function useTaxRules() {
  return useQuery({
    queryKey: ['taxRules'],
    queryFn: fetchTaxRules,
  })
}

/**
 * tax_rules + tax_rule_rates をまとめて取得する hook
 * 4画面で共通利用する
 */
export function useTaxData(): {
  taxRules: TaxRule[]
  taxRuleRates: TaxRuleRate[]
  isLoading: boolean
} {
  const { data: taxRules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['taxRules'],
    queryFn: fetchTaxRules,
  })

  const ruleIds = taxRules.map((r) => r.id)

  const { data: taxRuleRates = [], isLoading: ratesLoading } = useQuery({
    queryKey: ['taxRuleRates', ruleIds],
    queryFn: () => fetchTaxRuleRates(ruleIds),
    enabled: ruleIds.length > 0,
  })

  return {
    taxRules,
    taxRuleRates,
    isLoading: rulesLoading || ratesLoading,
  }
}
