import type { TaxPeriod } from '@/lib/types'

export type TaxResult = {
  taxable: boolean
  taxAmount: number
  ratePercent: number
  exemptReason: string | null
}

/** チェックイン日に該当する税期間を検索 */
export function findTaxPeriod(
  periods: TaxPeriod[],
  checkinDate: string,
): TaxPeriod | null {
  // effective_from 降順でソート済みを想定（API が降順で返す）
  for (const p of periods) {
    if (checkinDate >= p.effective_from) {
      if (!p.effective_to || checkinDate < p.effective_to) {
        return p
      }
    }
  }
  return null
}

export function calcLodgingTax(
  pricePerPerson: number,
  adults: number,
  nights: number,
  checkinDate: string,
  taxExempt = false,
  periods: TaxPeriod[] = [],
): TaxResult {
  const period = findTaxPeriod(periods, checkinDate)

  if (!period) {
    return { taxable: false, taxAmount: 0, ratePercent: 0, exemptReason: null }
  }

  const rate = Number(period.rate_percent)
  const threshold = period.threshold

  if (taxExempt) {
    return { taxable: false, taxAmount: 0, ratePercent: rate, exemptReason: '免税指定' }
  }
  if (pricePerPerson < threshold) {
    return {
      taxable: false,
      taxAmount: 0,
      ratePercent: rate,
      exemptReason: `単価${Math.floor(threshold / 1000)}千円未満`,
    }
  }

  const taxAmount = Math.floor(pricePerPerson * adults * nights * rate / 100)
  return { taxable: true, taxAmount, ratePercent: rate, exemptReason: null }
}
