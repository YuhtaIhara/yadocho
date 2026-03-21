import { describe, it, expect } from 'vitest'
import { toReiwa, toReiwaLabel, toReiwaDateLabel } from '../reiwa'

describe('toReiwa', () => {
  it('2019 → 1 (令和元年)', () => {
    expect(toReiwa(2019)).toBe(1)
  })

  it('2020 → 2', () => {
    expect(toReiwa(2020)).toBe(2)
  })

  it('2026 → 8', () => {
    expect(toReiwa(2026)).toBe(8)
  })

  it('2030 → 12', () => {
    expect(toReiwa(2030)).toBe(12)
  })
})

describe('toReiwaLabel', () => {
  it('2019年5月 → 令和1年5月', () => {
    // Note: toReiwaLabel does NOT use 元年 — it outputs the numeric year
    expect(toReiwaLabel(2019, 5)).toBe('令和1年5月')
  })

  it('2020年1月 → 令和2年1月', () => {
    expect(toReiwaLabel(2020, 1)).toBe('令和2年1月')
  })

  it('2026年3月 → 令和8年3月', () => {
    expect(toReiwaLabel(2026, 3)).toBe('令和8年3月')
  })

  it('2026年12月 → 令和8年12月', () => {
    expect(toReiwaLabel(2026, 12)).toBe('令和8年12月')
  })

  it('月は0埋めされない (1月 → 1月)', () => {
    expect(toReiwaLabel(2026, 1)).toBe('令和8年1月')
  })
})

describe('toReiwaDateLabel', () => {
  it('2026年6月15日 → 令和8年6月15日', () => {
    expect(toReiwaDateLabel(2026, 6, 15)).toBe('令和8年6月15日')
  })

  it('2019年5月1日 → 令和1年5月1日', () => {
    expect(toReiwaDateLabel(2019, 5, 1)).toBe('令和1年5月1日')
  })

  it('日は0埋めされない (1日 → 1日)', () => {
    expect(toReiwaDateLabel(2026, 1, 1)).toBe('令和8年1月1日')
  })
})
