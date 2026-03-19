'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchRooms, createRoom, updateRoom, deleteRoom } from '@/lib/api/rooms'

export function useRooms() {
  return useQuery({
    queryKey: ['rooms'],
    queryFn: fetchRooms,
  })
}

export function useCreateRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createRoom,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rooms'] }),
  })
}

export function useUpdateRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Parameters<typeof updateRoom>[1] & { id: string }) =>
      updateRoom(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rooms'] }),
  })
}

export function useDeleteRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteRoom,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rooms'] }),
  })
}
