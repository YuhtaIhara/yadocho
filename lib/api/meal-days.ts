import { supabase } from '@/lib/supabase'
import { eachDayOfInterval, parseISO, format } from 'date-fns'
import type { MealDay } from '@/lib/types'

export type MealConfig = {
  checkin: string
  checkout: string
  dinner: boolean
  breakfast: boolean
  lunch: boolean
  dinnerCount: number
  breakfastCount: number
  lunchCount: number
  dinnerTime?: string
  breakfastTime?: string
  lunchTime?: string
  adults: number
  children: number
}

function splitCount(total: number, adults: number) {
  const a = Math.min(total, adults)
  return { adults: a, children: total - a }
}

export async function createMealDays(reservationId: string, config: MealConfig) {
  const dates = eachDayOfInterval({
    start: parseISO(config.checkin),
    end: parseISO(config.checkout),
  })

  const d = splitCount(config.dinnerCount, config.adults)
  const b = splitCount(config.breakfastCount, config.adults)
  const l = splitCount(config.lunchCount, config.adults)

  const rows = dates.map((date, i) => {
    const isFirst = i === 0
    const isLast = i === dates.length - 1
    const hasDinner = config.dinner && !isLast
    const hasBreakfast = config.breakfast && !isFirst
    const hasLunch = config.lunch && !isFirst && !isLast

    return {
      reservation_id: reservationId,
      date: format(date, 'yyyy-MM-dd'),
      dinner_adults: hasDinner ? d.adults : 0,
      dinner_children: hasDinner ? d.children : 0,
      dinner_time: hasDinner ? config.dinnerTime ?? null : null,
      breakfast_adults: hasBreakfast ? b.adults : 0,
      breakfast_children: hasBreakfast ? b.children : 0,
      breakfast_time: hasBreakfast ? config.breakfastTime ?? null : null,
      lunch_adults: hasLunch ? l.adults : 0,
      lunch_children: hasLunch ? l.children : 0,
      lunch_time: hasLunch ? config.lunchTime ?? null : null,
    }
  })

  if (rows.length === 0) return

  const { error } = await supabase.from('meal_days').insert(rows)
  if (error) throw error
}

export async function fetchMealDays(reservationId: string): Promise<MealDay[]> {
  const { data, error } = await supabase
    .from('meal_days')
    .select('*')
    .eq('reservation_id', reservationId)
    .order('date')

  if (error) throw error
  return data ?? []
}

export async function fetchMealDaysForDate(
  date: string,
  reservationIds: string[],
): Promise<MealDay[]> {
  if (reservationIds.length === 0) return []

  const { data, error } = await supabase
    .from('meal_days')
    .select('*')
    .eq('date', date)
    .in('reservation_id', reservationIds)

  if (error) throw error
  return data ?? []
}
