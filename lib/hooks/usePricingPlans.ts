'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchPricingPlans,
  createPricingPlan,
  updatePricingPlan,
  deletePricingPlan,
} from '@/lib/api/pricing'
import type { PricingPlan } from '@/lib/types'

const KEY = ['pricingPlans'] as const

export function usePricingPlans() {
  return useQuery({
    queryKey: KEY,
    queryFn: fetchPricingPlans,
  })
}

export function useCreatePricingPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createPricingPlan,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdatePricingPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<Omit<PricingPlan, 'id' | 'inn_id' | 'created_at'>>) =>
      updatePricingPlan(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeletePricingPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deletePricingPlan,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
