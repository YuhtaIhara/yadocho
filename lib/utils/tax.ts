import type { TaxRule, TaxRuleRate, TaxResult } from '@/lib/types'

// Re-export TaxResult from types (canonical location)
export type { TaxResult }

/**
 * チェックイン日が税ルールの有効期間内かチェック
 * effective_from: inclusive, effective_to: exclusive (NULL = 無期限)
 */
function isRuleEffective(rule: TaxRule, checkinDate: string): boolean {
  if (checkinDate < rule.effective_from) return false
  if (rule.effective_to && checkinDate >= rule.effective_to) return false
  return true
}

/**
 * 税ルールに対応する税率レコードを取得
 */
function getRatesForRule(
  ruleId: string,
  allRates: TaxRuleRate[],
): TaxRuleRate[] {
  return allRates.filter((r) => r.tax_rule_id === ruleId)
}

/**
 * tiered 方式でブラケットを検索
 * bracket_min <= price AND (bracket_max IS NULL OR price < bracket_max)
 */
function findBracket(
  rates: TaxRuleRate[],
  pricePerPerson: number,
): TaxRuleRate | null {
  for (const rate of rates) {
    if (pricePerPerson >= rate.bracket_min) {
      if (rate.bracket_max === null || pricePerPerson < rate.bracket_max) {
        return rate
      }
    }
  }
  return null
}

/**
 * rounding_unit に基づいた切り捨て処理
 * rounding_unit=1: Math.floor (1円未満切捨)
 * rounding_unit=100: 100円未満切捨
 */
function floorByUnit(amount: number, roundingUnit: number): number {
  if (roundingUnit <= 1) return Math.floor(amount)
  return Math.floor(amount / roundingUnit) * roundingUnit
}

/**
 * displayRate 文字列を生成
 */
function buildDisplayRate(
  calcMethod: TaxRule['calc_method'],
  rate: TaxRuleRate | null,
): string {
  if (!rate) return '—'
  switch (calcMethod) {
    case 'flat':
      return `¥${rate.flat_amount}`
    case 'percentage':
    case 'inclusive_percentage':
      return `${rate.rate_percent}%`
    case 'tiered':
      return `¥${rate.flat_amount}`
  }
}

/**
 * 全税ルールに対して税額を計算する。
 *
 * 処理フロー (各 taxRule に対して):
 *   1. 有効期間チェック
 *   2. 免税判定 (手動免税 → 修学旅行 → 免税点)
 *   3. calc_method に応じた税額計算
 *
 * @param pricePerPerson - 1人1泊の素泊まり料金（食事分を除いた金額）。
 *   食事込みプランの場合は呼び出し側で食事分を差し引いてから渡すこと。
 * @param adults - 大人人数。子供は現仕様では課税対象外（県税務課に要確認）。
 * @param nights - 宿泊数。0泊（デイユース）は全税額0。
 * @param checkinDate - チェックイン日 (YYYY-MM-DD)。税率はこの日の有効期間で判定。
 *   連泊で税率切替日をまたぐ場合もチェックイン日の税率を全泊に適用
 *   （泊ごとの分割計算は行わない — 県税務課に要確認）。
 * @param taxExempt - 手動免税フラグ（外交官等の特別免税用）。
 * @param isSchoolTrip - 修学旅行フラグ。
 *
 * NOTE: percentage の連泊端数処理は一括計算 (price*adults*nights*rate) で
 * Math.floor している。「1泊ごとに floor して合計」とは結果が異なる可能性あり。
 * 自治体の正式な計算方法は要確認。
 */
export function calcAllTaxes(
  pricePerPerson: number,
  adults: number,
  nights: number,
  checkinDate: string,
  taxExempt: boolean,
  isSchoolTrip: boolean,
  taxRules: TaxRule[],
  taxRuleRates: TaxRuleRate[],
): TaxResult[] {
  const results: TaxResult[] = []

  // 大人0人 or 0泊 → 全額0
  if (adults <= 0 || nights <= 0) {
    return taxRules
      .filter((rule) => isRuleEffective(rule, checkinDate))
      .map((rule) => ({
        taxRuleId: rule.id,
        taxName: rule.tax_name,
        taxType: rule.tax_type,
        taxable: false,
        taxAmount: 0,
        displayRate: buildDisplayRate(
          rule.calc_method,
          getRatesForRule(rule.id, taxRuleRates)[0] ?? null,
        ),
        exemptReason: null,
      }))
  }

  // sort_order 順にソートして処理
  const sortedRules = [...taxRules].sort((a, b) => a.sort_order - b.sort_order)

  for (const rule of sortedRules) {
    // 1. 有効期間チェック
    if (!isRuleEffective(rule, checkinDate)) continue

    const rates = getRatesForRule(rule.id, taxRuleRates)

    // 2. 免税判定
    let exemptReason: string | null = null

    if (taxExempt) {
      exemptReason = '免税指定'
    } else if (isSchoolTrip && rule.exempt_school_trips) {
      exemptReason = '修学旅行'
    } else if (rule.threshold > 0 && pricePerPerson < rule.threshold) {
      exemptReason = `単価${Math.floor(rule.threshold / 1000)}千円未満`
    }

    if (exemptReason !== null) {
      results.push({
        taxRuleId: rule.id,
        taxName: rule.tax_name,
        taxType: rule.tax_type,
        taxable: false,
        taxAmount: 0,
        displayRate: buildDisplayRate(rule.calc_method, rates[0] ?? null),
        exemptReason,
      })
      continue
    }

    // 3. 税額計算
    let taxAmount = 0
    let displayRateSource: TaxRuleRate | null = null

    switch (rule.calc_method) {
      case 'flat': {
        const rate = rates[0]
        if (rate?.flat_amount != null) {
          taxAmount = rate.flat_amount * adults * nights
          displayRateSource = rate
        }
        break
      }

      case 'percentage': {
        const rate = rates[0]
        if (rate?.rate_percent != null) {
          const rawAmount = pricePerPerson * adults * nights * Number(rate.rate_percent) / 100
          taxAmount = floorByUnit(rawAmount, rule.rounding_unit)
          displayRateSource = rate
        }
        break
      }

      case 'inclusive_percentage': {
        // 県税込みpercentage方式（野沢温泉村など）
        // 合計税額 = floor(price * rate%) を1泊1人あたりで計算し、県税を差し引いた残りが村税
        // inclusive_pref_tax_rule_id で指定された県税ルールの flat_amount を参照
        const rate = rates[0]
        if (rate?.rate_percent != null) {
          let prefFlatPerPersonNight = 0
          if (rule.inclusive_pref_tax_rule_id) {
            const prefRates = getRatesForRule(rule.inclusive_pref_tax_rule_id, taxRuleRates)
            prefFlatPerPersonNight = prefRates[0]?.flat_amount ?? 0
          }
          // 1人1泊あたりの合計税額（県税込み）
          const totalPerPersonNight = Math.floor(
            pricePerPerson * Number(rate.rate_percent) / 100,
          )
          // 村税 = 合計 - 県税（負にならないようガード）
          const muniPerPersonNight = Math.max(0, totalPerPersonNight - prefFlatPerPersonNight)
          taxAmount = muniPerPersonNight * adults * nights
          displayRateSource = rate
        }
        break
      }

      case 'tiered': {
        const bracket = findBracket(rates, pricePerPerson)
        if (bracket?.flat_amount != null) {
          taxAmount = bracket.flat_amount * adults * nights
          displayRateSource = bracket
        } else {
          // ブラケット該当なし → 非課税扱い
          results.push({
            taxRuleId: rule.id,
            taxName: rule.tax_name,
            taxType: rule.tax_type,
            taxable: false,
            taxAmount: 0,
            displayRate: '—',
            exemptReason: null,
          })
          continue
        }
        break
      }
    }

    results.push({
      taxRuleId: rule.id,
      taxName: rule.tax_name,
      taxType: rule.tax_type,
      taxable: taxAmount > 0,
      taxAmount,
      displayRate: buildDisplayRate(rule.calc_method, displayRateSource),
      exemptReason: null,
    })
  }

  return results
}

/**
 * TaxResult 配列の合計税額を返す
 */
export function sumTaxResults(results: TaxResult[]): number {
  return results.reduce((sum, r) => sum + r.taxAmount, 0)
}
