'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchRooms } from '@/lib/api/rooms'

export function useRooms() {
  return useQuery({
    queryKey: ['rooms'],
    queryFn: fetchRooms,
  })
}
