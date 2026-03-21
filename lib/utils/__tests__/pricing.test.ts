import { describe, test, expect } from 'vitest'
import { calcMealCost, getMealPrices, MEAL_DEFAULTS } from '../pricing'
import type { MealDay } from '@/lib/types'

/** Helper to create a MealDay with defaults */
function makeMealDay(overrides: Partial<MealDay> = {}): MealDay {
  return {
    id: 'md-1',
    reservation_id: 'res-1',
    date: '2026-03-21',
    dinner_adults: 0,
    dinner_children: 0,
    dinner_time: null,
    breakfast_adults: 0,
    breakfast_children: 0,
    breakfast_time: null,
    lunch_adults: 0,
    lunch_children: 0,
    lunch_time: null,
    notes: null,
    created_at: '2026-03-21T00:00:00Z',
    updated_at: '2026-03-21T00:00:00Z',
    ...overrides,
  }
}

describe('getMealPrices', () => {
  test('returns defaults when source is null', () => {
    const prices = getMealPrices(null)
    expect(prices).toEqual({
      dp: MEAL_DEFAULTS.dinner_price,
      cdp: MEAL_DEFAULTS.child_dinner_price,
      bp: MEAL_DEFAULTS.breakfast_price,
      cbp: MEAL_DEFAULTS.child_breakfast_price,
      lp: MEAL_DEFAULTS.lunch_price,
      clp: MEAL_DEFAULTS.child_lunch_price,
    })
  })

  test('returns defaults when source is undefined', () => {
    const prices = getMealPrices(undefined)
    expect(prices.dp).toBe(2000)
    expect(prices.bp).toBe(800)
  })

  test('uses source values when provided', () => {
    const source = {
      dinner_price: 3000,
      child_dinner_price: 2000,
      breakfast_price: 1000,
      child_breakfast_price: 700,
      lunch_price: 1200,
      child_lunch_price: 800,
    }
    const prices = getMealPrices(source)
    expect(prices).toEqual({
      dp: 3000,
      cdp: 2000,
      bp: 1000,
      cbp: 700,
      lp: 1200,
      clp: 800,
    })
  })

  test('falls back to defaults for null fields in source', () => {
    // Simulating a source where some fields are undefined/null
    const source = {
      dinner_price: 3000,
      child_dinner_price: null as unknown as number,
      breakfast_price: undefined as unknown as number,
      child_breakfast_price: 700,
      lunch_price: 0, // 0 is a valid value, should not fall back
      child_lunch_price: 0,
    }
    const prices = getMealPrices(source)
    expect(prices.dp).toBe(3000)
    expect(prices.cdp).toBe(MEAL_DEFAULTS.child_dinner_price) // null → default
    expect(prices.bp).toBe(MEAL_DEFAULTS.breakfast_price) // undefined → default
    expect(prices.cbp).toBe(700)
    expect(prices.lp).toBe(0) // 0 is kept, not replaced by default
    expect(prices.clp).toBe(0)
  })
})

describe('calcMealCost', () => {
  test('returns 0 for empty meal days array', () => {
    expect(calcMealCost([], null)).toBe(0)
  })

  test('returns 0 when all meal counts are 0', () => {
    const days = [makeMealDay()]
    expect(calcMealCost(days, null)).toBe(0)
  })

  test('calculates dinner only (adults)', () => {
    const days = [makeMealDay({ dinner_adults: 2 })]
    // 2 * 2000 (default dinner_price) = 4000
    expect(calcMealCost(days, null)).toBe(4000)
  })

  test('calculates dinner only (children)', () => {
    const days = [makeMealDay({ dinner_children: 3 })]
    // 3 * 1500 (default child_dinner_price) = 4500
    expect(calcMealCost(days, null)).toBe(4500)
  })

  test('calculates breakfast only', () => {
    const days = [makeMealDay({ breakfast_adults: 2, breakfast_children: 1 })]
    // 2 * 800 + 1 * 500 = 2100
    expect(calcMealCost(days, null)).toBe(2100)
  })

  test('calculates all meal types combined', () => {
    const days = [
      makeMealDay({
        dinner_adults: 2,
        dinner_children: 1,
        breakfast_adults: 2,
        breakfast_children: 1,
        lunch_adults: 2,
        lunch_children: 1,
      }),
    ]
    // dinner: 2*2000 + 1*1500 = 5500
    // breakfast: 2*800 + 1*500 = 2100
    // lunch: 2*0 + 1*0 = 0 (default lunch prices are 0)
    expect(calcMealCost(days, null)).toBe(7600)
  })

  test('accumulates across multiple days', () => {
    const days = [
      makeMealDay({ date: '2026-03-21', dinner_adults: 2 }),
      makeMealDay({ date: '2026-03-22', dinner_adults: 2, breakfast_adults: 2 }),
    ]
    // Day 1: 2*2000 = 4000
    // Day 2: 2*2000 + 2*800 = 5600
    expect(calcMealCost(days, null)).toBe(9600)
  })

  test('uses custom pricing', () => {
    const pricing = {
      dinner_price: 5000,
      child_dinner_price: 3000,
      breakfast_price: 1500,
      child_breakfast_price: 1000,
      lunch_price: 2000,
      child_lunch_price: 1500,
    }
    const days = [
      makeMealDay({
        dinner_adults: 1,
        dinner_children: 1,
        breakfast_adults: 1,
        breakfast_children: 1,
        lunch_adults: 1,
        lunch_children: 1,
      }),
    ]
    // 1*5000 + 1*3000 + 1*1500 + 1*1000 + 1*2000 + 1*1500 = 14000
    expect(calcMealCost(days, pricing)).toBe(14000)
  })

  test('handles lunch with non-zero prices', () => {
    const pricing = {
      dinner_price: 0,
      child_dinner_price: 0,
      breakfast_price: 0,
      child_breakfast_price: 0,
      lunch_price: 1000,
      child_lunch_price: 700,
    }
    const days = [makeMealDay({ lunch_adults: 3, lunch_children: 2 })]
    // 3*1000 + 2*700 = 4400
    expect(calcMealCost(days, pricing)).toBe(4400)
  })
})
