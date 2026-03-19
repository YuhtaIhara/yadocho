'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchBlockedDates } from '@/lib/api/blocked-dates'

export function useBlockedDates(from: string, to: string) {
  return useQuery({
    queryKey: ['blockedDates', from, to],
    queryFn: () => fetchBlockedDates(from, to),
    enabled: !!from && !!to,
  })
}
