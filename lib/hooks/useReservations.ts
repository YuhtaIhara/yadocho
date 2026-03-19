'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchReservations,
  fetchReservation,
  createReservation,
  updateReservation,
  deleteReservation,
} from '@/lib/api/reservations'

export function useReservations(from: string, to: string) {
  return useQuery({
    queryKey: ['reservations', from, to],
    queryFn: () => fetchReservations(from, to),
    enabled: !!from && !!to,
  })
}

export function useReservation(id: string) {
  return useQuery({
    queryKey: ['reservation', id],
    queryFn: () => fetchReservation(id),
    enabled: !!id,
  })
}

export function useCreateReservation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createReservation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  })
}

export function useUpdateReservation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Parameters<typeof updateReservation>[1] & { id: string }) =>
      updateReservation(id, updates),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['reservations'] })
      qc.invalidateQueries({ queryKey: ['reservation', vars.id] })
    },
  })
}

export function useDeleteReservation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteReservation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  })
}
