import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/lib/test-utils'
import userEvent from '@testing-library/user-event'
import DatePicker from '../DatePicker'

describe('DatePicker', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onSelect: vi.fn(),
    selectedDate: new Date(2026, 2, 15), // 2026-03-15
  }

  it('renders nothing when closed', () => {
    const { container } = render(<DatePicker {...defaultProps} open={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('shows current month and year header', () => {
    render(<DatePicker {...defaultProps} />)
    expect(screen.getByText('2026年3月')).toBeInTheDocument()
  })

  it('renders weekday headers in Japanese', () => {
    render(<DatePicker {...defaultProps} />)
    expect(screen.getByText('日')).toBeInTheDocument()
    expect(screen.getByText('月')).toBeInTheDocument()
    expect(screen.getByText('土')).toBeInTheDocument()
  })

  it('renders day numbers for the month', () => {
    render(<DatePicker {...defaultProps} />)
    expect(screen.getByText('15')).toBeInTheDocument()
    // Day "1" may appear twice (current + overflow month), so use getAllByText
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('31')).toBeInTheDocument()
  })

  it('calls onSelect and onClose when a day is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(<DatePicker {...defaultProps} onSelect={onSelect} onClose={onClose} />)

    // Click day 20
    await user.click(screen.getByText('20'))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect.mock.calls[0][0].getDate()).toBe(20)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('navigates to previous month', async () => {
    const user = userEvent.setup()
    render(<DatePicker {...defaultProps} />)

    await user.click(screen.getByText('◀'))
    expect(screen.getByText('2026年2月')).toBeInTheDocument()
  })

  it('navigates to next month', async () => {
    const user = userEvent.setup()
    render(<DatePicker {...defaultProps} />)

    await user.click(screen.getByText('▶'))
    expect(screen.getByText('2026年4月')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<DatePicker {...defaultProps} onClose={onClose} />)

    await user.click(screen.getByText('✕'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
