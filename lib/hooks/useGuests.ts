'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchGuests, fetchGuest } from '@/lib/api/guests'

export function useGuests(search?: string) {
  return useQuery({
    queryKey: ['guests', search],
    queryFn: () => fetchGuests(search),
  })
}

export function useGuest(id: string) {
  return useQuery({
    queryKey: ['guest', id],
    queryFn: () => fetchGuest(id),
    enabled: !!id,
  })
}
