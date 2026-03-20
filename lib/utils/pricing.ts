import type { MealDay, PricingConfig } from '@/lib/types'

/** 食事単価のデフォルト値（pricing_config 未設定時） */
export const MEAL_DEFAULTS = {
  dinner_price: 2000,
  child_dinner_price: 1500,
  breakfast_price: 800,
  child_breakfast_price: 500,
  lunch_price: 0,
  child_lunch_price: 0,
} as const

/** pricing_config からフォールバック付きで食事単価を取得 */
export function getMealPrices(pricing: PricingConfig | null | undefined) {
  return {
    dp: pricing?.dinner_price ?? MEAL_DEFAULTS.dinner_price,
    cdp: pricing?.child_dinner_price ?? MEAL_DEFAULTS.child_dinner_price,
    bp: pricing?.breakfast_price ?? MEAL_DEFAULTS.breakfast_price,
    cbp: pricing?.child_breakfast_price ?? MEAL_DEFAULTS.child_breakfast_price,
    lp: pricing?.lunch_price ?? MEAL_DEFAULTS.lunch_price,
    clp: pricing?.child_lunch_price ?? MEAL_DEFAULTS.child_lunch_price,
  }
}

export function calcMealCost(mealDays: MealDay[], pricing: PricingConfig | null | undefined) {
  const { dp, cdp, bp, cbp, lp, clp } = getMealPrices(pricing)

  let total = 0
  for (const md of mealDays) {
    total += md.dinner_adults * dp + md.dinner_children * cdp
    total += md.breakfast_adults * bp + md.breakfast_children * cbp
    total += md.lunch_adults * lp + md.lunch_children * clp
  }
  return total
}
