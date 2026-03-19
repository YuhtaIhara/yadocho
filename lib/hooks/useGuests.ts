'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchGuests, fetchGuest, createGuest, updateGuest } from '@/lib/api/guests'

export function useGuests(search?: string) {
  return useQuery({
    queryKey: ['guests', search ?? ''],
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

export function useCreateGuest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createGuest,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guests'] }),
  })
}

export function useUpdateGuest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Parameters<typeof updateGuest>[1] & { id: string }) =>
      updateGuest(id, updates),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['guests'] })
      qc.invalidateQueries({ queryKey: ['guest', vars.id] })
    },
  })
}
