import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/lib/test-utils'
import userEvent from '@testing-library/user-event'
import DayPanel from '../calendar/DayPanel'
import type { Reservation, Room } from '@/lib/types'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

// Mock useUpdateBlockedDate hook
vi.mock('@/lib/hooks/useBlockedDates', () => ({
  useUpdateBlockedDate: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}))

function makeReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 'res-1',
    inn_id: 'inn-1',
    guest_id: 'guest-1',
    reservation_number: 'R001',
    checkin: '2026-03-15',
    checkout: '2026-03-17',
    adults: 2,
    children: 1,
    adult_price: 10000,
    child_price: 5000,
    pricing_plan_id: null,
    dinner_price: 3000,
    child_dinner_price: 1500,
    breakfast_price: 1000,
    child_breakfast_price: 500,
    lunch_price: 0,
    child_lunch_price: 0,
    checkin_time: '15:00:00',
    status: 'scheduled',
    tax_exempt: false,
    tax_exempt_reason: null,
    payment_method: null,
    payment_note: null,
    source: null,
    notes: null,
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
    rooms: [{ id: 'room-1', inn_id: 'inn-1', name: '松', room_type: '和室', capacity: 4, sort_order: 1, created_at: '2026-01-01T00:00:00Z' }],
    guest: { id: 'guest-1', inn_id: 'inn-1', name: '田中太郎', furigana: 'タナカタロウ', phone: null, email: null, address: null, company: null, allergy: null, notes: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    ...overrides,
  }
}

describe('DayPanel', () => {
  it('shows empty state when no reservations', () => {
    render(
      <DayPanel
        date={new Date(2026, 2, 15)}
        reservations={[]}
      />
    )
    expect(screen.getByText('この日の予約はありません')).toBeInTheDocument()
  })

  it('shows new reservation link in empty state', () => {
    render(
      <DayPanel
        date={new Date(2026, 2, 15)}
        reservations={[]}
      />
    )
    const link = screen.getByText('＋ 新規予約を作成')
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute('href', '/reservations/new?date=2026-03-15')
  })

  it('shows check-in section for reservations checking in on this date', () => {
    const res = makeReservation({ checkin: '2026-03-15' })
    render(
      <DayPanel
        date={new Date(2026, 2, 15)}
        reservations={[res]}
      />
    )
    expect(screen.getByText('チェックイン（1件）')).toBeInTheDocument()
    expect(screen.getByText('田中太郎 様')).toBeInTheDocument()
  })

  it('shows check-out section for reservations checking out on this date', () => {
    const res = makeReservation({ checkin: '2026-03-13', checkout: '2026-03-15' })
    render(
      <DayPanel
        date={new Date(2026, 2, 15)}
        reservations={[res]}
      />
    )
    expect(screen.getByText('チェックアウト（1件）')).toBeInTheDocument()
  })

  it('shows staying section for reservations spanning this date', () => {
    const res = makeReservation({ checkin: '2026-03-14', checkout: '2026-03-17', status: 'checked_in' })
    render(
      <DayPanel
        date={new Date(2026, 2, 15)}
        reservations={[res]}
      />
    )
    expect(screen.getByText('滞在中 — 1件')).toBeInTheDocument()
  })

  it('calls onSelectReservation when a reservation card is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const res = makeReservation({ checkin: '2026-03-15' })
    render(
      <DayPanel
        date={new Date(2026, 2, 15)}
        reservations={[res]}
        onSelectReservation={onSelect}
      />
    )

    await user.click(screen.getByText('田中太郎 様'))
    expect(onSelect).toHaveBeenCalledWith('res-1')
  })

  it('shows blocked dates section', () => {
    const rooms: Room[] = [
      { id: 'room-1', inn_id: 'inn-1', name: '松', room_type: '和室', capacity: 4, sort_order: 1, created_at: '' },
    ]
    const blocked = [
      { id: 'b-1', inn_id: 'inn-1', date: '2026-03-15', room_id: 'room-1', reason: '定休日', created_at: '' },
    ]
    render(
      <DayPanel
        date={new Date(2026, 2, 15)}
        reservations={[]}
        blockedDates={blocked}
        rooms={rooms}
      />
    )
    expect(screen.getByText('休業 — 1室')).toBeInTheDocument()
    expect(screen.getByText('松')).toBeInTheDocument()
  })

  it('collapses a section when header is clicked', async () => {
    const user = userEvent.setup()
    const res = makeReservation({ checkin: '2026-03-15' })
    render(
      <DayPanel
        date={new Date(2026, 2, 15)}
        reservations={[res]}
      />
    )

    expect(screen.getByText('田中太郎 様')).toBeInTheDocument()
    await user.click(screen.getByText('チェックイン（1件）'))
    expect(screen.queryByText('田中太郎 様')).not.toBeInTheDocument()
  })
})
