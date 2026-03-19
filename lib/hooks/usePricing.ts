'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchPricing } from '@/lib/api/pricing'

export function usePricing() {
  return useQuery({
    queryKey: ['pricing'],
    queryFn: fetchPricing,
  })
}
