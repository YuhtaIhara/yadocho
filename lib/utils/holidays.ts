/**
 * Japanese national holidays (祝日)
 * Based on 国民の祝日に関する法律
 * Covers fixed dates + spring/autumn equinox estimates
 */

import { getDay } from 'date-fns'

// Fixed holidays: [month, day, name]
const FIXED_HOLIDAYS: [number, number, string][] = [
  [1, 1, '元日'],
  [2, 11, '建国記念の日'],
  [2, 23, '天皇誕生日'],
  [4, 29, '昭和の日'],
  [5, 3, '憲法記念日'],
  [5, 4, 'みどりの日'],
  [5, 5, 'こどもの日'],
  [8, 11, '山の日'],
  [11, 3, '文化の日'],
  [11, 23, '勤労感謝の日'],
]

// Happy Monday holidays: [month, weekNumber, name]
// weekNumber: 2nd Monday = 2, 3rd Monday = 3
const HAPPY_MONDAY: [number, number, string][] = [
  [1, 2, '成人の日'],
  [7, 3, '海の日'],
  [9, 3, '敬老の日'],
  [10, 2, 'スポーツの日'],
]

/** Approximate spring equinox day for a given year */
function springEquinoxDay(year: number): number {
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4))
}

/** Approximate autumn equinox day for a given year */
function autumnEquinoxDay(year: number): number {
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4))
}

/** Get the Nth Monday of a month */
function nthMonday(year: number, month: number, n: number): number {
  // Find first Monday
  const first = new Date(year, month - 1, 1)
  const firstDow = first.getDay()
  const firstMonday = firstDow <= 1 ? 1 + (1 - firstDow) : 1 + (8 - firstDow)
  return firstMonday + (n - 1) * 7
}

/** Build a Set of holiday date strings (yyyy-MM-dd) for a given year */
function buildHolidaySet(year: number): Set<string> {
  const holidays = new Set<string>()
  const pad = (n: number) => String(n).padStart(2, '0')
  const key = (m: number, d: number) => `${year}-${pad(m)}-${pad(d)}`

  // Fixed holidays
  for (const [m, d] of FIXED_HOLIDAYS) {
    holidays.add(key(m, d))
  }

  // Equinox days
  holidays.add(key(3, springEquinoxDay(year)))
  holidays.add(key(9, autumnEquinoxDay(year)))

  // Happy Monday
  for (const [m, n] of HAPPY_MONDAY) {
    holidays.add(key(m, nthMonday(year, m, n)))
  }

  // 振替休日 (substitute holidays): if a holiday falls on Sunday, next Monday is a holiday
  const allDates = [...holidays]
  for (const ds of allDates) {
    const d = new Date(ds + 'T00:00:00')
    if (getDay(d) === 0) {
      // Find next non-holiday weekday
      let sub = new Date(d)
      do {
        sub.setDate(sub.getDate() + 1)
      } while (holidays.has(sub.toISOString().slice(0, 10)))
      holidays.add(sub.toISOString().slice(0, 10))
    }
  }

  // 国民の休日: a day sandwiched between two holidays becomes a holiday
  const sorted = [...holidays].sort()
  for (let i = 0; i < sorted.length - 1; i++) {
    const d1 = new Date(sorted[i] + 'T00:00:00')
    const d2 = new Date(sorted[i + 1] + 'T00:00:00')
    const diff = (d2.getTime() - d1.getTime()) / 86400000
    if (diff === 2) {
      const mid = new Date(d1)
      mid.setDate(mid.getDate() + 1)
      const midStr = mid.toISOString().slice(0, 10)
      if (getDay(mid) !== 0) {
        holidays.add(midStr)
      }
    }
  }

  return holidays
}

// Cache per year
const cache = new Map<number, Set<string>>()

/** Check if a date string (yyyy-MM-dd) is a Japanese national holiday */
export function isJapaneseHoliday(dateStr: string): boolean {
  const year = parseInt(dateStr.slice(0, 4), 10)
  if (!cache.has(year)) {
    cache.set(year, buildHolidaySet(year))
  }
  return cache.get(year)!.has(dateStr)
}
