import { describe, it, expect } from 'vitest'
import { calcAllTaxes, sumTaxResults } from '../tax'
import type { TaxRule, TaxRuleRate } from '@/lib/types'

// ── Helper: テスト用の税ルール/レート生成 ──

function makeRule(overrides: Partial<TaxRule> & { id: string }): TaxRule {
  return {
    inn_id: 'test-inn',
    tax_name: '宿泊税',
    tax_type: 'municipal',
    calc_method: 'flat',
    effective_from: '2026-06-01',
    effective_to: null,
    threshold: 0,
    exempt_school_trips: true,
    rounding_unit: 1,
    inclusive_pref_tax_rule_id: null,
    notes: null,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeRate(overrides: Partial<TaxRuleRate> & { id: string; tax_rule_id: string }): TaxRuleRate {
  return {
    bracket_min: 0,
    bracket_max: null,
    rate_percent: null,
    flat_amount: null,
    ...overrides,
  }
}

// ══════════════════════════════════════════════════════════════
// 野沢温泉村 税データ（県税込み inclusive_percentage 方式）
// 3年間: 3.5%（県税100円を含む）
// ══════════════════════════════════════════════════════════════

const NOZAWA_PREF_RULE = makeRule({
  id: 'nozawa-pref',
  tax_name: '長野県宿泊税',
  tax_type: 'prefecture',
  calc_method: 'flat',
  threshold: 6000,
  sort_order: 1,
})

const NOZAWA_MUNI_RULE = makeRule({
  id: 'nozawa-muni',
  tax_name: '野沢温泉村宿泊税',
  tax_type: 'municipal',
  calc_method: 'inclusive_percentage',
  threshold: 6000,
  inclusive_pref_tax_rule_id: 'nozawa-pref',
  sort_order: 2,
})

const NOZAWA_RULES: TaxRule[] = [NOZAWA_PREF_RULE, NOZAWA_MUNI_RULE]

const NOZAWA_RATES: TaxRuleRate[] = [
  makeRate({ id: 'nozawa-pref-r', tax_rule_id: 'nozawa-pref', flat_amount: 100 }),
  makeRate({ id: 'nozawa-muni-r', tax_rule_id: 'nozawa-muni', rate_percent: 3.5 }),
]

// ══════════════════════════════════════════════════════════════
// 白馬村 税データ（確定ブラケット — 経過措置3年間）
// 村税: 6000-20000=100, 20000-50000=300, 50000-100000=800, 100000+=1800
// ══════════════════════════════════════════════════════════════

const HAKUBA_PREF_RULE = makeRule({
  id: 'hakuba-pref',
  tax_name: '長野県宿泊税',
  tax_type: 'prefecture',
  calc_method: 'flat',
  threshold: 6000,
  sort_order: 1,
})

const HAKUBA_MUNI_RULE = makeRule({
  id: 'hakuba-muni',
  tax_name: '白馬村宿泊税',
  tax_type: 'municipal',
  calc_method: 'tiered',
  threshold: 6000,
  sort_order: 2,
})

const HAKUBA_RULES: TaxRule[] = [HAKUBA_PREF_RULE, HAKUBA_MUNI_RULE]

const HAKUBA_RATES: TaxRuleRate[] = [
  makeRate({ id: 'hakuba-pref-r', tax_rule_id: 'hakuba-pref', flat_amount: 100 }),
  makeRate({ id: 'hakuba-t1', tax_rule_id: 'hakuba-muni', bracket_min: 6000, bracket_max: 20000, flat_amount: 100 }),
  makeRate({ id: 'hakuba-t2', tax_rule_id: 'hakuba-muni', bracket_min: 20000, bracket_max: 50000, flat_amount: 300 }),
  makeRate({ id: 'hakuba-t3', tax_rule_id: 'hakuba-muni', bracket_min: 50000, bracket_max: 100000, flat_amount: 800 }),
  makeRate({ id: 'hakuba-t4', tax_rule_id: 'hakuba-muni', bracket_min: 100000, bracket_max: null, flat_amount: 1800 }),
]

// ══════════════════════════════════════════════════════════════
// 軽井沢町 税データ（確定ブラケット — 経過措置3年間）
// 町税: 6000-10000=100, 10000-100000=150, 100000+=600
// ══════════════════════════════════════════════════════════════

const KARUIZAWA_PREF_RULE = makeRule({
  id: 'karu-pref',
  tax_name: '長野県宿泊税',
  tax_type: 'prefecture',
  calc_method: 'flat',
  threshold: 6000,
  sort_order: 1,
})

const KARUIZAWA_MUNI_RULE = makeRule({
  id: 'karu-muni',
  tax_name: '軽井沢町宿泊税',
  tax_type: 'municipal',
  calc_method: 'tiered',
  threshold: 6000,
  sort_order: 2,
})

const KARUIZAWA_RULES: TaxRule[] = [KARUIZAWA_PREF_RULE, KARUIZAWA_MUNI_RULE]

const KARUIZAWA_RATES: TaxRuleRate[] = [
  makeRate({ id: 'karu-pref-r', tax_rule_id: 'karu-pref', flat_amount: 100 }),
  makeRate({ id: 'karu-t1', tax_rule_id: 'karu-muni', bracket_min: 6000, bracket_max: 10000, flat_amount: 100 }),
  makeRate({ id: 'karu-t2', tax_rule_id: 'karu-muni', bracket_min: 10000, bracket_max: 100000, flat_amount: 150 }),
  makeRate({ id: 'karu-t3', tax_rule_id: 'karu-muni', bracket_min: 100000, bracket_max: null, flat_amount: 600 }),
]

// ══════════════════════════════════════════════════════════════
// 松本市 税データ（市税100円に修正、免税点6000円追加）
// ══════════════════════════════════════════════════════════════

const MATSUMOTO_PREF_RULE = makeRule({
  id: 'matsu-pref',
  tax_name: '長野県宿泊税',
  tax_type: 'prefecture',
  calc_method: 'flat',
  threshold: 6000,
  sort_order: 1,
})

const MATSUMOTO_MUNI_RULE = makeRule({
  id: 'matsu-muni',
  tax_name: '松本市宿泊税',
  tax_type: 'municipal',
  calc_method: 'flat',
  threshold: 6000,
  sort_order: 2,
})

const MATSUMOTO_RULES: TaxRule[] = [MATSUMOTO_PREF_RULE, MATSUMOTO_MUNI_RULE]

const MATSUMOTO_RATES: TaxRuleRate[] = [
  makeRate({ id: 'matsu-pref-r', tax_rule_id: 'matsu-pref', flat_amount: 100 }),
  makeRate({ id: 'matsu-muni-r', tax_rule_id: 'matsu-muni', flat_amount: 100 }),
]

// ══════════════════════════════════════════════════════════════
// 阿智村 税データ（県税flat100 + 村税flat200 に分離）
// ══════════════════════════════════════════════════════════════

const ACHI_PREF_RULE = makeRule({
  id: 'achi-pref',
  tax_name: '長野県宿泊税',
  tax_type: 'prefecture',
  calc_method: 'flat',
  threshold: 6000,
  sort_order: 1,
})

const ACHI_MUNI_RULE = makeRule({
  id: 'achi-muni',
  tax_name: '阿智村宿泊税',
  tax_type: 'municipal',
  calc_method: 'flat',
  threshold: 6000,
  sort_order: 2,
})

const ACHI_RULES: TaxRule[] = [ACHI_PREF_RULE, ACHI_MUNI_RULE]

const ACHI_RATES: TaxRuleRate[] = [
  makeRate({ id: 'achi-pref-r', tax_rule_id: 'achi-pref', flat_amount: 100 }),
  makeRate({ id: 'achi-muni-r', tax_rule_id: 'achi-muni', flat_amount: 200 }),
]

// ── その他長野県 税データ ──

const NAGANO_OTHER_RULE = makeRule({
  id: 'nagano-pref',
  tax_name: '長野県宿泊税',
  tax_type: 'prefecture',
  calc_method: 'flat',
  threshold: 6000,
  sort_order: 1,
})

const NAGANO_OTHER_RULES: TaxRule[] = [NAGANO_OTHER_RULE]

const NAGANO_OTHER_RATES: TaxRuleRate[] = [
  makeRate({ id: 'nagano-pref-r', tax_rule_id: 'nagano-pref', flat_amount: 200 }),
]

// ── 東京都 税データ ──

const TOKYO_RULE = makeRule({
  id: 'tokyo-muni',
  tax_name: '東京都宿泊税',
  tax_type: 'municipal',
  calc_method: 'tiered',
  effective_from: '2002-10-01',
  threshold: 10000,
  exempt_school_trips: false,
  sort_order: 1,
})

const TOKYO_RULES: TaxRule[] = [TOKYO_RULE]

const TOKYO_RATES: TaxRuleRate[] = [
  makeRate({ id: 'tokyo-t1', tax_rule_id: 'tokyo-muni', bracket_min: 10000, bracket_max: 15000, flat_amount: 100 }),
  makeRate({ id: 'tokyo-t2', tax_rule_id: 'tokyo-muni', bracket_min: 15000, bracket_max: null, flat_amount: 200 }),
]

// ══════════════════════════════════════════════════════════════
// 倶知安町 税データ
//   〜2026-03-31: 2%（rounding_unit=100）
//   2026-04-01〜: 3%（rounding_unit=100）
// ══════════════════════════════════════════════════════════════

const KUTCHAN_RULE_2PCT = makeRule({
  id: 'kutchan-2pct',
  tax_name: '倶知安町宿泊税',
  tax_type: 'municipal',
  calc_method: 'percentage',
  effective_from: '2019-11-01',
  effective_to: '2026-04-01',
  threshold: 0,
  exempt_school_trips: false,
  rounding_unit: 100,
  sort_order: 1,
})

const KUTCHAN_RULE_3PCT = makeRule({
  id: 'kutchan-3pct',
  tax_name: '倶知安町宿泊税',
  tax_type: 'municipal',
  calc_method: 'percentage',
  effective_from: '2026-04-01',
  threshold: 0,
  exempt_school_trips: false,
  rounding_unit: 100,
  sort_order: 1,
})

const KUTCHAN_RULES: TaxRule[] = [KUTCHAN_RULE_2PCT, KUTCHAN_RULE_3PCT]

const KUTCHAN_RATES: TaxRuleRate[] = [
  makeRate({ id: 'kutchan-r-2', tax_rule_id: 'kutchan-2pct', rate_percent: 2.0 }),
  makeRate({ id: 'kutchan-r-3', tax_rule_id: 'kutchan-3pct', rate_percent: 3.0 }),
]

// =============================================================================
// テストケース
// =============================================================================

describe('calcAllTaxes', () => {
  // ── 4.1 野沢温泉村（県税込み inclusive_percentage 方式） ──

  describe('野沢温泉村（県税flat100 + 村税inclusive_percentage3.5%）', () => {
    // 計算方法:
    //   1人1泊の合計税額 = floor(price * 0.035)
    //   県税 = 100円（flat）
    //   村税 = 合計税額 - 100円

    it('T01: 基本ケース — 8500円/人, 2人, 2泊', () => {
      // 1人1泊: floor(8500*0.035)=297, 県税=100, 村税=197
      // 2人2泊: 県税=100*2*2=400, 村税=197*2*2=788
      const results = calcAllTaxes(8500, 2, 2, '2026-06-01', false, false, NOZAWA_RULES, NOZAWA_RATES)
      expect(results).toHaveLength(2)

      const pref = results.find((r) => r.taxType === 'prefecture')!
      expect(pref.taxable).toBe(true)
      expect(pref.taxAmount).toBe(400) // 100 * 2 * 2

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxable).toBe(true)
      expect(muni.taxAmount).toBe(788) // (floor(8500*0.035) - 100) * 2 * 2 = 197*4

      expect(sumTaxResults(results)).toBe(1188)
    })

    it('T02: 県税免税（6000未満）、村税も免税 — 5500円/人, 2人, 2泊', () => {
      // 免税点6000円は県税・村税ともに適用
      const results = calcAllTaxes(5500, 2, 2, '2026-06-01', false, false, NOZAWA_RULES, NOZAWA_RATES)

      const pref = results.find((r) => r.taxType === 'prefecture')!
      expect(pref.taxable).toBe(false)
      expect(pref.taxAmount).toBe(0)
      expect(pref.exemptReason).toBe('単価6千円未満')

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxable).toBe(false)
      expect(muni.taxAmount).toBe(0)
      expect(muni.exemptReason).toBe('単価6千円未満')

      expect(sumTaxResults(results)).toBe(0)
    })

    it('T03: 免税点1円下 — 5999円/人, 1人, 1泊', () => {
      // 5999 < 6000 → 県税・村税ともに免税
      const results = calcAllTaxes(5999, 1, 1, '2026-06-01', false, false, NOZAWA_RULES, NOZAWA_RATES)

      const pref = results.find((r) => r.taxType === 'prefecture')!
      expect(pref.taxable).toBe(false)
      expect(pref.taxAmount).toBe(0)

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxable).toBe(false)
      expect(muni.taxAmount).toBe(0)

      expect(sumTaxResults(results)).toBe(0)
    })

    it('T04: 免税点ちょうど（課税） — 6000円/人, 1人, 1泊', () => {
      // 1人1泊: floor(6000*0.035)=210, 県税=100, 村税=110
      const results = calcAllTaxes(6000, 1, 1, '2026-06-01', false, false, NOZAWA_RULES, NOZAWA_RATES)

      const pref = results.find((r) => r.taxType === 'prefecture')!
      expect(pref.taxable).toBe(true)
      expect(pref.taxAmount).toBe(100)

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxable).toBe(true)
      expect(muni.taxAmount).toBe(110) // floor(6000*0.035) - 100 = 210 - 100

      expect(sumTaxResults(results)).toBe(210)
    })

    it('T05: 3泊 — 10000円/人, 1人, 3泊', () => {
      // 1人1泊: floor(10000*0.035)=350, 県税=100, 村税=250
      // 1人3泊: 県税=300, 村税=750
      const results = calcAllTaxes(10000, 1, 3, '2026-06-01', false, false, NOZAWA_RULES, NOZAWA_RATES)

      const pref = results.find((r) => r.taxType === 'prefecture')!
      expect(pref.taxAmount).toBe(300) // 100 * 1 * 3

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxAmount).toBe(750) // (350 - 100) * 1 * 3

      expect(sumTaxResults(results)).toBe(1050)
    })

    it('T06: 手動免税 — 全税ルール免税', () => {
      const results = calcAllTaxes(8500, 2, 2, '2026-06-01', true, false, NOZAWA_RULES, NOZAWA_RATES)

      expect(results.every((r) => !r.taxable && r.taxAmount === 0)).toBe(true)
      expect(results.every((r) => r.exemptReason === '免税指定')).toBe(true)
      expect(sumTaxResults(results)).toBe(0)
    })

    it('T07: 修学旅行免税', () => {
      const results = calcAllTaxes(8500, 2, 2, '2026-06-01', false, true, NOZAWA_RULES, NOZAWA_RATES)

      expect(results.every((r) => !r.taxable && r.taxAmount === 0)).toBe(true)
      expect(results.every((r) => r.exemptReason === '修学旅行')).toBe(true)
      expect(sumTaxResults(results)).toBe(0)
    })

    it('T08: 施行日前 — 該当税ルールなし', () => {
      const results = calcAllTaxes(8500, 2, 2, '2026-05-31', false, false, NOZAWA_RULES, NOZAWA_RATES)

      expect(results).toHaveLength(0)
      expect(sumTaxResults(results)).toBe(0)
    })

    it('T08b: inclusive_percentage で県税が合計より大きい場合、村税は0', () => {
      // 6000円: floor(6000*0.035)=210, 県税100, 村税110 → 正常
      // 極端に低い場合（例: threshold=0で2900円の場合）: floor(2900*0.035)=101, 村税=1
      // 県税flat > 合計 のケースは threshold で先にガードされるが、念のため
      const lowThresholdRule = makeRule({
        id: 'nz-muni-low',
        tax_name: '野沢温泉村宿泊税',
        tax_type: 'municipal',
        calc_method: 'inclusive_percentage',
        threshold: 0,
        inclusive_pref_tax_rule_id: 'nozawa-pref',
        sort_order: 2,
      })
      const rules = [NOZAWA_PREF_RULE, lowThresholdRule]
      const rates = [
        ...NOZAWA_RATES.filter(r => r.tax_rule_id === 'nozawa-pref'),
        makeRate({ id: 'nz-low-r', tax_rule_id: 'nz-muni-low', rate_percent: 3.5 }),
      ]
      // 2000円: floor(2000*0.035)=70, 県税100 → 村税=max(0, 70-100)=0
      const results = calcAllTaxes(2000, 1, 1, '2026-06-01', false, false, rules, rates)
      const muni = results.find((r) => r.taxName === '野沢温泉村宿泊税')!
      expect(muni.taxAmount).toBe(0) // ガード: 負にならない
    })
  })

  // ── 4.2 白馬村 ──

  describe('白馬村（県税flat100 + 村税tiered — 確定ブラケット）', () => {
    it('T09: 15000円/人, 2人, 1泊 — ブラケット6000-20000=¥100', () => {
      const results = calcAllTaxes(15000, 2, 1, '2026-06-01', false, false, HAKUBA_RULES, HAKUBA_RATES)

      const pref = results.find((r) => r.taxType === 'prefecture')!
      expect(pref.taxAmount).toBe(200) // 100 * 2 * 1

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxAmount).toBe(200) // 100 * 2 * 1（ブラケット6000-20000=100円）

      expect(sumTaxResults(results)).toBe(400)
    })

    it('T10: 5500円/人, 1人, 1泊 — 県税免税、村税も免税（6000未満）', () => {
      const results = calcAllTaxes(5500, 1, 1, '2026-06-01', false, false, HAKUBA_RULES, HAKUBA_RATES)

      const pref = results.find((r) => r.taxType === 'prefecture')!
      expect(pref.taxable).toBe(false)
      expect(pref.taxAmount).toBe(0)

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxable).toBe(false) // 免税点6000で弾かれる
      expect(muni.taxAmount).toBe(0)
    })

    it('T09b: 25000円/人, 1人, 1泊 — ブラケット20000-50000=¥300', () => {
      const results = calcAllTaxes(25000, 1, 1, '2026-06-01', false, false, HAKUBA_RULES, HAKUBA_RATES)

      const pref = results.find((r) => r.taxType === 'prefecture')!
      expect(pref.taxAmount).toBe(100)

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxAmount).toBe(300)

      expect(sumTaxResults(results)).toBe(400)
    })

    it('T09c: 60000円/人, 1人, 1泊 — ブラケット50000-100000=¥800', () => {
      const results = calcAllTaxes(60000, 1, 1, '2026-06-01', false, false, HAKUBA_RULES, HAKUBA_RATES)

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxAmount).toBe(800)

      expect(sumTaxResults(results)).toBe(900) // 100 + 800
    })

    it('T09d: 120000円/人, 1人, 1泊 — ブラケット100000+=¥1800', () => {
      const results = calcAllTaxes(120000, 1, 1, '2026-06-01', false, false, HAKUBA_RULES, HAKUBA_RATES)

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxAmount).toBe(1800)

      expect(sumTaxResults(results)).toBe(1900) // 100 + 1800
    })
  })

  // ── 4.3 軽井沢町 ──

  describe('軽井沢町（県税flat100 + 町税tiered — 確定ブラケット）', () => {
    it('T11: 20000円/人, 1人, 1泊 — ブラケット10000-100000=¥150', () => {
      const results = calcAllTaxes(20000, 1, 1, '2026-06-01', false, false, KARUIZAWA_RULES, KARUIZAWA_RATES)

      const pref = results.find((r) => r.taxType === 'prefecture')!
      expect(pref.taxAmount).toBe(100)

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxAmount).toBe(150)

      expect(sumTaxResults(results)).toBe(250)
    })

    it('T12: 8000円/人, 1人, 1泊 — ブラケット6000-10000=¥100', () => {
      const results = calcAllTaxes(8000, 1, 1, '2026-06-01', false, false, KARUIZAWA_RULES, KARUIZAWA_RATES)

      const pref = results.find((r) => r.taxType === 'prefecture')!
      expect(pref.taxAmount).toBe(100)

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxAmount).toBe(100)

      expect(sumTaxResults(results)).toBe(200)
    })

    it('T11b: 5500円/人, 1人, 1泊 — 県税・町税ともに免税（6000未満）', () => {
      const results = calcAllTaxes(5500, 1, 1, '2026-06-01', false, false, KARUIZAWA_RULES, KARUIZAWA_RATES)

      const pref = results.find((r) => r.taxType === 'prefecture')!
      expect(pref.taxable).toBe(false)

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxable).toBe(false)

      expect(sumTaxResults(results)).toBe(0)
    })

    it('T11c: 150000円/人, 1人, 1泊 — ブラケット100000+=¥600', () => {
      const results = calcAllTaxes(150000, 1, 1, '2026-06-01', false, false, KARUIZAWA_RULES, KARUIZAWA_RATES)

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxAmount).toBe(600)

      expect(sumTaxResults(results)).toBe(700)
    })
  })

  // ── 4.4 松本市（市税100円に修正、免税点6000円） ──

  describe('松本市（県税flat100 + 市税flat100）', () => {
    it('T13: 8000円/人, 2人, 2泊', () => {
      const results = calcAllTaxes(8000, 2, 2, '2026-06-01', false, false, MATSUMOTO_RULES, MATSUMOTO_RATES)

      const pref = results.find((r) => r.taxType === 'prefecture')!
      expect(pref.taxAmount).toBe(400) // 100 * 2 * 2

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxAmount).toBe(400) // 100 * 2 * 2（200→100に修正）

      expect(sumTaxResults(results)).toBe(800)
    })

    it('T14: 5500円/人, 1人, 1泊 — 県税・市税ともに免税（6000未満）', () => {
      const results = calcAllTaxes(5500, 1, 1, '2026-06-01', false, false, MATSUMOTO_RULES, MATSUMOTO_RATES)

      const pref = results.find((r) => r.taxType === 'prefecture')!
      expect(pref.taxable).toBe(false)
      expect(pref.taxAmount).toBe(0)

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxable).toBe(false) // 免税点6000円追加
      expect(muni.taxAmount).toBe(0)

      expect(sumTaxResults(results)).toBe(0)
    })
  })

  // ── 4.5 阿智村（県税100+村税200に分離） ──

  describe('阿智村（県税flat100 + 村税flat200）', () => {
    it('T15: 8000円/人, 2人, 1泊', () => {
      const results = calcAllTaxes(8000, 2, 1, '2026-06-01', false, false, ACHI_RULES, ACHI_RATES)

      expect(results).toHaveLength(2) // 1つ→2つに変更

      const pref = results.find((r) => r.taxType === 'prefecture')!
      expect(pref.taxAmount).toBe(200) // 100 * 2 * 1

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxAmount).toBe(400) // 200 * 2 * 1

      expect(sumTaxResults(results)).toBe(600)
    })

    it('T15b: 5500円/人, 1人, 1泊 — 県税・村税ともに免税', () => {
      const results = calcAllTaxes(5500, 1, 1, '2026-06-01', false, false, ACHI_RULES, ACHI_RATES)

      expect(results).toHaveLength(2)
      expect(results.every((r) => !r.taxable && r.taxAmount === 0)).toBe(true)
      expect(sumTaxResults(results)).toBe(0)
    })
  })

  // ── 4.6 その他長野県 ──

  describe('その他長野県（県税flat200のみ）', () => {
    it('T16: 8000円/人, 3人, 2泊', () => {
      const results = calcAllTaxes(8000, 3, 2, '2026-06-01', false, false, NAGANO_OTHER_RULES, NAGANO_OTHER_RATES)

      expect(results).toHaveLength(1)
      expect(results[0].taxAmount).toBe(1200) // 200 * 3 * 2
      expect(sumTaxResults(results)).toBe(1200)
    })

    it('T17: 5500円/人, 1人, 1泊 — 免税', () => {
      const results = calcAllTaxes(5500, 1, 1, '2026-06-01', false, false, NAGANO_OTHER_RULES, NAGANO_OTHER_RATES)

      expect(results).toHaveLength(1)
      expect(results[0].taxable).toBe(false)
      expect(results[0].taxAmount).toBe(0)
      expect(sumTaxResults(results)).toBe(0)
    })
  })

  // ── 4.7 東京都 ──

  describe('東京都（tiered100-200）', () => {
    it('T18: 12000円/人, 1人, 1泊 — 10000-15000ブラケット=¥100', () => {
      const results = calcAllTaxes(12000, 1, 1, '2026-06-01', false, false, TOKYO_RULES, TOKYO_RATES)

      expect(results).toHaveLength(1)
      expect(results[0].taxAmount).toBe(100)
      expect(sumTaxResults(results)).toBe(100)
    })

    it('T19: 20000円/人, 2人, 1泊 — 15000以上ブラケット=¥200', () => {
      const results = calcAllTaxes(20000, 2, 1, '2026-06-01', false, false, TOKYO_RULES, TOKYO_RATES)

      expect(results).toHaveLength(1)
      expect(results[0].taxAmount).toBe(400) // 200 * 2 * 1
      expect(sumTaxResults(results)).toBe(400)
    })

    it('T20: 9999円/人, 1人, 1泊 — 免税（10000未満）', () => {
      const results = calcAllTaxes(9999, 1, 1, '2026-06-01', false, false, TOKYO_RULES, TOKYO_RATES)

      expect(results).toHaveLength(1)
      expect(results[0].taxable).toBe(false)
      expect(results[0].taxAmount).toBe(0)
      expect(sumTaxResults(results)).toBe(0)
    })
  })

  // ── 4.8 倶知安町（2%→3%、100円未満切捨） ──

  describe('倶知安町（percentage 2%→3%、rounding_unit=100）', () => {
    it('T21: 15000円/人, 2人, 3泊 — 2%期間（2026-03-01）', () => {
      const results = calcAllTaxes(15000, 2, 3, '2026-03-01', false, false, KUTCHAN_RULES, KUTCHAN_RATES)

      expect(results).toHaveLength(1)
      // floor_100(15000 * 2 * 3 * 0.02) = floor_100(1800) = 1800
      expect(results[0].taxAmount).toBe(1800)
      expect(sumTaxResults(results)).toBe(1800)
    })

    it('T22: 8333円/人, 1人, 1泊 — 2%期間、100円未満切捨', () => {
      const results = calcAllTaxes(8333, 1, 1, '2026-03-01', false, false, KUTCHAN_RULES, KUTCHAN_RATES)

      expect(results).toHaveLength(1)
      // floor_100(8333 * 0.02) = floor_100(166.66) = 100
      expect(results[0].taxAmount).toBe(100)
      expect(sumTaxResults(results)).toBe(100)
    })

    it('T21b: 15000円/人, 2人, 3泊 — 3%期間（2026-06-01）', () => {
      const results = calcAllTaxes(15000, 2, 3, '2026-06-01', false, false, KUTCHAN_RULES, KUTCHAN_RATES)

      expect(results).toHaveLength(1)
      // floor_100(15000 * 2 * 3 * 0.03) = floor_100(2700) = 2700
      expect(results[0].taxAmount).toBe(2700)
      expect(sumTaxResults(results)).toBe(2700)
    })

    it('T22b: 8333円/人, 1人, 1泊 — 3%期間、100円未満切捨', () => {
      const results = calcAllTaxes(8333, 1, 1, '2026-06-01', false, false, KUTCHAN_RULES, KUTCHAN_RATES)

      expect(results).toHaveLength(1)
      // floor_100(8333 * 0.03) = floor_100(249.99) = 200
      expect(results[0].taxAmount).toBe(200)
      expect(sumTaxResults(results)).toBe(200)
    })

    it('T22c: 3500円/人, 1人, 1泊 — 3%期間、100円未満で切捨→0', () => {
      const results = calcAllTaxes(3500, 1, 1, '2026-06-01', false, false, KUTCHAN_RULES, KUTCHAN_RATES)

      expect(results).toHaveLength(1)
      // floor_100(3500 * 0.03) = floor_100(105) = 100
      expect(results[0].taxAmount).toBe(100)
    })
  })

  // ── 4.9 エッジケース ──

  describe('エッジケース', () => {
    it('T23: 大人0人 — 全税額0', () => {
      const results = calcAllTaxes(8500, 0, 2, '2026-06-01', false, false, NOZAWA_RULES, NOZAWA_RATES)

      expect(sumTaxResults(results)).toBe(0)
      results.forEach((r) => {
        expect(r.taxAmount).toBe(0)
      })
    })

    it('T24: 料金0円 — 全税額0', () => {
      const results = calcAllTaxes(0, 2, 1, '2026-06-01', false, false, NOZAWA_RULES, NOZAWA_RATES)

      // 県税: threshold=6000, 0 < 6000 → 免税
      const pref = results.find((r) => r.taxType === 'prefecture')!
      expect(pref.taxable).toBe(false)
      expect(pref.taxAmount).toBe(0)

      // 村税: threshold=6000, 0 < 6000 → 免税
      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxable).toBe(false)
      expect(muni.taxAmount).toBe(0)

      expect(sumTaxResults(results)).toBe(0)
    })

    it('T25: 0泊 — 全税額0', () => {
      const results = calcAllTaxes(8500, 2, 0, '2026-06-01', false, false, NOZAWA_RULES, NOZAWA_RATES)

      expect(sumTaxResults(results)).toBe(0)
    })

    it('T26: 施行前 — 全税額0', () => {
      const results = calcAllTaxes(8500, 2, 2, '2025-12-01', false, false, NOZAWA_RULES, NOZAWA_RATES)

      expect(results).toHaveLength(0)
      expect(sumTaxResults(results)).toBe(0)
    })

    it('T27: 税ルール0件 — 空配列', () => {
      const results = calcAllTaxes(8500, 1, 1, '2026-06-01', false, false, [], [])

      expect(results).toHaveLength(0)
      expect(sumTaxResults(results)).toBe(0)
    })
  })

  // ── 追加エッジケース ──

  describe('追加エッジケース', () => {
    it('E15: 複数税ルールの一方だけ免税（阿智村: 県税免税、村税免税 — 両方6000未満）', () => {
      // pricePerPerson=5500 → 両方 threshold=6000 で免税
      const results = calcAllTaxes(5500, 1, 1, '2026-06-01', false, false, ACHI_RULES, ACHI_RATES)

      const pref = results.find((r) => r.taxType === 'prefecture')!
      expect(pref.taxable).toBe(false)
      expect(pref.exemptReason).toBe('単価6千円未満')

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxable).toBe(false)
      expect(muni.exemptReason).toBe('単価6千円未満')
    })

    it('tiered でブラケット該当なし → 非課税', () => {
      const gappedRates: TaxRuleRate[] = [
        makeRate({ id: 'gap-t1', tax_rule_id: 'tokyo-muni', bracket_min: 15000, bracket_max: null, flat_amount: 200 }),
      ]
      const results = calcAllTaxes(10000, 1, 1, '2026-06-01', false, false, TOKYO_RULES, gappedRates)

      expect(results).toHaveLength(1)
      expect(results[0].taxable).toBe(false)
      expect(results[0].taxAmount).toBe(0)
    })

    it('effective_to による期間終了', () => {
      const expiredRule = makeRule({
        id: 'expired',
        effective_from: '2026-06-01',
        effective_to: '2027-01-01',
        calc_method: 'flat',
      })
      const rates: TaxRuleRate[] = [
        makeRate({ id: 'exp-r', tax_rule_id: 'expired', flat_amount: 100 }),
      ]

      // 期間内
      const r1 = calcAllTaxes(8000, 1, 1, '2026-12-31', false, false, [expiredRule], rates)
      expect(r1).toHaveLength(1)
      expect(r1[0].taxAmount).toBe(100)

      // 期間外 (effective_to は exclusive)
      const r2 = calcAllTaxes(8000, 1, 1, '2027-01-01', false, false, [expiredRule], rates)
      expect(r2).toHaveLength(0)
    })

    it('displayRate が正しく生成される', () => {
      const results = calcAllTaxes(8500, 1, 1, '2026-06-01', false, false, NOZAWA_RULES, NOZAWA_RATES)

      const pref = results.find((r) => r.taxType === 'prefecture')!
      expect(pref.displayRate).toBe('¥100')

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.displayRate).toBe('3.5%')
    })

    it('sort_order で結果がソートされる', () => {
      const reversedRules = [...NOZAWA_RULES].reverse()
      const results = calcAllTaxes(8500, 1, 1, '2026-06-01', false, false, reversedRules, NOZAWA_RATES)

      expect(results[0].taxName).toBe('長野県宿泊税')
      expect(results[1].taxName).toBe('野沢温泉村宿泊税')
    })

    it('rounding_unit=100 で100円未満切捨が適用される', () => {
      // 単独テスト: 7777円 * 3% = 233.31 → floor_100 = 200
      const rule = makeRule({
        id: 'round-test',
        calc_method: 'percentage',
        effective_from: '2020-01-01',
        rounding_unit: 100,
        exempt_school_trips: false,
      })
      const rates: TaxRuleRate[] = [
        makeRate({ id: 'round-r', tax_rule_id: 'round-test', rate_percent: 3.0 }),
      ]
      const results = calcAllTaxes(7777, 1, 1, '2026-06-01', false, false, [rule], rates)
      expect(results[0].taxAmount).toBe(200) // floor(233.31 / 100) * 100
    })
  })
})

