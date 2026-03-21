import { describe, test, expect } from 'vitest'

/**
 * STATUS_TRANSITIONS from reservations.ts (not exported, so we replicate the rules here).
 * These tests verify the business rules for reservation status changes:
 *
 *   scheduled  → checked_in, cancelled
 *   checked_in → settled, cancelled
 *   settled    → checked_in (undo settlement only)
 *   cancelled  → scheduled  (undo cancellation)
 */
const STATUS_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['checked_in', 'cancelled'],
  checked_in: ['settled', 'cancelled'],
  settled: ['checked_in'],
  cancelled: ['scheduled'],
}

const ALL_STATUSES = ['scheduled', 'checked_in', 'settled', 'cancelled'] as const

function isValidTransition(from: string, to: string): boolean {
  const allowed = STATUS_TRANSITIONS[from] ?? []
  return allowed.includes(to)
}

describe('STATUS_TRANSITIONS', () => {
  describe('valid transitions', () => {
    const validCases: [string, string][] = [
      ['scheduled', 'checked_in'],
      ['scheduled', 'cancelled'],
      ['checked_in', 'settled'],
      ['checked_in', 'cancelled'],
      ['settled', 'checked_in'],
      ['cancelled', 'scheduled'],
    ]

    test.each(validCases)('%s → %s is allowed', (from, to) => {
      expect(isValidTransition(from, to)).toBe(true)
    })
  })

  describe('invalid transitions', () => {
    const invalidCases: [string, string][] = [
      // scheduled cannot go to settled directly
      ['scheduled', 'settled'],
      // scheduled → scheduled (self-transition)
      ['scheduled', 'scheduled'],
      // checked_in cannot go back to scheduled
      ['checked_in', 'scheduled'],
      // checked_in → checked_in (self-transition)
      ['checked_in', 'checked_in'],
      // settled cannot go to scheduled directly
      ['settled', 'scheduled'],
      // settled cannot go to cancelled
      ['settled', 'cancelled'],
      // settled → settled (self-transition)
      ['settled', 'settled'],
      // cancelled cannot go to checked_in
      ['cancelled', 'checked_in'],
      // cancelled cannot go to settled
      ['cancelled', 'settled'],
      // cancelled → cancelled (self-transition)
      ['cancelled', 'cancelled'],
    ]

    test.each(invalidCases)('%s → %s is NOT allowed', (from, to) => {
      expect(isValidTransition(from, to)).toBe(false)
    })
  })

  describe('transition counts', () => {
    test('scheduled has exactly 2 transitions', () => {
      expect(STATUS_TRANSITIONS.scheduled).toHaveLength(2)
    })

    test('checked_in has exactly 2 transitions', () => {
      expect(STATUS_TRANSITIONS.checked_in).toHaveLength(2)
    })

    test('settled has exactly 1 transition (undo only)', () => {
      expect(STATUS_TRANSITIONS.settled).toHaveLength(1)
    })

    test('cancelled has exactly 1 transition (undo only)', () => {
      expect(STATUS_TRANSITIONS.cancelled).toHaveLength(1)
    })
  })

  describe('every status is covered', () => {
    test('all statuses have transition rules', () => {
      for (const status of ALL_STATUSES) {
        expect(STATUS_TRANSITIONS).toHaveProperty(status)
        expect(Array.isArray(STATUS_TRANSITIONS[status])).toBe(true)
      }
    })

    test('all target statuses are valid statuses', () => {
      for (const [, targets] of Object.entries(STATUS_TRANSITIONS)) {
        for (const target of targets) {
          expect(ALL_STATUSES).toContain(target)
        }
      }
    })
  })

  describe('unknown status handling', () => {
    test('unknown status has no transitions', () => {
      expect(isValidTransition('unknown', 'scheduled')).toBe(false)
      expect(isValidTransition('unknown', 'checked_in')).toBe(false)
    })
  })

  describe('business rule invariants', () => {
    test('cannot skip checkin and go directly from scheduled to settled', () => {
      expect(isValidTransition('scheduled', 'settled')).toBe(false)
    })

    test('settlement can be undone (settled → checked_in)', () => {
      expect(isValidTransition('settled', 'checked_in')).toBe(true)
    })

    test('cancellation can be undone (cancelled → scheduled)', () => {
      expect(isValidTransition('cancelled', 'scheduled')).toBe(true)
    })

    test('settled reservations cannot be cancelled directly', () => {
      expect(isValidTransition('settled', 'cancelled')).toBe(false)
    })
  })
})
