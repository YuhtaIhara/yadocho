import { describe, it, expect } from 'vitest'
import { calcAllTaxes, sumTaxResults, isRuleEffective, floorByUnit } from '../tax'
import type { TaxRule, TaxRuleRate, TaxResult } from '@/lib/types'

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

// =============================================================================
// isRuleEffective
// =============================================================================

describe('isRuleEffective', () => {
  it('effective_from がチェックイン日より前 → effective', () => {
    const rule = makeRule({ id: 'r1', effective_from: '2026-01-01', effective_to: null })
    expect(isRuleEffective(rule, '2026-06-01')).toBe(true)
  })

  it('effective_from がチェックイン日より後 → not effective', () => {
    const rule = makeRule({ id: 'r1', effective_from: '2026-07-01', effective_to: null })
    expect(isRuleEffective(rule, '2026-06-01')).toBe(false)
  })

  it('effective_to がチェックイン日より前 → not effective', () => {
    const rule = makeRule({ id: 'r1', effective_from: '2026-01-01', effective_to: '2026-05-01' })
    expect(isRuleEffective(rule, '2026-06-01')).toBe(false)
  })

  it('effective_to が null → effective（無期限）', () => {
    const rule = makeRule({ id: 'r1', effective_from: '2026-01-01', effective_to: null })
    expect(isRuleEffective(rule, '2026-12-31')).toBe(true)
  })

  it('チェックイン日が effective_from ちょうど → effective（inclusive）', () => {
    const rule = makeRule({ id: 'r1', effective_from: '2026-06-01', effective_to: null })
    expect(isRuleEffective(rule, '2026-06-01')).toBe(true)
  })

  it('チェックイン日が effective_to ちょうど → not effective（exclusive）', () => {
    const rule = makeRule({ id: 'r1', effective_from: '2026-01-01', effective_to: '2026-06-01' })
    expect(isRuleEffective(rule, '2026-06-01')).toBe(false)
  })

  it('チェックイン日が effective_to の前日 → effective', () => {
    const rule = makeRule({ id: 'r1', effective_from: '2026-01-01', effective_to: '2026-06-01' })
    expect(isRuleEffective(rule, '2026-05-31')).toBe(true)
  })
})

// =============================================================================
// floorByUnit
// =============================================================================

describe('floorByUnit', () => {
  it('rounding_unit=1 → 1円未満切捨（Math.floor）', () => {
    expect(floorByUnit(297.5, 1)).toBe(297)
    expect(floorByUnit(100.99, 1)).toBe(100)
  })

  it('rounding_unit=100 → 100円未満切捨', () => {
    expect(floorByUnit(250, 100)).toBe(200)
    expect(floorByUnit(199.99, 100)).toBe(100)
    expect(floorByUnit(300, 100)).toBe(300)
  })

  it('rounding_unit=1000 → 1000円未満切捨', () => {
    expect(floorByUnit(1500, 1000)).toBe(1000)
    expect(floorByUnit(2999, 1000)).toBe(2000)
  })

  it('負の値', () => {
    expect(floorByUnit(-50, 1)).toBe(-50)
    expect(floorByUnit(-150, 100)).toBe(-200) // Math.floor(-1.5) * 100 = -200
  })

  it('ゼロ', () => {
    expect(floorByUnit(0, 1)).toBe(0)
    expect(floorByUnit(0, 100)).toBe(0)
  })

  it('rounding_unit=0 以下 → Math.floor として動作', () => {
    expect(floorByUnit(297.5, 0)).toBe(297)
    expect(floorByUnit(297.5, -1)).toBe(297)
  })
})

// =============================================================================
// sumTaxResults
// =============================================================================

describe('sumTaxResults', () => {
  it('複数の税額を合算', () => {
    const results: TaxResult[] = [
      { taxRuleId: 'a', taxName: '県税', taxType: 'prefecture', taxable: true, taxAmount: 100, displayRate: '¥100', exemptReason: null },
      { taxRuleId: 'b', taxName: '村税', taxType: 'municipal', taxable: true, taxAmount: 197, displayRate: '3.5%', exemptReason: null },
    ]
    expect(sumTaxResults(results)).toBe(297)
  })

  it('空配列 → 0', () => {
    expect(sumTaxResults([])).toBe(0)
  })

  it('課税と免税の混在', () => {
    const results: TaxResult[] = [
      { taxRuleId: 'a', taxName: '県税', taxType: 'prefecture', taxable: true, taxAmount: 200, displayRate: '¥200', exemptReason: null },
      { taxRuleId: 'b', taxName: '村税', taxType: 'municipal', taxable: false, taxAmount: 0, displayRate: '3.5%', exemptReason: '修学旅行' },
    ]
    expect(sumTaxResults(results)).toBe(200)
  })

  it('全て免税 → 0', () => {
    const results: TaxResult[] = [
      { taxRuleId: 'a', taxName: '県税', taxType: 'prefecture', taxable: false, taxAmount: 0, displayRate: '¥100', exemptReason: '免税指定' },
      { taxRuleId: 'b', taxName: '村税', taxType: 'municipal', taxable: false, taxAmount: 0, displayRate: '3.5%', exemptReason: '免税指定' },
    ]
    expect(sumTaxResults(results)).toBe(0)
  })
})

// ══════════════════════════════════════════════════════════════
// 税データ定義
// ══════════════════════════════════════════════════════════════

// ── 野沢温泉村（県税込み inclusive_percentage 方式）──

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

// ── 白馬村（tiered ブラケット）──

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

// ── 軽井沢町（tiered ブラケット）──

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

// ── 松本市（flat + flat）──

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

// ── 阿智村（flat + flat、村税200円）──

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

// ── その他長野県（県税のみ）──

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

// ── 東京都（tiered）──

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

// ── 倶知安町（percentage 2%→3%）──

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
// calcAllTaxes
// =============================================================================

describe('calcAllTaxes', () => {

  // ── flat method ──

  describe('flat method', () => {
    it('単一flat税率 — 100円/人泊', () => {
      const rule = makeRule({ id: 'flat1', calc_method: 'flat', sort_order: 1 })
      const rates = [makeRate({ id: 'flat1-r', tax_rule_id: 'flat1', flat_amount: 100 })]
      const results = calcAllTaxes(8000, 1, 1, '2026-06-01', false, false, [rule], rates)

      expect(results).toHaveLength(1)
      expect(results[0].taxable).toBe(true)
      expect(results[0].taxAmount).toBe(100)
    })

    it('複数泊・複数人 — 100円 × 3人 × 2泊 = 600', () => {
      const rule = makeRule({ id: 'flat1', calc_method: 'flat', sort_order: 1 })
      const rates = [makeRate({ id: 'flat1-r', tax_rule_id: 'flat1', flat_amount: 100 })]
      const results = calcAllTaxes(8000, 3, 2, '2026-06-01', false, false, [rule], rates)

      expect(results[0].taxAmount).toBe(600)
    })

    it('免税点未満 → exempt', () => {
      const rule = makeRule({ id: 'flat1', calc_method: 'flat', threshold: 6000, sort_order: 1 })
      const rates = [makeRate({ id: 'flat1-r', tax_rule_id: 'flat1', flat_amount: 100 })]
      const results = calcAllTaxes(5999, 1, 1, '2026-06-01', false, false, [rule], rates)

      expect(results[0].taxable).toBe(false)
      expect(results[0].taxAmount).toBe(0)
      expect(results[0].exemptReason).toBe('単価6千円未満')
    })

    it('tax_exempt=true → 全ルール免税', () => {
      const results = calcAllTaxes(8500, 2, 2, '2026-06-01', true, false, NOZAWA_RULES, NOZAWA_RATES)

      expect(results.every((r) => !r.taxable && r.taxAmount === 0)).toBe(true)
      expect(results.every((r) => r.exemptReason === '免税指定')).toBe(true)
      expect(sumTaxResults(results)).toBe(0)
    })

    it('isSchoolTrip + exempt_school_trips → exempt', () => {
      const results = calcAllTaxes(8500, 2, 2, '2026-06-01', false, true, NOZAWA_RULES, NOZAWA_RATES)

      expect(results.every((r) => !r.taxable && r.taxAmount === 0)).toBe(true)
      expect(results.every((r) => r.exemptReason === '修学旅行')).toBe(true)
    })

    it('isSchoolTrip + exempt_school_trips=false → 免税にならない', () => {
      // 東京都は exempt_school_trips=false
      const results = calcAllTaxes(12000, 1, 1, '2026-06-01', false, true, TOKYO_RULES, TOKYO_RATES)

      expect(results[0].taxable).toBe(true)
      expect(results[0].taxAmount).toBe(100)
    })

    it('大人0人 → 全税額0', () => {
      const results = calcAllTaxes(8500, 0, 2, '2026-06-01', false, false, NOZAWA_RULES, NOZAWA_RATES)

      expect(sumTaxResults(results)).toBe(0)
      results.forEach((r) => expect(r.taxAmount).toBe(0))
    })

    it('0泊 → 全税額0', () => {
      const results = calcAllTaxes(8500, 2, 0, '2026-06-01', false, false, NOZAWA_RULES, NOZAWA_RATES)

      expect(sumTaxResults(results)).toBe(0)
    })
  })

  // ── tiered method ──

  describe('tiered method', () => {
    it('第1ブラケット — 15000円 → 6000-20000=¥100', () => {
      const results = calcAllTaxes(15000, 2, 1, '2026-06-01', false, false, HAKUBA_RULES, HAKUBA_RATES)

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxAmount).toBe(200) // 100 * 2 * 1
    })

    it('第2ブラケット — 25000円 → 20000-50000=¥300', () => {
      const results = calcAllTaxes(25000, 1, 1, '2026-06-01', false, false, HAKUBA_RULES, HAKUBA_RATES)

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxAmount).toBe(300)
    })

    it('第3ブラケット — 60000円 → 50000-100000=¥800', () => {
      const results = calcAllTaxes(60000, 1, 1, '2026-06-01', false, false, HAKUBA_RULES, HAKUBA_RATES)

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxAmount).toBe(800)
    })

    it('最上位ブラケット — 120000円 → 100000+=¥1800', () => {
      const results = calcAllTaxes(120000, 1, 1, '2026-06-01', false, false, HAKUBA_RULES, HAKUBA_RATES)

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxAmount).toBe(1800)
    })

    it('ブラケット境界ちょうど — 20000円 → 上のブラケット（bracket_min inclusive）', () => {
      const results = calcAllTaxes(20000, 1, 1, '2026-06-01', false, false, HAKUBA_RULES, HAKUBA_RATES)

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxAmount).toBe(300) // 20000-50000ブラケット
    })

    it('ブラケット境界1円下 — 19999円 → 下のブラケット', () => {
      const results = calcAllTaxes(19999, 1, 1, '2026-06-01', false, false, HAKUBA_RULES, HAKUBA_RATES)

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxAmount).toBe(100) // 6000-20000ブラケット
    })

    it('ブラケット該当なし → 非課税', () => {
      // 10000以上のブラケットしかないのに10000未満を指定
      const gappedRates: TaxRuleRate[] = [
        makeRate({ id: 'gap-t1', tax_rule_id: 'tokyo-muni', bracket_min: 15000, bracket_max: null, flat_amount: 200 }),
      ]
      const results = calcAllTaxes(10000, 1, 1, '2026-06-01', false, false, TOKYO_RULES, gappedRates)

      expect(results).toHaveLength(1)
      expect(results[0].taxable).toBe(false)
      expect(results[0].taxAmount).toBe(0)
    })
  })

  // ── percentage method ──

  describe('percentage method', () => {
    it('標準 percentage 3% — 15000円 × 2人 × 3泊', () => {
      const results = calcAllTaxes(15000, 2, 3, '2026-06-01', false, false, KUTCHAN_RULES, KUTCHAN_RATES)

      expect(results).toHaveLength(1)
      // floor_100(15000 * 2 * 3 * 0.03) = floor_100(2700) = 2700
      expect(results[0].taxAmount).toBe(2700)
    })

    it('端数の切捨（floor）', () => {
      // 8333 * 0.02 = 166.66 → floor_100 = 100
      const results = calcAllTaxes(8333, 1, 1, '2026-03-01', false, false, KUTCHAN_RULES, KUTCHAN_RATES)

      expect(results[0].taxAmount).toBe(100)
    })

    it('rounding_unit=100 で100円未満切捨', () => {
      // 7777 * 0.03 = 233.31 → floor_100 = 200
      const rule = makeRule({
        id: 'pct-round',
        calc_method: 'percentage',
        effective_from: '2020-01-01',
        rounding_unit: 100,
        exempt_school_trips: false,
      })
      const rates = [makeRate({ id: 'pct-r', tax_rule_id: 'pct-round', rate_percent: 3.0 })]
      const results = calcAllTaxes(7777, 1, 1, '2026-06-01', false, false, [rule], rates)

      expect(results[0].taxAmount).toBe(200)
    })

    it('rounding_unit=1 で1円未満切捨', () => {
      const rule = makeRule({
        id: 'pct-r1',
        calc_method: 'percentage',
        effective_from: '2020-01-01',
        rounding_unit: 1,
        exempt_school_trips: false,
      })
      const rates = [makeRate({ id: 'pct-r1-r', tax_rule_id: 'pct-r1', rate_percent: 3.5 })]
      // 8571 * 0.035 = 299.985 → floor = 299
      const results = calcAllTaxes(8571, 1, 1, '2026-06-01', false, false, [rule], rates)

      expect(results[0].taxAmount).toBe(299)
    })

    it('rate_percent=0 → 税額0', () => {
      const rule = makeRule({
        id: 'pct-zero',
        calc_method: 'percentage',
        effective_from: '2020-01-01',
        exempt_school_trips: false,
      })
      const rates = [makeRate({ id: 'pct-z-r', tax_rule_id: 'pct-zero', rate_percent: 0 })]
      const results = calcAllTaxes(10000, 2, 3, '2026-06-01', false, false, [rule], rates)

      expect(results[0].taxAmount).toBe(0)
      expect(results[0].taxable).toBe(false) // taxAmount > 0 が taxable の条件
    })

    it('rate_percent=null → 税額0（NaN ガード）', () => {
      const rule = makeRule({
        id: 'pct-null',
        calc_method: 'percentage',
        effective_from: '2020-01-01',
        exempt_school_trips: false,
      })
      const rates = [makeRate({ id: 'pct-n-r', tax_rule_id: 'pct-null', rate_percent: null })]
      const results = calcAllTaxes(10000, 2, 3, '2026-06-01', false, false, [rule], rates)

      expect(results[0].taxAmount).toBe(0)
    })
  })

  // ── inclusive_percentage method ──

  describe('inclusive_percentage method', () => {
    it('基本ケース — 8500円/人, 2人, 2泊（野沢温泉村）', () => {
      // 1人1泊: floor(8500*0.035)=297, 県税=100, 村税=197
      // 2人2泊: 県税=100*2*2=400, 村税=197*2*2=788
      const results = calcAllTaxes(8500, 2, 2, '2026-06-01', false, false, NOZAWA_RULES, NOZAWA_RATES)
      expect(results).toHaveLength(2)

      const pref = results.find((r) => r.taxType === 'prefecture')!
      expect(pref.taxable).toBe(true)
      expect(pref.taxAmount).toBe(400)

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxable).toBe(true)
      expect(muni.taxAmount).toBe(788)

      expect(sumTaxResults(results)).toBe(1188)
    })

    it('県税が合計より大きい場合、村税は0（負にならないガード）', () => {
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
      expect(muni.taxAmount).toBe(0)
    })

    it('inclusive_pref_tax_rule_id なしでも動作（県税控除0）', () => {
      const muniOnly = makeRule({
        id: 'incl-no-pref',
        tax_name: '村税',
        tax_type: 'municipal',
        calc_method: 'inclusive_percentage',
        inclusive_pref_tax_rule_id: null,
        sort_order: 1,
      })
      const rates = [makeRate({ id: 'incl-r', tax_rule_id: 'incl-no-pref', rate_percent: 3.5 })]
      // floor(8500*0.035)=297, 県税控除0, 村税=297
      const results = calcAllTaxes(8500, 1, 1, '2026-06-01', false, false, [muniOnly], rates)

      expect(results[0].taxAmount).toBe(297)
    })
  })

  // ── multiple rules ──

  describe('multiple rules', () => {
    it('県税 + 市税の合算', () => {
      const results = calcAllTaxes(8000, 2, 1, '2026-06-01', false, false, MATSUMOTO_RULES, MATSUMOTO_RATES)

      expect(results).toHaveLength(2)
      const pref = results.find((r) => r.taxType === 'prefecture')!
      expect(pref.taxAmount).toBe(200) // 100 * 2

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxAmount).toBe(200) // 100 * 2

      expect(sumTaxResults(results)).toBe(400)
    })

    it('県税のみ（村税なし）', () => {
      const results = calcAllTaxes(8000, 3, 2, '2026-06-01', false, false, NAGANO_OTHER_RULES, NAGANO_OTHER_RATES)

      expect(results).toHaveLength(1)
      expect(results[0].taxAmount).toBe(1200) // 200 * 3 * 2
    })

    it('税ルール0件 → 空配列', () => {
      const results = calcAllTaxes(8500, 1, 1, '2026-06-01', false, false, [], [])

      expect(results).toHaveLength(0)
      expect(sumTaxResults(results)).toBe(0)
    })

    it('sort_order で処理順が決まる', () => {
      const reversedRules = [...NOZAWA_RULES].reverse()
      const results = calcAllTaxes(8500, 1, 1, '2026-06-01', false, false, reversedRules, NOZAWA_RATES)

      // sort_order=1 の県税が先
      expect(results[0].taxName).toBe('長野県宿泊税')
      expect(results[1].taxName).toBe('野沢温泉村宿泊税')
    })
  })

  // ── 自治体統合テスト ──

  describe('野沢温泉村（県税flat100 + 村税inclusive_percentage3.5%）', () => {
    it('T02: 県税免税（6000未満）、村税も免税 — 5500円', () => {
      const results = calcAllTaxes(5500, 2, 2, '2026-06-01', false, false, NOZAWA_RULES, NOZAWA_RATES)

      const pref = results.find((r) => r.taxType === 'prefecture')!
      expect(pref.taxable).toBe(false)
      expect(pref.exemptReason).toBe('単価6千円未満')

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxable).toBe(false)
      expect(muni.exemptReason).toBe('単価6千円未満')
    })

    it('T03: 免税点1円下 — 5999円', () => {
      const results = calcAllTaxes(5999, 1, 1, '2026-06-01', false, false, NOZAWA_RULES, NOZAWA_RATES)

      expect(results.every((r) => !r.taxable)).toBe(true)
    })

    it('T04: 免税点ちょうど — 6000円（課税）', () => {
      // floor(6000*0.035)=210, 県税=100, 村税=110
      const results = calcAllTaxes(6000, 1, 1, '2026-06-01', false, false, NOZAWA_RULES, NOZAWA_RATES)

      const pref = results.find((r) => r.taxType === 'prefecture')!
      expect(pref.taxAmount).toBe(100)

      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.taxAmount).toBe(110)

      expect(sumTaxResults(results)).toBe(210)
    })

    it('T05: 3泊 — 10000円/人, 1人, 3泊', () => {
      // 1人1泊: floor(10000*0.035)=350, 県税=100, 村税=250
      const results = calcAllTaxes(10000, 1, 3, '2026-06-01', false, false, NOZAWA_RULES, NOZAWA_RATES)

      expect(results.find((r) => r.taxType === 'prefecture')!.taxAmount).toBe(300)
      expect(results.find((r) => r.taxType === 'municipal')!.taxAmount).toBe(750)
      expect(sumTaxResults(results)).toBe(1050)
    })

    it('T08: 施行日前 — 該当税ルールなし', () => {
      const results = calcAllTaxes(8500, 2, 2, '2026-05-31', false, false, NOZAWA_RULES, NOZAWA_RATES)

      expect(results).toHaveLength(0)
    })
  })

  describe('flat+flat方式（松本市・阿智村）', () => {
    it.each([
      { name: '松本市', rules: MATSUMOTO_RULES, rates: MATSUMOTO_RATES, muniFlat: 100 },
      { name: '阿智村', rules: ACHI_RULES, rates: ACHI_RATES, muniFlat: 200 },
    ])('$name: 課税ケース — 8000円/人, 2人', ({ rules, rates, muniFlat }) => {
      const results = calcAllTaxes(8000, 2, 1, '2026-06-01', false, false, rules, rates)

      expect(results).toHaveLength(2)
      expect(results.find((r) => r.taxType === 'prefecture')!.taxAmount).toBe(200)
      expect(results.find((r) => r.taxType === 'municipal')!.taxAmount).toBe(muniFlat * 2)
    })

    it.each([
      { name: '松本市', rules: MATSUMOTO_RULES, rates: MATSUMOTO_RATES },
      { name: '阿智村', rules: ACHI_RULES, rates: ACHI_RATES },
    ])('$name: 免税ケース — 5500円/人（6000未満）', ({ rules, rates }) => {
      const results = calcAllTaxes(5500, 1, 1, '2026-06-01', false, false, rules, rates)

      expect(results.every((r) => !r.taxable && r.taxAmount === 0)).toBe(true)
    })

    it('松本市: 複数泊 — 8000円/人, 2人, 2泊', () => {
      const results = calcAllTaxes(8000, 2, 2, '2026-06-01', false, false, MATSUMOTO_RULES, MATSUMOTO_RATES)

      expect(results.find((r) => r.taxType === 'prefecture')!.taxAmount).toBe(400)
      expect(results.find((r) => r.taxType === 'municipal')!.taxAmount).toBe(400)
      expect(sumTaxResults(results)).toBe(800)
    })
  })

  describe('東京都（tiered100-200）', () => {
    it('12000円 → 10000-15000ブラケット=¥100', () => {
      const results = calcAllTaxes(12000, 1, 1, '2026-06-01', false, false, TOKYO_RULES, TOKYO_RATES)

      expect(results[0].taxAmount).toBe(100)
    })

    it('20000円 × 2人 → 15000以上ブラケット=¥200', () => {
      const results = calcAllTaxes(20000, 2, 1, '2026-06-01', false, false, TOKYO_RULES, TOKYO_RATES)

      expect(results[0].taxAmount).toBe(400) // 200 * 2
    })

    it('9999円 → 免税（10000未満）', () => {
      const results = calcAllTaxes(9999, 1, 1, '2026-06-01', false, false, TOKYO_RULES, TOKYO_RATES)

      expect(results[0].taxable).toBe(false)
      expect(results[0].taxAmount).toBe(0)
    })
  })

  describe('倶知安町（percentage 2%→3%、rounding_unit=100）', () => {
    it('2%期間（2026-03-01） — 15000円 × 2人 × 3泊', () => {
      const results = calcAllTaxes(15000, 2, 3, '2026-03-01', false, false, KUTCHAN_RULES, KUTCHAN_RATES)

      // floor_100(15000 * 2 * 3 * 0.02) = floor_100(1800) = 1800
      expect(results[0].taxAmount).toBe(1800)
    })

    it('2%期間、100円未満切捨 — 8333円', () => {
      const results = calcAllTaxes(8333, 1, 1, '2026-03-01', false, false, KUTCHAN_RULES, KUTCHAN_RATES)

      // floor_100(166.66) = 100
      expect(results[0].taxAmount).toBe(100)
    })

    it('3%期間（2026-06-01） — 15000円 × 2人 × 3泊', () => {
      const results = calcAllTaxes(15000, 2, 3, '2026-06-01', false, false, KUTCHAN_RULES, KUTCHAN_RATES)

      // floor_100(2700) = 2700
      expect(results[0].taxAmount).toBe(2700)
    })

    it('3%期間、100円未満切捨 — 8333円', () => {
      const results = calcAllTaxes(8333, 1, 1, '2026-06-01', false, false, KUTCHAN_RULES, KUTCHAN_RATES)

      // floor_100(249.99) = 200
      expect(results[0].taxAmount).toBe(200)
    })

    it('3%期間 — 3500円 → floor_100(105)=100', () => {
      const results = calcAllTaxes(3500, 1, 1, '2026-06-01', false, false, KUTCHAN_RULES, KUTCHAN_RATES)

      expect(results[0].taxAmount).toBe(100)
    })
  })

  // ── エッジケース ──

  describe('エッジケース', () => {
    it('料金0円 + threshold>0 → 免税', () => {
      const results = calcAllTaxes(0, 2, 1, '2026-06-01', false, false, NOZAWA_RULES, NOZAWA_RATES)

      expect(results.every((r) => !r.taxable && r.taxAmount === 0)).toBe(true)
    })

    it('施行前 → 有効なルール0件', () => {
      const results = calcAllTaxes(8500, 2, 2, '2025-12-01', false, false, NOZAWA_RULES, NOZAWA_RATES)

      expect(results).toHaveLength(0)
    })

    it('effective_to による期間終了', () => {
      const expiredRule = makeRule({
        id: 'expired',
        effective_from: '2026-06-01',
        effective_to: '2027-01-01',
        calc_method: 'flat',
      })
      const rates = [makeRate({ id: 'exp-r', tax_rule_id: 'expired', flat_amount: 100 })]

      // 期間内
      const r1 = calcAllTaxes(8000, 1, 1, '2026-12-31', false, false, [expiredRule], rates)
      expect(r1).toHaveLength(1)
      expect(r1[0].taxAmount).toBe(100)

      // 期間外 (effective_to は exclusive)
      const r2 = calcAllTaxes(8000, 1, 1, '2027-01-01', false, false, [expiredRule], rates)
      expect(r2).toHaveLength(0)
    })

    it('displayRate: flat → ¥N', () => {
      const results = calcAllTaxes(8500, 1, 1, '2026-06-01', false, false, NOZAWA_RULES, NOZAWA_RATES)
      const pref = results.find((r) => r.taxType === 'prefecture')!
      expect(pref.displayRate).toBe('¥100')
    })

    it('displayRate: inclusive_percentage → N%', () => {
      const results = calcAllTaxes(8500, 1, 1, '2026-06-01', false, false, NOZAWA_RULES, NOZAWA_RATES)
      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.displayRate).toBe('3.5%')
    })

    it('displayRate: tiered → ¥N', () => {
      const results = calcAllTaxes(15000, 1, 1, '2026-06-01', false, false, HAKUBA_RULES, HAKUBA_RATES)
      const muni = results.find((r) => r.taxType === 'municipal')!
      expect(muni.displayRate).toBe('¥100')
    })

    it('displayRate: percentage → N%', () => {
      const results = calcAllTaxes(15000, 1, 1, '2026-06-01', false, false, KUTCHAN_RULES, KUTCHAN_RATES)
      expect(results[0].displayRate).toBe('3%')
    })
  })

  // ── 公式計算例 ──

  describe('公式計算例の検証（条例ベース）', () => {
    it('野沢温泉: 8,500円 × 2名 × 1泊', () => {
      const results = calcAllTaxes(8500, 2, 1, '2026-06-01', false, false, NOZAWA_RULES, NOZAWA_RATES)

      expect(results.find((r) => r.taxType === 'prefecture')!.taxAmount).toBe(200)
      expect(results.find((r) => r.taxType === 'municipal')!.taxAmount).toBe(394)
      expect(sumTaxResults(results)).toBe(594)
    })

    it('野沢温泉: 端数 8,571円 → floor(8571*0.035)=299、村税=199', () => {
      const results = calcAllTaxes(8571, 1, 1, '2026-06-01', false, false, NOZAWA_RULES, NOZAWA_RATES)

      expect(results.find((r) => r.taxType === 'prefecture')!.taxAmount).toBe(100)
      expect(results.find((r) => r.taxType === 'municipal')!.taxAmount).toBe(199)
      expect(sumTaxResults(results)).toBe(299)
    })

    it('野沢温泉: 免税点ぎりぎり 6,001円 → 課税', () => {
      const results = calcAllTaxes(6001, 1, 1, '2026-06-01', false, false, NOZAWA_RULES, NOZAWA_RATES)

      expect(results.every((r) => r.taxable)).toBe(true)
      expect(sumTaxResults(results)).toBe(210) // 100(県) + 110(村)
    })

    it('一般長野県: 8,000円 × 1名 × 1泊 → 県税200円のみ', () => {
      const results = calcAllTaxes(8000, 1, 1, '2026-06-01', false, false, NAGANO_OTHER_RULES, NAGANO_OTHER_RATES)

      expect(results).toHaveLength(1)
      expect(results[0].taxType).toBe('prefecture')
      expect(results[0].taxAmount).toBe(200)
    })
  })
})
