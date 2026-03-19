'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchBlockedDates, createBlockedDate, updateBlockedDate, deleteBlockedDate } from '@/lib/api/blocked-dates'

export function useBlockedDates(from: string, to: string) {
  return useQuery({
    queryKey: ['blockedDates', from, to],
    queryFn: () => fetchBlockedDates(from, to),
    enabled: !!from && !!to,
  })
}

export function useCreateBlockedDate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createBlockedDate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blockedDates'] }),
  })
}

export function useUpdateBlockedDate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; reason?: string | null }) =>
      updateBlockedDate(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blockedDates'] }),
  })
}

export function useDeleteBlockedDate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteBlockedDate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blockedDates'] }),
  })
}
