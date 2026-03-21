import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/lib/test-utils'
import userEvent from '@testing-library/user-event'
import MonthPicker from '../MonthPicker'

describe('MonthPicker', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onSelect: vi.fn(),
    currentMonth: new Date(2026, 2, 1), // March 2026
  }

  it('renders nothing when closed', () => {
    const { container } = render(<MonthPicker {...defaultProps} open={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('shows current year in header', () => {
    render(<MonthPicker {...defaultProps} />)
    expect(screen.getByText('2026年')).toBeInTheDocument()
  })

  it('renders all 12 months', () => {
    render(<MonthPicker {...defaultProps} />)
    for (let i = 1; i <= 12; i++) {
      expect(screen.getByText(`${i}月`)).toBeInTheDocument()
    }
  })

  it('calls onSelect with correct month and onClose when a month is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(<MonthPicker {...defaultProps} onSelect={onSelect} onClose={onClose} />)

    await user.click(screen.getByText('7月'))
    expect(onSelect).toHaveBeenCalledTimes(1)
    const selected = onSelect.mock.calls[0][0] as Date
    expect(selected.getFullYear()).toBe(2026)
    expect(selected.getMonth()).toBe(6) // July = index 6
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('navigates to previous year', async () => {
    const user = userEvent.setup()
    render(<MonthPicker {...defaultProps} />)

    await user.click(screen.getByText('◀'))
    expect(screen.getByText('2025年')).toBeInTheDocument()
  })

  it('navigates to next year', async () => {
    const user = userEvent.setup()
    render(<MonthPicker {...defaultProps} />)

    await user.click(screen.getByText('▶'))
    expect(screen.getByText('2027年')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<MonthPicker {...defaultProps} onClose={onClose} />)

    await user.click(screen.getByText('✕'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
