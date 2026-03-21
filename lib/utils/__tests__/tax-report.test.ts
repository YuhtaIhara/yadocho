import { describe, it, expect } from 'vitest'
import { buildMonthlyTaxData, type DailyTaxRow, type MonthlyTaxSummary } from '../tax-report'
import type { Reservation } from '@/lib/types'

// ── Helper: テスト用 Reservation 生成 ──

function makeRes(overrides: Partial<Reservation> & { checkin: string; checkout: string }): Reservation {
  return {
    id: `res-${Math.random().toString(36).slice(2, 8)}`,
    inn_id: 'test-inn',
    guest_id: 'test-guest',
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
    reservation_number: null,
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
const RATE = 3.5 // 野沢温泉村

// =============================================================================
// テストケース
// =============================================================================

describe('buildMonthlyTaxData', () => {
  describe('基本集計', () => {
    it('異なる日の予約3件 → 日別行と合計が正しい', () => {
      const reservations = [
        makeRes({ checkin: '2026-06-05', checkout: '2026-06-07', adults: 2, adult_price: 8500 }),
        makeRes({ checkin: '2026-06-10', checkout: '2026-06-11', adults: 1, adult_price: 10000 }),
        makeRes({ checkin: '2026-06-20', checkout: '2026-06-22', adults: 3, adult_price: 7000 }),
      ]

      const result = buildMonthlyTaxData(reservations, 2026, 6, THRESHOLD, RATE)

      expect(result.year).toBe(2026)
      expect(result.month).toBe(6)
      expect(result.daysInMonth).toBe(30)
      expect(result.rows).toHaveLength(30)

      // 6/5: 2人 × 2泊 = 4人泊
      const day5 = result.rows[4]
      expect(day5.taxableStays).toBe(4) // 2 adults × 2 nights
      expect(day5.taxableBase).toBe(Math.floor((8500 * 2 * 2) / 100) * 100) // 34000 → 34000
      expect(day5.taxAmount).toBe(Math.floor(34000 * 3.5 / 100)) // 1190

      // 6/10: 1人 × 1泊 = 1人泊
      const day10 = result.rows[9]
      expect(day10.taxableStays).toBe(1)
      expect(day10.taxableBase).toBe(10000) // floor(10000/100)*100
      expect(day10.taxAmount).toBe(350) // floor(10000*3.5/100)

      // 6/20: 3人 × 2泊 = 6人泊
      const day20 = result.rows[19]
      expect(day20.taxableStays).toBe(6)
      expect(day20.taxableBase).toBe(Math.floor((7000 * 3 * 2) / 100) * 100) // 42000
      expect(day20.taxAmount).toBe(Math.floor(42000 * 3.5 / 100)) // 1470

      // 合計
      expect(result.totals.taxableStays).toBe(4 + 1 + 6)
      expect(result.totals.taxableBase).toBe(34000 + 10000 + 42000)
      expect(result.totals.taxAmount).toBe(1190 + 350 + 1470)
    })

    it('空月 → 全行ゼロ、合計もゼロ', () => {
      const result = buildMonthlyTaxData([], 2026, 6, THRESHOLD, RATE)

      expect(result.daysInMonth).toBe(30)
      expect(result.rows.every(r => r.taxableStays === 0 && r.taxAmount === 0)).toBe(true)
      expect(result.totals.taxableStays).toBe(0)
      expect(result.totals.taxableBase).toBe(0)
      expect(result.totals.taxAmount).toBe(0)
    })

    it('1泊予約 → personNights = adults × 1', () => {
      const reservations = [
        makeRes({ checkin: '2026-06-15', checkout: '2026-06-16', adults: 2, adult_price: 8500 }),
      ]
      const result = buildMonthlyTaxData(reservations, 2026, 6, THRESHOLD, RATE)

      const day15 = result.rows[14]
      expect(day15.taxableStays).toBe(2) // 2 adults × 1 night
    })
  })

  describe('免税・免税点処理', () => {
    it('tax_exempt=true → exemptStays に計上、課税対象外', () => {
      const reservations = [
        makeRes({ checkin: '2026-06-10', checkout: '2026-06-12', adults: 2, adult_price: 8500, tax_exempt: true }),
      ]
      const result = buildMonthlyTaxData(reservations, 2026, 6, THRESHOLD, RATE)

      const day10 = result.rows[9]
      expect(day10.exemptStays).toBe(4) // 2 adults × 2 nights
      expect(day10.taxableStays).toBe(0)
      expect(day10.taxableBase).toBe(0)
      expect(day10.taxAmount).toBe(0)
    })

    it('免税点未満（adult_price < 6000）→ belowThresholdStays に計上', () => {
      const reservations = [
        makeRes({ checkin: '2026-06-10', checkout: '2026-06-11', adults: 1, adult_price: 5000 }),
      ]
      const result = buildMonthlyTaxData(reservations, 2026, 6, THRESHOLD, RATE)

      const day10 = result.rows[9]
      expect(day10.belowThresholdStays).toBe(1)
      expect(day10.taxableStays).toBe(0)
      expect(day10.taxableBase).toBe(0)
    })

    it('免税点ちょうど（6000円）→ 課税対象', () => {
      const reservations = [
        makeRes({ checkin: '2026-06-10', checkout: '2026-06-11', adults: 1, adult_price: 6000 }),
      ]
      const result = buildMonthlyTaxData(reservations, 2026, 6, THRESHOLD, RATE)

      const day10 = result.rows[9]
      expect(day10.taxableStays).toBe(1)
      expect(day10.belowThresholdStays).toBe(0)
    })

    it('免税点1円下（5999円）→ 免税', () => {
      const reservations = [
        makeRes({ checkin: '2026-06-10', checkout: '2026-06-11', adults: 1, adult_price: 5999 }),
      ]
      const result = buildMonthlyTaxData(reservations, 2026, 6, THRESHOLD, RATE)

      const day10 = result.rows[9]
      expect(day10.belowThresholdStays).toBe(1)
      expect(day10.taxableStays).toBe(0)
    })
  })

  describe('複数予約の集計', () => {
    it('同日に2件の予約 → 値が累積する', () => {
      const reservations = [
        makeRes({ checkin: '2026-06-15', checkout: '2026-06-16', adults: 2, adult_price: 8500 }),
        makeRes({ checkin: '2026-06-15', checkout: '2026-06-17', adults: 1, adult_price: 10000 }),
      ]
      const result = buildMonthlyTaxData(reservations, 2026, 6, THRESHOLD, RATE)

      const day15 = result.rows[14]
      // 予約1: 2人×1泊=2人泊, 予約2: 1人×2泊=2人泊
      expect(day15.taxableStays).toBe(2 + 2)
      // rawBase: 8500*2*1 + 10000*1*2 = 17000+20000 = 37000
      // taxableBase: floor(37000/100)*100 = 37000
      expect(day15.taxableBase).toBe(37000)
    })

    it('課税+免税+免税点未満が同日に混在', () => {
      const reservations = [
        makeRes({ checkin: '2026-06-15', checkout: '2026-06-16', adults: 2, adult_price: 8500 }),
        makeRes({ checkin: '2026-06-15', checkout: '2026-06-16', adults: 1, adult_price: 5000 }),
        makeRes({ checkin: '2026-06-15', checkout: '2026-06-16', adults: 3, adult_price: 9000, tax_exempt: true }),
      ]
      const result = buildMonthlyTaxData(reservations, 2026, 6, THRESHOLD, RATE)

      const day15 = result.rows[14]
      expect(day15.taxableStays).toBe(2)         // 8500円×2人
      expect(day15.belowThresholdStays).toBe(1)   // 5000円×1人
      expect(day15.exemptStays).toBe(3)           // 免税×3人
    })
  })

  describe('月・日数の処理', () => {
    it('2月（28日）→ rows は28要素', () => {
      const result = buildMonthlyTaxData([], 2026, 2, THRESHOLD, RATE)

      expect(result.daysInMonth).toBe(28)
      expect(result.rows).toHaveLength(28)
    })

    it('閏年2月（29日）→ rows は29要素', () => {
      // 2028年は閏年
      const result = buildMonthlyTaxData([], 2028, 2, THRESHOLD, RATE)

      expect(result.daysInMonth).toBe(29)
      expect(result.rows).toHaveLength(29)
    })

    it('31日の月 → rows は31要素', () => {
      const result = buildMonthlyTaxData([], 2026, 7, THRESHOLD, RATE)

      expect(result.daysInMonth).toBe(31)
      expect(result.rows).toHaveLength(31)
    })

    it('チェックイン日が別月の予約は除外される', () => {
      const reservations = [
        makeRes({ checkin: '2026-05-31', checkout: '2026-06-02', adults: 2, adult_price: 8500 }),
        makeRes({ checkin: '2026-07-01', checkout: '2026-07-02', adults: 1, adult_price: 10000 }),
      ]
      const result = buildMonthlyTaxData(reservations, 2026, 6, THRESHOLD, RATE)

      // どちらも6月のチェックインではないので全てゼロ
      expect(result.totals.taxableStays).toBe(0)
      expect(result.totals.taxableBase).toBe(0)
    })
  })

  describe('端数処理', () => {
    it('課税標準額: 100円未満切捨てが日単位で適用される', () => {
      // 8550円 × 1人 × 1泊 = 8550 → floor(8550/100)*100 = 8500
      const reservations = [
        makeRes({ checkin: '2026-06-10', checkout: '2026-06-11', adults: 1, adult_price: 8550 }),
      ]
      const result = buildMonthlyTaxData(reservations, 2026, 6, THRESHOLD, RATE)

      const day10 = result.rows[9]
      expect(day10.taxableBase).toBe(8500) // 100円未満切捨
      expect(day10.taxAmount).toBe(Math.floor(8500 * 3.5 / 100)) // 297
    })

    it('複数予約の合算後に100円未満切捨て（日単位で1回）', () => {
      // 予約1: 8550 × 1人 × 1泊 = 8550
      // 予約2: 8550 × 1人 × 1泊 = 8550
      // 合計rawBase = 17100 → floor(17100/100)*100 = 17100（100で割り切れる）
      const reservations = [
        makeRes({ checkin: '2026-06-10', checkout: '2026-06-11', adults: 1, adult_price: 8550 }),
        makeRes({ checkin: '2026-06-10', checkout: '2026-06-11', adults: 1, adult_price: 8550 }),
      ]
      const result = buildMonthlyTaxData(reservations, 2026, 6, THRESHOLD, RATE)

      const day10 = result.rows[9]
      expect(day10.taxableBase).toBe(17100) // rawBase を合算後にfloor → 17100
    })

    it('端数が発生するケース: 8571円の端数処理', () => {
      // 8571 × 1人 × 1泊 = 8571 → floor(8571/100)*100 = 8500
      // 税額: floor(8500 * 3.5 / 100) = floor(297.5) = 297
      const reservations = [
        makeRes({ checkin: '2026-06-10', checkout: '2026-06-11', adults: 1, adult_price: 8571 }),
      ]
      const result = buildMonthlyTaxData(reservations, 2026, 6, THRESHOLD, RATE)

      const day10 = result.rows[9]
      expect(day10.taxableBase).toBe(8500)
      expect(day10.taxAmount).toBe(297)
    })
  })

  describe('公式計算例の検証', () => {
    it('野沢温泉: 8,500円 × 2名 × 1泊 → 標準額34,000円、税額1,190円', () => {
      // 公式月計表の計算ルール:
      // 課税標準額 = adult_price × adults × nights → 100円未満切捨て
      // 宿泊税額 = 課税標準額 × 3.5% → 1円未満切捨て
      const reservations = [
        makeRes({ checkin: '2026-06-15', checkout: '2026-06-16', adults: 2, adult_price: 8500 }),
      ]
      const result = buildMonthlyTaxData(reservations, 2026, 6, THRESHOLD, RATE)

      const day15 = result.rows[14]
      expect(day15.taxableStays).toBe(2)
      expect(day15.taxableBase).toBe(17000) // 8500*2*1 → floor/100*100=17000
      expect(day15.taxAmount).toBe(595) // floor(17000*3.5/100)=595
    })

    it('チェックイン日の合計で月計表の合計行を検証', () => {
      // 6月に3件の予約
      const reservations = [
        makeRes({ checkin: '2026-06-01', checkout: '2026-06-02', adults: 2, adult_price: 8500 }),
        makeRes({ checkin: '2026-06-15', checkout: '2026-06-17', adults: 1, adult_price: 12000 }),
        makeRes({ checkin: '2026-06-28', checkout: '2026-06-30', adults: 3, adult_price: 7500 }),
      ]
      const result = buildMonthlyTaxData(reservations, 2026, 6, THRESHOLD, RATE)

      // 6/1: 2×1=2人泊, base=17000, tax=595
      // 6/15: 1×2=2人泊, base=floor(24000/100)*100=24000, tax=floor(24000*3.5/100)=840
      // 6/28: 3×2=6人泊, base=floor(45000/100)*100=45000, tax=floor(45000*3.5/100)=1575
      expect(result.totals.taxableStays).toBe(2 + 2 + 6)
      expect(result.totals.taxableBase).toBe(17000 + 24000 + 45000)
      expect(result.totals.taxAmount).toBe(595 + 840 + 1575)
    })
  })

  describe('不正データの耐性', () => {
    it('checkout <= checkin の予約はスキップ（0泊以下）', () => {
      const reservations = [
        makeRes({ checkin: '2026-06-15', checkout: '2026-06-15', adults: 2, adult_price: 8500 }),
        makeRes({ checkin: '2026-06-15', checkout: '2026-06-14', adults: 2, adult_price: 8500 }),
      ]
      const result = buildMonthlyTaxData(reservations, 2026, 6, THRESHOLD, RATE)

      expect(result.totals.taxableStays).toBe(0)
    })

    it('adults=0 の予約 → 0人泊として集計（値は0）', () => {
      const reservations = [
        makeRes({ checkin: '2026-06-10', checkout: '2026-06-11', adults: 0, adult_price: 8500 }),
      ]
      const result = buildMonthlyTaxData(reservations, 2026, 6, THRESHOLD, RATE)

      const day10 = result.rows[9]
      expect(day10.taxableStays).toBe(0)
      expect(day10.taxableBase).toBe(0)
    })
  })
})
