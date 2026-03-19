import type { MealDay, PricingConfig } from '@/lib/types'

export function calcMealCost(mealDays: MealDay[], pricing: PricingConfig | null | undefined) {
  const dp = pricing?.dinner_price ?? 2000
  const cdp = pricing?.child_dinner_price ?? 1500
  const bp = pricing?.breakfast_price ?? 800
  const cbp = pricing?.child_breakfast_price ?? 500
  const lp = pricing?.lunch_price ?? 0
  const clp = pricing?.child_lunch_price ?? 0

  let total = 0
  for (const md of mealDays) {
    total += md.dinner_adults * dp + md.dinner_children * cdp
    total += md.breakfast_adults * bp + md.breakfast_children * cbp
    total += md.lunch_adults * lp + md.lunch_children * clp
  }
  return total
}
