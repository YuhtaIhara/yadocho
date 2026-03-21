import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/lib/test-utils'
import userEvent from '@testing-library/user-event'
import MealEditor from '../MealEditor'
import type { MealDay } from '@/lib/types'

// Mock dialog methods for Modal
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn()
  HTMLDialogElement.prototype.close = vi.fn()
})

// Mock the API call
vi.mock('@/lib/api/meals', () => ({
  upsertMealDays: vi.fn().mockResolvedValue(undefined),
}))

// Mock Toast context
vi.mock('@/components/ui/Toast', async () => {
  const actual = await vi.importActual<typeof import('@/components/ui/Toast')>('@/components/ui/Toast')
  return {
    ...actual,
    useToast: () => ({ showToast: vi.fn() }),
  }
})

function makeMealDay(overrides: Partial<MealDay> = {}): MealDay {
  return {
    id: 'md-1',
    reservation_id: 'res-1',
    date: '2026-03-15',
    dinner_adults: 2,
    dinner_children: 1,
    dinner_time: '18:00:00',
    breakfast_adults: 2,
    breakfast_children: 1,
    breakfast_time: '07:30:00',
    lunch_adults: 0,
    lunch_children: 0,
    lunch_time: null,
    notes: null,
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
    ...overrides,
  }
}

describe('MealEditor', () => {
  const defaultProps = {
    reservationId: 'res-1',
    mealDays: [makeMealDay()],
    open: true,
    onClose: vi.fn(),
    onSaved: vi.fn(),
  }

  it('renders modal with title', () => {
    render(<MealEditor {...defaultProps} />)
    expect(screen.getByText('食事編集')).toBeInTheDocument()
  })

  it('shows empty message when no meal days', () => {
    render(<MealEditor {...defaultProps} mealDays={[]} />)
    expect(screen.getByText('食事データがありません')).toBeInTheDocument()
  })

  it('renders meal labels for each meal type', () => {
    render(<MealEditor {...defaultProps} />)
    expect(screen.getByText('朝食 大人')).toBeInTheDocument()
    expect(screen.getByText('朝食 子供')).toBeInTheDocument()
    expect(screen.getByText('昼食 大人')).toBeInTheDocument()
    expect(screen.getByText('夕食 大人')).toBeInTheDocument()
    expect(screen.getByText('夕食 子供')).toBeInTheDocument()
  })

  it('shows save and cancel buttons', () => {
    render(<MealEditor {...defaultProps} />)
    expect(screen.getByText('保存')).toBeInTheDocument()
    expect(screen.getByText('キャンセル')).toBeInTheDocument()
  })

  it('disables save button when no meal days', () => {
    render(<MealEditor {...defaultProps} mealDays={[]} />)
    expect(screen.getByText('保存')).toBeDisabled()
  })

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<MealEditor {...defaultProps} onClose={onClose} />)

    await user.click(screen.getByText('キャンセル'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls upsertMealDays and callbacks on save', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    const onClose = vi.fn()
    const { upsertMealDays } = await import('@/lib/api/meals')
    render(<MealEditor {...defaultProps} onSaved={onSaved} onClose={onClose} />)

    await user.click(screen.getByText('保存'))

    // Wait for async save to complete
    await vi.waitFor(() => {
      expect(upsertMealDays).toHaveBeenCalled()
    })
    expect(onSaved).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders time selectors for breakfast', () => {
    render(<MealEditor {...defaultProps} />)
    // The time selects render as <select> elements
    const selects = screen.getAllByDisplayValue('未設定')
    // lunch_time is null -> shows 未設定, dinner_time and breakfast_time have values
    // At least one "未設定" select should exist
    expect(selects.length).toBeGreaterThanOrEqual(1)
  })

  it('renders time labels for all meal types', () => {
    render(<MealEditor {...defaultProps} />)
    expect(screen.getByText('朝食時間')).toBeInTheDocument()
    expect(screen.getByText('昼食時間')).toBeInTheDocument()
    expect(screen.getByText('夕食時間')).toBeInTheDocument()
  })
})
