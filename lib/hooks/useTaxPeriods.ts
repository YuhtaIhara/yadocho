'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchTaxPeriods } from '@/lib/api/tax'

export function useTaxPeriods() {
  return useQuery({
    queryKey: ['taxPeriods'],
    queryFn: fetchTaxPeriods,
  })
}
