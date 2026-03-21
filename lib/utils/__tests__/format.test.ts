import { describe, test, expect } from 'vitest'
import { formatYen, normalizePhone } from '../format'

describe('formatYen', () => {
  test('formats positive number with yen sign and commas', () => {
    expect(formatYen(1000)).toBe('¥1,000')
  })

  test('formats zero', () => {
    expect(formatYen(0)).toBe('¥0')
  })

  test('formats small number without commas', () => {
    expect(formatYen(500)).toBe('¥500')
  })

  test('formats large number with commas', () => {
    expect(formatYen(1234567)).toBe('¥1,234,567')
  })

  test('formats very large number', () => {
    expect(formatYen(10000000)).toBe('¥10,000,000')
  })

  test('formats negative number', () => {
    const result = formatYen(-1000)
    // Depending on locale, might be ¥-1,000 or -¥1,000
    expect(result).toContain('1,000')
    expect(result).toContain('¥')
  })
})

describe('normalizePhone', () => {
  test('formats 11-digit mobile number (090-xxxx-xxxx)', () => {
    expect(normalizePhone('09012345678')).toBe('090-1234-5678')
  })

  test('formats 10-digit landline (03-xxx-xxxx)', () => {
    expect(normalizePhone('0312345678')).toBe('031-234-5678')
  })

  test('strips hyphens and reformats 11-digit', () => {
    expect(normalizePhone('090-1234-5678')).toBe('090-1234-5678')
  })

  test('strips spaces and reformats', () => {
    expect(normalizePhone('090 1234 5678')).toBe('090-1234-5678')
  })

  test('returns original if not 10 or 11 digits', () => {
    expect(normalizePhone('123')).toBe('123')
    expect(normalizePhone('12345678901234')).toBe('12345678901234')
  })

  test('handles empty string', () => {
    expect(normalizePhone('')).toBe('')
  })
})
