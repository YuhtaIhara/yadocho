import { describe, it, expect } from 'vitest'
import { buildMonthlyTaxData, type DailyTaxRow, type MonthlyTaxSummary } from '../tax-report'
import type { Reservation } from '@/lib/types'

// ── Helper: テスト用 Reservation 生成 ──

function makeReservation(
  overrides: Partial<Reservation> & { checkin: string; checkout: string },
): Reservation {
  return {
    id: `res-${Math.random().toString(36).slice(2, 8)}`,
    inn_id: 'test-inn',
    guest_id: 'test-guest',
    reservation_number: null,
    adults: 2,
    children: 0,
    adult_price: 8500,
    child_price: 0,
    pricing_plan_id: null,
    dinner_price: 0,
    child_dinner_price: 0,
    breakfast_price: 0,
    child_breakfast_price: 0,
    lunch_price: 0,
    child_lunch_price: 0,
    checkin_time: null,
    status: 'scheduled',
    tax_exempt: false,
    tax_exempt_reason: null,
    payment_method: null,
    payment_note: null,
    source: null,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// ── テスト定数 ──
const THRESHOLD = 6000
const RATE = 3.5 // 野沢温泉村 municipal rate

// =============================================================================
// 1. 基本ケース
// =============================================================================

describe('buildMonthlyTaxData — comprehensive', () => {
  // ── Empty ──

  describe('空の予約リスト', () => {
    it('全行・合計ともにゼロ', () => {
      const result = buildMonthlyTaxData([], 2026, 6, THRESHOLD, RATE)

      expect(result.daysInMonth).toBe(30)
      expect(result.rows).toHaveLength(30)
      for (const row of result.rows) {
        expect(row.taxableStays).toBe(0)
        expect(row.belowThresholdStays).toBe(0)
        expect(row.exemptStays).toBe(0)
        expect(row.taxableBase).toBe(0)
        expect(row.taxAmount).toBe(0)
      }
      expect(result.totals).toEqual({
        day: 0,
        taxableStays: 0,
        belowThresholdStays: 0,
        exemptStays: 0,
        taxableBase: 0,
        taxAmount: 0,
      })
    })
  })

  // ── Single taxable reservation ──

  describe('課税対象の単一予約', () => {
    it('閾値以上 → taxableStays, taxableBase, taxAmount が正しい', () => {
      const res = [
        makeReservation({
          checkin: '2026-06-10',
          checkout: '2026-06-11',
          adults: 2,
          adult_price: 8500,
        }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE)

      const day10 = result.rows[9]
      expect(day10.taxableStays).toBe(2) // 2 adults × 1 night
      expect(day10.belowThresholdStays).toBe(0)
      expect(day10.exemptStays).toBe(0)
      // rawBase = 8500 * 2 * 1 = 17000, floor(17000/100)*100 = 17000
      expect(day10.taxableBase).toBe(17000)
      // tax = floor(17000 * 3.5 / 100) = floor(595) = 595
      expect(day10.taxAmount).toBe(595)
    })
  })

  // ── Single exempt reservation ──

  describe('免税予約 (tax_exempt=true)', () => {
    it('exemptStays に計上、税額ゼロ', () => {
      const res = [
        makeReservation({
          checkin: '2026-06-10',
          checkout: '2026-06-12',
          adults: 3,
          adult_price: 9000,
          tax_exempt: true,
        }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE)

      const day10 = result.rows[9]
      expect(day10.exemptStays).toBe(6) // 3 adults × 2 nights
      expect(day10.taxableStays).toBe(0)
      expect(day10.belowThresholdStays).toBe(0)
      expect(day10.taxableBase).toBe(0)
      expect(day10.taxAmount).toBe(0)
    })
  })

  // ── Below threshold ──

  describe('免税点未満の予約', () => {
    it('adult_price < threshold → belowThresholdStays', () => {
      const res = [
        makeReservation({
          checkin: '2026-06-10',
          checkout: '2026-06-11',
          adults: 1,
          adult_price: 5000,
        }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE)

      const day10 = result.rows[9]
      expect(day10.belowThresholdStays).toBe(1)
      expect(day10.taxableStays).toBe(0)
      expect(day10.exemptStays).toBe(0)
      expect(day10.taxableBase).toBe(0)
      expect(day10.taxAmount).toBe(0)
    })
  })

  // ── Mix of all three categories on same day ──

  describe('同日に課税・免税・免税点未満の混在', () => {
    it('各カテゴリに正しく振り分けられる', () => {
      const res = [
        // taxable: 8500 ≥ 6000, not exempt
        makeReservation({
          checkin: '2026-06-15',
          checkout: '2026-06-16',
          adults: 2,
          adult_price: 8500,
        }),
        // below threshold: 4000 < 6000
        makeReservation({
          checkin: '2026-06-15',
          checkout: '2026-06-16',
          adults: 1,
          adult_price: 4000,
        }),
        // exempt
        makeReservation({
          checkin: '2026-06-15',
          checkout: '2026-06-17',
          adults: 4,
          adult_price: 10000,
          tax_exempt: true,
        }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE)

      const day15 = result.rows[14]
      expect(day15.taxableStays).toBe(2)        // 2×1
      expect(day15.belowThresholdStays).toBe(1)  // 1×1
      expect(day15.exemptStays).toBe(8)          // 4×2
      expect(day15.taxableBase).toBe(17000)      // 8500*2*1 → floor → 17000
      expect(day15.taxAmount).toBe(595)
    })
  })

  // ── Multi-night stay: personNights ──

  describe('複数泊の延べ人数', () => {
    it('adults=2, nights=3 → personNights = 6', () => {
      const res = [
        makeReservation({
          checkin: '2026-06-05',
          checkout: '2026-06-08', // 3 nights
          adults: 2,
          adult_price: 8500,
        }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE)

      const day5 = result.rows[4]
      expect(day5.taxableStays).toBe(6) // 2 × 3
      // rawBase = 8500 * 2 * 3 = 51000
      expect(day5.taxableBase).toBe(51000)
      expect(day5.taxAmount).toBe(Math.floor(51000 * 3.5 / 100)) // 1785
    })
  })

  // ── Children don't count for tax ──

  describe('子供は宿泊税の対象外', () => {
    it('children フィールドは personNights に含まれない', () => {
      const res = [
        makeReservation({
          checkin: '2026-06-10',
          checkout: '2026-06-12', // 2 nights
          adults: 2,
          children: 3,
          adult_price: 8500,
          child_price: 5000,
        }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE)

      const day10 = result.rows[9]
      // Only adults count: 2 × 2 = 4
      expect(day10.taxableStays).toBe(4)
      // taxableBase uses adult_price * adults * nights only
      expect(day10.taxableBase).toBe(Math.floor((8500 * 2 * 2) / 100) * 100) // 34000
    })
  })

  // ── Multiple reservations on same day accumulate ──

  describe('同日の複数予約が累積', () => {
    it('3件の予約がすべて同日 → 合算される', () => {
      const res = [
        makeReservation({ checkin: '2026-06-20', checkout: '2026-06-21', adults: 1, adult_price: 7000 }),
        makeReservation({ checkin: '2026-06-20', checkout: '2026-06-21', adults: 1, adult_price: 8000 }),
        makeReservation({ checkin: '2026-06-20', checkout: '2026-06-21', adults: 1, adult_price: 9000 }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE)

      const day20 = result.rows[19]
      expect(day20.taxableStays).toBe(3) // 1+1+1
      // rawBase = 7000+8000+9000 = 24000
      expect(day20.taxableBase).toBe(24000)
      expect(day20.taxAmount).toBe(Math.floor(24000 * 3.5 / 100)) // 840
    })
  })

  // ── Month boundary: only checkin month counts ──

  describe('月境界の処理', () => {
    it('チェックインが前月 → 当月の集計に含まれない', () => {
      const res = [
        makeReservation({
          checkin: '2026-05-31',
          checkout: '2026-06-03', // spans into June
          adults: 2,
          adult_price: 8500,
        }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE)

      expect(result.totals.taxableStays).toBe(0)
      expect(result.totals.taxableBase).toBe(0)
    })

    it('チェックインが翌月 → 当月の集計に含まれない', () => {
      const res = [
        makeReservation({
          checkin: '2026-07-01',
          checkout: '2026-07-02',
          adults: 2,
          adult_price: 8500,
        }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE)

      expect(result.totals.taxableStays).toBe(0)
    })

    it('チェックアウトが翌月にまたがっても、チェックイン月に全泊数計上', () => {
      const res = [
        makeReservation({
          checkin: '2026-06-29',
          checkout: '2026-07-02', // 3 nights, crosses month
          adults: 1,
          adult_price: 8500,
        }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE)

      const day29 = result.rows[28]
      expect(day29.taxableStays).toBe(3) // 1 adult × 3 nights
      expect(day29.taxableBase).toBe(Math.floor((8500 * 1 * 3) / 100) * 100) // 25500
    })
  })

  // ── Totals row matches sum of daily rows ──

  describe('合計行の整合性', () => {
    it('totals は全日の rows の合計と一致する', () => {
      const res = [
        makeReservation({ checkin: '2026-06-01', checkout: '2026-06-03', adults: 2, adult_price: 8500 }),
        makeReservation({ checkin: '2026-06-10', checkout: '2026-06-11', adults: 1, adult_price: 5000 }),
        makeReservation({ checkin: '2026-06-15', checkout: '2026-06-16', adults: 1, adult_price: 10000, tax_exempt: true }),
        makeReservation({ checkin: '2026-06-20', checkout: '2026-06-22', adults: 3, adult_price: 7000 }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE)

      const summed = result.rows.reduce(
        (acc, r) => ({
          taxableStays: acc.taxableStays + r.taxableStays,
          belowThresholdStays: acc.belowThresholdStays + r.belowThresholdStays,
          exemptStays: acc.exemptStays + r.exemptStays,
          taxableBase: acc.taxableBase + r.taxableBase,
          taxAmount: acc.taxAmount + r.taxAmount,
        }),
        { taxableStays: 0, belowThresholdStays: 0, exemptStays: 0, taxableBase: 0, taxAmount: 0 },
      )

      expect(result.totals.taxableStays).toBe(summed.taxableStays)
      expect(result.totals.belowThresholdStays).toBe(summed.belowThresholdStays)
      expect(result.totals.exemptStays).toBe(summed.exemptStays)
      expect(result.totals.taxableBase).toBe(summed.taxableBase)
      expect(result.totals.taxAmount).toBe(summed.taxAmount)
    })
  })

  // ── effectiveFrom parameter ──

  describe('effectiveFrom パラメータ', () => {
    it('施行前の月（全体が effectiveFrom 以前）→ 全て exempt、税額ゼロ', () => {
      const res = [
        makeReservation({
          checkin: '2026-05-10',
          checkout: '2026-05-11',
          adults: 2,
          adult_price: 8500,
        }),
      ]
      // effectiveFrom = 2026-06-01, querying May 2026
      const result = buildMonthlyTaxData(res, 2026, 5, THRESHOLD, RATE, '2026-06-01')

      const day10 = result.rows[9]
      expect(day10.exemptStays).toBe(2) // treated as exempt before effective
      expect(day10.taxableStays).toBe(0)
      expect(day10.taxableBase).toBe(0)
      expect(day10.taxAmount).toBe(0)
      expect(result.totals.taxAmount).toBe(0)
    })

    it('施行後の月 → 通常通り課税', () => {
      const res = [
        makeReservation({
          checkin: '2026-07-10',
          checkout: '2026-07-11',
          adults: 2,
          adult_price: 8500,
        }),
      ]
      // effectiveFrom = 2026-06-01, querying July 2026
      const result = buildMonthlyTaxData(res, 2026, 7, THRESHOLD, RATE, '2026-06-01')

      const day10 = result.rows[9]
      expect(day10.taxableStays).toBe(2)
      expect(day10.taxableBase).toBe(17000)
      expect(day10.taxAmount).toBe(595)
    })

    it('施行日を含む月 → 施行前チェックインは exempt、施行後チェックインは課税', () => {
      const res = [
        // Before effective date
        makeReservation({
          checkin: '2026-06-10',
          checkout: '2026-06-11',
          adults: 2,
          adult_price: 8500,
        }),
        // On effective date
        makeReservation({
          checkin: '2026-06-15',
          checkout: '2026-06-16',
          adults: 1,
          adult_price: 8500,
        }),
        // After effective date
        makeReservation({
          checkin: '2026-06-20',
          checkout: '2026-06-21',
          adults: 1,
          adult_price: 8500,
        }),
      ]
      // effectiveFrom = 2026-06-15
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE, '2026-06-15')

      // 6/10: before effective → exempt
      const day10 = result.rows[9]
      expect(day10.exemptStays).toBe(2)
      expect(day10.taxableStays).toBe(0)
      expect(day10.taxAmount).toBe(0)

      // 6/15: on effective date → taxable (checkinDate >= effectiveFrom)
      const day15 = result.rows[14]
      expect(day15.taxableStays).toBe(1)
      expect(day15.taxableBase).toBe(8500)
      expect(day15.taxAmount).toBe(Math.floor(8500 * 3.5 / 100)) // 297

      // 6/20: after effective → taxable
      const day20 = result.rows[19]
      expect(day20.taxableStays).toBe(1)
      expect(day20.taxAmount).toBe(297)
    })

    it('effectiveFrom 未指定 → 全て通常課税', () => {
      const res = [
        makeReservation({
          checkin: '2026-06-10',
          checkout: '2026-06-11',
          adults: 2,
          adult_price: 8500,
        }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE)

      expect(result.rows[9].taxableStays).toBe(2)
      expect(result.rows[9].taxAmount).toBe(595)
    })

    it('effectiveFrom が月末の場合 → その日のチェックインのみ課税', () => {
      const res = [
        makeReservation({
          checkin: '2026-06-29',
          checkout: '2026-06-30',
          adults: 1,
          adult_price: 8500,
        }),
        makeReservation({
          checkin: '2026-06-30',
          checkout: '2026-07-01',
          adults: 1,
          adult_price: 8500,
        }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE, '2026-06-30')

      // 6/29: before effective → exempt
      expect(result.rows[28].exemptStays).toBe(1)
      expect(result.rows[28].taxableStays).toBe(0)

      // 6/30: on effective → taxable
      expect(result.rows[29].taxableStays).toBe(1)
      expect(result.rows[29].taxAmount).toBe(297)
    })

    it('月全体が effectiveFrom 以前 → taxActive=false で taxAmount 全ゼロ', () => {
      // monthEnd = 2026-05-31, effectiveFrom = 2026-06-01
      // taxActive = !effectiveFrom || monthEnd >= effectiveFrom
      // "2026-05-31" >= "2026-06-01" → false → taxActive = false
      const res = [
        makeReservation({
          checkin: '2026-05-15',
          checkout: '2026-05-16',
          adults: 2,
          adult_price: 8500,
        }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 5, THRESHOLD, RATE, '2026-06-01')

      // All reservations should be exempt (before effective)
      expect(result.rows[14].exemptStays).toBe(2)
      // taxActive is false → even if taxableBase were set, taxAmount = 0
      expect(result.totals.taxAmount).toBe(0)
    })
  })

  // ── Days in month ──

  describe('月の日数', () => {
    it('31日の月 → 31行', () => {
      const result = buildMonthlyTaxData([], 2026, 1, THRESHOLD, RATE) // January
      expect(result.daysInMonth).toBe(31)
      expect(result.rows).toHaveLength(31)
      expect(result.rows[30].day).toBe(31)
    })

    it('30日の月 → 30行', () => {
      const result = buildMonthlyTaxData([], 2026, 4, THRESHOLD, RATE) // April
      expect(result.daysInMonth).toBe(30)
      expect(result.rows).toHaveLength(30)
    })

    it('28日の月（平年2月）→ 28行', () => {
      const result = buildMonthlyTaxData([], 2026, 2, THRESHOLD, RATE)
      expect(result.daysInMonth).toBe(28)
      expect(result.rows).toHaveLength(28)
    })

    it('29日の月（閏年2月）→ 29行', () => {
      const result = buildMonthlyTaxData([], 2028, 2, THRESHOLD, RATE)
      expect(result.daysInMonth).toBe(29)
      expect(result.rows).toHaveLength(29)
    })

    it('各行の day が 1 から daysInMonth まで連番', () => {
      const result = buildMonthlyTaxData([], 2026, 3, THRESHOLD, RATE) // March
      for (let i = 0; i < result.rows.length; i++) {
        expect(result.rows[i].day).toBe(i + 1)
      }
    })
  })

  // ── Rounding: taxableBase floors to 100 yen ──

  describe('端数処理: 課税標準額（100円未満切捨て）', () => {
    it('8550 × 1 × 1 = 8550 → 8500', () => {
      const res = [
        makeReservation({ checkin: '2026-06-10', checkout: '2026-06-11', adults: 1, adult_price: 8550 }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE)
      expect(result.rows[9].taxableBase).toBe(8500)
    })

    it('8599 × 1 × 1 = 8599 → 8500', () => {
      const res = [
        makeReservation({ checkin: '2026-06-10', checkout: '2026-06-11', adults: 1, adult_price: 8599 }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE)
      expect(result.rows[9].taxableBase).toBe(8500)
    })

    it('8600 × 1 × 1 = 8600 → 8600（切捨て不要）', () => {
      const res = [
        makeReservation({ checkin: '2026-06-10', checkout: '2026-06-11', adults: 1, adult_price: 8600 }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE)
      expect(result.rows[9].taxableBase).toBe(8600)
    })

    it('同日2件合算後に100円未満切捨て', () => {
      // 6050 + 6050 = 12100 → floor(12100/100)*100 = 12100
      const res = [
        makeReservation({ checkin: '2026-06-10', checkout: '2026-06-11', adults: 1, adult_price: 6050 }),
        makeReservation({ checkin: '2026-06-10', checkout: '2026-06-11', adults: 1, adult_price: 6050 }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE)
      expect(result.rows[9].taxableBase).toBe(12100)
    })

    it('同日2件合算で端数が出るケース', () => {
      // 6051 + 6051 = 12102 → floor(12102/100)*100 = 12100
      const res = [
        makeReservation({ checkin: '2026-06-10', checkout: '2026-06-11', adults: 1, adult_price: 6051 }),
        makeReservation({ checkin: '2026-06-10', checkout: '2026-06-11', adults: 1, adult_price: 6051 }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE)
      expect(result.rows[9].taxableBase).toBe(12100)
    })
  })

  // ── Rounding: tax amount floors to 1 yen ──

  describe('端数処理: 税額（1円未満切捨て）', () => {
    it('8500 * 3.5% = 297.5 → 297', () => {
      const res = [
        makeReservation({ checkin: '2026-06-10', checkout: '2026-06-11', adults: 1, adult_price: 8571 }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE)
      // taxableBase = floor(8571/100)*100 = 8500
      // taxAmount = floor(8500 * 3.5 / 100) = floor(297.5) = 297
      expect(result.rows[9].taxableBase).toBe(8500)
      expect(result.rows[9].taxAmount).toBe(297)
    })

    it('17000 * 3.5% = 595.0 → 595（端数なし）', () => {
      const res = [
        makeReservation({ checkin: '2026-06-10', checkout: '2026-06-11', adults: 2, adult_price: 8500 }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE)
      expect(result.rows[9].taxAmount).toBe(595)
    })

    it('6100 * 3.5% = 213.5 → 213', () => {
      const res = [
        makeReservation({ checkin: '2026-06-10', checkout: '2026-06-11', adults: 1, adult_price: 6100 }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE)
      // taxableBase = 6100
      // taxAmount = floor(6100 * 3.5 / 100) = floor(213.5) = 213
      expect(result.rows[9].taxAmount).toBe(213)
    })
  })

  // ── Edge cases ──

  describe('エッジケース', () => {
    it('checkout == checkin (0泊) → スキップ', () => {
      const res = [
        makeReservation({ checkin: '2026-06-10', checkout: '2026-06-10', adults: 2, adult_price: 8500 }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE)
      expect(result.totals.taxableStays).toBe(0)
    })

    it('checkout < checkin (負の泊数) → スキップ', () => {
      const res = [
        makeReservation({ checkin: '2026-06-10', checkout: '2026-06-08', adults: 2, adult_price: 8500 }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE)
      expect(result.totals.taxableStays).toBe(0)
    })

    it('adults=0 → 0人泊', () => {
      const res = [
        makeReservation({ checkin: '2026-06-10', checkout: '2026-06-11', adults: 0, adult_price: 8500 }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE)
      expect(result.rows[9].taxableStays).toBe(0)
      expect(result.rows[9].taxableBase).toBe(0)
    })

    it('閾値ちょうど → 課税対象', () => {
      const res = [
        makeReservation({ checkin: '2026-06-10', checkout: '2026-06-11', adults: 1, adult_price: 6000 }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE)
      expect(result.rows[9].taxableStays).toBe(1)
      expect(result.rows[9].belowThresholdStays).toBe(0)
    })

    it('閾値1円下 → 免税点未満', () => {
      const res = [
        makeReservation({ checkin: '2026-06-10', checkout: '2026-06-11', adults: 1, adult_price: 5999 }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE)
      expect(result.rows[9].belowThresholdStays).toBe(1)
      expect(result.rows[9].taxableStays).toBe(0)
    })

    it('月初1日チェックイン → rows[0] に計上', () => {
      const res = [
        makeReservation({ checkin: '2026-06-01', checkout: '2026-06-02', adults: 1, adult_price: 8500 }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE)
      expect(result.rows[0].taxableStays).toBe(1)
    })

    it('月末最終日チェックイン → 最終行に計上', () => {
      const res = [
        makeReservation({ checkin: '2026-06-30', checkout: '2026-07-01', adults: 1, adult_price: 8500 }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE)
      expect(result.rows[29].taxableStays).toBe(1) // June has 30 days, index 29
    })

    it('return の year / month が入力と一致', () => {
      const result = buildMonthlyTaxData([], 2026, 11, THRESHOLD, RATE)
      expect(result.year).toBe(2026)
      expect(result.month).toBe(11)
    })

    it('totals.day は常に 0', () => {
      const res = [
        makeReservation({ checkin: '2026-06-10', checkout: '2026-06-11', adults: 2, adult_price: 8500 }),
      ]
      const result = buildMonthlyTaxData(res, 2026, 6, THRESHOLD, RATE)
      expect(result.totals.day).toBe(0)
    })
  })
})
