'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchMealDays, fetchMealDaysForDate } from '@/lib/api/meal-days'

export function useMealDays(reservationId: string) {
  return useQuery({
    queryKey: ['mealDays', reservationId],
    queryFn: () => fetchMealDays(reservationId),
    enabled: !!reservationId,
  })
}

export function useMealDaysForDate(date: string, reservationIds: string[]) {
  return useQuery({
    queryKey: ['mealDaysDate', date, reservationIds],
    queryFn: () => fetchMealDaysForDate(date, reservationIds),
    enabled: !!date && reservationIds.length > 0,
  })
}
