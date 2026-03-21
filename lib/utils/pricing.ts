import type { MealDay, PricingConfig } from '@/lib/types'

/** 食事単価のデフォルト値（未設定時） */
export const MEAL_DEFAULTS = {
  dinner_price: 2000,
  child_dinner_price: 1500,
  breakfast_price: 800,
  child_breakfast_price: 500,
  lunch_price: 0,
  child_lunch_price: 0,
} as const

/** 食事単価を持つオブジェクトから取得（PricingConfig, Reservation, PricingPlan いずれも可） */
type MealPriceSource = Pick<PricingConfig, 'dinner_price' | 'child_dinner_price' | 'breakfast_price' | 'child_breakfast_price' | 'lunch_price' | 'child_lunch_price'>

export function getMealPrices(source: MealPriceSource | null | undefined) {
  return {
    dp: source?.dinner_price ?? MEAL_DEFAULTS.dinner_price,
    cdp: source?.child_dinner_price ?? MEAL_DEFAULTS.child_dinner_price,
    bp: source?.breakfast_price ?? MEAL_DEFAULTS.breakfast_price,
    cbp: source?.child_breakfast_price ?? MEAL_DEFAULTS.child_breakfast_price,
    lp: source?.lunch_price ?? MEAL_DEFAULTS.lunch_price,
    clp: source?.child_lunch_price ?? MEAL_DEFAULTS.child_lunch_price,
  }
}

export function calcMealCost(mealDays: MealDay[], pricing: MealPriceSource | null | undefined) {
  const { dp, cdp, bp, cbp, lp, clp } = getMealPrices(pricing)

  let total = 0
  for (const md of mealDays) {
    total += md.dinner_adults * dp + md.dinner_children * cdp
    total += md.breakfast_adults * bp + md.breakfast_children * cbp
    total += md.lunch_adults * lp + md.lunch_children * clp
  }
  return total
}
