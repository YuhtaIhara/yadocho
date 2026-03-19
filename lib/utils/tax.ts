const TAX_START = '2026-06-01'
const TAX_PHASE2_START = '2029-06-01'
const TAX_RATE_PHASE1 = 3.5
const TAX_RATE_PHASE2 = 5.0
const TAX_EXEMPT_THRESHOLD = 6000

export type TaxResult = {
  taxable: boolean
  taxAmount: number
  ratePercent: number
  exemptReason: string | null
}

export function getTaxRate(checkinDate: string): number {
  if (checkinDate < TAX_START) return 0
  if (checkinDate >= TAX_PHASE2_START) return TAX_RATE_PHASE2
  return TAX_RATE_PHASE1
}

export function calcLodgingTax(
  pricePerPerson: number,
  adults: number,
  nights: number,
  checkinDate: string,
  taxExempt = false,
): TaxResult {
  const rate = getTaxRate(checkinDate)
  if (rate === 0) return { taxable: false, taxAmount: 0, ratePercent: 0, exemptReason: '未開始' }
  if (taxExempt) return { taxable: false, taxAmount: 0, ratePercent: rate, exemptReason: '免税指定' }
  if (pricePerPerson < TAX_EXEMPT_THRESHOLD) {
    return { taxable: false, taxAmount: 0, ratePercent: rate, exemptReason: '単価6千円未満' }
  }
  const taxAmount = Math.floor(pricePerPerson * adults * nights * rate / 100)
  return { taxable: true, taxAmount, ratePercent: rate, exemptReason: null }
}
