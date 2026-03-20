import type { Reservation } from '@/lib/types'
import { differenceInCalendarDays, parseISO, addDays } from 'date-fns'

/**
 * 税申告書・月計表の日別集計データ
 */
export type DailyTaxRow = {
  day: number
  /** 課税対象の宿泊延べ人数（1人1泊6000円以上 AND 免税でない） */
  taxableStays: number
  /** 1人1泊6000円未満の人泊数 */
  belowThresholdStays: number
  /** 課税免除の人泊数（修学旅行・外交等） */
  exemptStays: number
  /** 課税標準額（素泊まり料金合計、100円未満切捨て） */
  taxableBase: number
  /** 宿泊税額（課税標準額 × 税率、1円未満切捨て） */
  taxAmount: number
}

export type MonthlyTaxSummary = {
  year: number
  month: number
  daysInMonth: number
  rows: DailyTaxRow[]
  totals: DailyTaxRow
}

/**
 * 予約データから日別の税集計を生成
 *
 * 集計ルール:
 * - 「日」はチェックイン日基準（その日にチェックインした予約を集計）
 * - 宿泊延べ人数 = adults × nights（子供は現仕様では除外）
 * - 課税標準額 = adult_price × adults × nights（100円未満切捨て）
 * - 宿泊税額 = 課税標準額 × 税率（1円未満切捨て）
 *
 * NOTE: 野沢温泉村の月計表は日別に記入する形式だが、
 * 「日」の定義がチェックイン日なのか宿泊日なのかは要確認（N1）。
 * 暫定: チェックイン日で集計。
 */
export function buildMonthlyTaxData(
  reservations: Reservation[],
  year: number,
  month: number,
  threshold: number,
  municipalRatePercent: number,
): MonthlyTaxSummary {
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const daysInMonth = lastDay.getDate()

  // Initialize rows for each day
  const rows: DailyTaxRow[] = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    taxableStays: 0,
    belowThresholdStays: 0,
    exemptStays: 0,
    taxableBase: 0,
    taxAmount: 0,
  }))

  for (const res of reservations) {
    const checkin = parseISO(res.checkin)
    const checkout = parseISO(res.checkout)
    const nights = differenceInCalendarDays(checkout, checkin)
    if (nights <= 0) continue

    // チェックイン日がこの月に含まれるかチェック
    if (checkin.getFullYear() !== year || checkin.getMonth() !== month - 1) continue

    const day = checkin.getDate()
    const row = rows[day - 1]
    if (!row) continue

    const personNights = res.adults * nights

    if (res.tax_exempt) {
      // 免税
      row.exemptStays += personNights
    } else if (res.adult_price < threshold) {
      // 免税点未満
      row.belowThresholdStays += personNights
    } else {
      // 課税対象
      row.taxableStays += personNights
      const rawBase = res.adult_price * res.adults * nights
      row.taxableBase += rawBase
    }
  }

  // 課税標準額を100円未満切捨て、税額を計算
  for (const row of rows) {
    row.taxableBase = Math.floor(row.taxableBase / 100) * 100
    row.taxAmount = Math.floor(row.taxableBase * municipalRatePercent / 100)
  }

  // 合計行
  const totals: DailyTaxRow = {
    day: 0,
    taxableStays: rows.reduce((s, r) => s + r.taxableStays, 0),
    belowThresholdStays: rows.reduce((s, r) => s + r.belowThresholdStays, 0),
    exemptStays: rows.reduce((s, r) => s + r.exemptStays, 0),
    taxableBase: rows.reduce((s, r) => s + r.taxableBase, 0),
    taxAmount: rows.reduce((s, r) => s + r.taxAmount, 0),
  }

  return { year, month, daysInMonth, rows, totals }
}
