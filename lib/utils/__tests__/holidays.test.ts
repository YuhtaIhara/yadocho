import { describe, test, expect } from 'vitest'
import { isJapaneseHoliday } from '../holidays'

describe('isJapaneseHoliday', () => {
  describe('2026 fixed holidays', () => {
    const fixedHolidays: [string, string][] = [
      ['2026-01-01', '元日'],
      ['2026-02-11', '建国記念の日'],
      ['2026-02-23', '天皇誕生日'],
      ['2026-04-29', '昭和の日'],
      ['2026-05-03', '憲法記念日'],
      ['2026-05-04', 'みどりの日'],
      ['2026-05-05', 'こどもの日'],
      ['2026-08-11', '山の日'],
      ['2026-11-03', '文化の日'],
      ['2026-11-23', '勤労感謝の日'],
    ]

    test.each(fixedHolidays)('%s is %s', (date) => {
      expect(isJapaneseHoliday(date)).toBe(true)
    })
  })

  describe('2026 Happy Monday holidays', () => {
    const happyMondays: [string, string][] = [
      ['2026-01-12', '成人の日 (2nd Monday of Jan)'],
      ['2026-07-20', '海の日 (3rd Monday of Jul)'],
      ['2026-09-21', '敬老の日 (3rd Monday of Sep)'],
      ['2026-10-12', 'スポーツの日 (2nd Monday of Oct)'],
    ]

    test.each(happyMondays)('%s is %s', (date) => {
      expect(isJapaneseHoliday(date)).toBe(true)
    })
  })

  describe('2026 equinox holidays', () => {
    test('春分の日 2026-03-20', () => {
      expect(isJapaneseHoliday('2026-03-20')).toBe(true)
    })

    test('秋分の日 2026-09-23', () => {
      expect(isJapaneseHoliday('2026-09-23')).toBe(true)
    })
  })

  describe('振替休日 (substitute holidays)', () => {
    // 2026-05-03 (Sun) → 2026-05-06 is substitute holiday
    // Actually let's check: 2026-05-03 is Sunday? Let me verify the logic.
    // In 2026, May 3 is a Sunday, May 4 (Mon) is みどりの日, May 5 (Tue) is こどもの日
    // So 振替休日 for May 3 would be the next non-holiday weekday = May 6 (Wed)
    test('2026-05-06 is 振替休日 for 憲法記念日 (May 3 is Sunday)', () => {
      expect(isJapaneseHoliday('2026-05-06')).toBe(true)
    })

    // 2023-01-02 is 振替休日 for 元日 (Jan 1 is Sunday in 2023)
    test('2023-01-02 is 振替休日 for 元日 (Jan 1 is Sunday)', () => {
      expect(isJapaneseHoliday('2023-01-02')).toBe(true)
    })
  })

  describe('国民の休日 (sandwiched between two holidays)', () => {
    // 2026-09-22 (Tue): between 敬老の日 (Sep 21 Mon) and 秋分の日 (Sep 23 Wed)
    // Note: buildHolidaySet may not detect this due to timezone edge cases in
    // toISOString() during 振替休日 processing shifting the sorted array.
    // This test documents the ACTUAL behavior. If the code is fixed, flip to true.
    test('2026-09-22 between 敬老の日 and 秋分の日 — correctly detected after TZ fix', () => {
      // Fixed: buildHolidaySet now uses format() instead of toISOString() for TZ safety
      expect(isJapaneseHoliday('2026-09-22')).toBe(true)
    })

    // 2015-09-22 is a well-known 国民の休日 (between 敬老の日 Sep 21 and 秋分の日 Sep 23)
    // In 2015, Sep 21 is Mon (敬老の日), Sep 23 is Wed (秋分の日)
    // Test if the algorithm handles this for a known past year
    test('verifies Sep 21 and Sep 23 are holidays in 2026 (precondition)', () => {
      expect(isJapaneseHoliday('2026-09-21')).toBe(true) // 敬老の日
      expect(isJapaneseHoliday('2026-09-23')).toBe(true) // 秋分の日
    })
  })

  describe('non-holidays', () => {
    const nonHolidays: [string, string][] = [
      ['2026-01-02', 'regular weekday in January'],
      ['2026-03-15', 'regular weekday in March'],
      ['2026-06-15', 'June has no national holidays'],
      ['2026-07-04', 'not a Japanese holiday'],
      ['2026-12-25', 'Christmas is not a Japanese holiday'],
      ['2026-08-15', 'Obon is not a national holiday'],
    ]

    test.each(nonHolidays)('%s is not a holiday (%s)', (date) => {
      expect(isJapaneseHoliday(date)).toBe(false)
    })

    test('regular weekend Saturday is not a holiday', () => {
      expect(isJapaneseHoliday('2026-01-03')).toBe(false) // Saturday
    })

    test('regular weekend Sunday is not a holiday', () => {
      expect(isJapaneseHoliday('2026-01-04')).toBe(false) // Sunday
    })
  })

  describe('cross-year consistency', () => {
    test('元日 is always a holiday', () => {
      for (const year of [2024, 2025, 2026, 2027, 2028]) {
        expect(isJapaneseHoliday(`${year}-01-01`)).toBe(true)
      }
    })

    test('建国記念の日 is always Feb 11', () => {
      for (const year of [2024, 2025, 2026, 2027, 2028]) {
        expect(isJapaneseHoliday(`${year}-02-11`)).toBe(true)
      }
    })
  })

  describe('caching works correctly', () => {
    test('repeated calls for same year return consistent results', () => {
      expect(isJapaneseHoliday('2026-01-01')).toBe(true)
      expect(isJapaneseHoliday('2026-01-01')).toBe(true)
      expect(isJapaneseHoliday('2026-06-15')).toBe(false)
      expect(isJapaneseHoliday('2026-06-15')).toBe(false)
    })
  })
})
