import { describe, test, expect } from 'vitest'
import { toDateStr, nightCount } from '../date'

describe('toDateStr', () => {
  test('formats a normal date as yyyy-MM-dd', () => {
    expect(toDateStr(new Date(2026, 2, 21))).toBe('2026-03-21') // month is 0-indexed
  })

  test('pads single-digit month and day', () => {
    expect(toDateStr(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  test('handles Dec 31 (year boundary)', () => {
    expect(toDateStr(new Date(2026, 11, 31))).toBe('2026-12-31')
  })

  test('handles Jan 1 (year boundary)', () => {
    expect(toDateStr(new Date(2027, 0, 1))).toBe('2027-01-01')
  })

  test('handles Feb 29 in leap year', () => {
    expect(toDateStr(new Date(2024, 1, 29))).toBe('2024-02-29')
  })

  test('handles Feb 28 in non-leap year', () => {
    expect(toDateStr(new Date(2026, 1, 28))).toBe('2026-02-28')
  })
})

describe('nightCount', () => {
  test('1 night stay', () => {
    expect(nightCount('2026-03-21', '2026-03-22')).toBe(1)
  })

  test('multi-night stay', () => {
    expect(nightCount('2026-03-21', '2026-03-25')).toBe(4)
  })

  test('same day (0 nights)', () => {
    expect(nightCount('2026-03-21', '2026-03-21')).toBe(0)
  })

  test('negative nights (checkout before checkin)', () => {
    expect(nightCount('2026-03-25', '2026-03-21')).toBe(-4)
  })

  test('year boundary crossing', () => {
    expect(nightCount('2026-12-29', '2027-01-03')).toBe(5)
  })

  test('leap year Feb 28 to Mar 1', () => {
    // 2024 is a leap year: Feb has 29 days, so Feb 28 to Mar 1 = 2 nights
    expect(nightCount('2024-02-28', '2024-03-01')).toBe(2)
  })

  test('non-leap year Feb 28 to Mar 1', () => {
    // 2026 is not a leap year: Feb has 28 days, so Feb 28 to Mar 1 = 1 night
    expect(nightCount('2026-02-28', '2026-03-01')).toBe(1)
  })

  test('long stay (30 nights)', () => {
    expect(nightCount('2026-01-01', '2026-01-31')).toBe(30)
  })
})
