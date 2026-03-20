'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchInn } from '@/lib/api/inn'

export function useInn() {
  return useQuery({
    queryKey: ['inn'],
    queryFn: fetchInn,
  })
}
