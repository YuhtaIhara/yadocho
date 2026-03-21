import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/lib/test-utils'
import userEvent from '@testing-library/user-event'
import SegmentControl from '../ui/SegmentControl'

const options = [
  { value: 'day', label: '日表示' },
  { value: 'week', label: '週表示' },
  { value: 'month', label: '月表示' },
]

describe('SegmentControl', () => {
  it('renders all option labels', () => {
    render(<SegmentControl options={options} selected="day" onChange={() => {}} />)
    expect(screen.getByText('日表示')).toBeInTheDocument()
    expect(screen.getByText('週表示')).toBeInTheDocument()
    expect(screen.getByText('月表示')).toBeInTheDocument()
  })

  it('applies selected styling to active option', () => {
    render(<SegmentControl options={options} selected="week" onChange={() => {}} />)
    const weekBtn = screen.getByText('週表示')
    expect(weekBtn.className).toContain('bg-background')
    expect(weekBtn.className).toContain('text-text-1')
  })

  it('applies unselected styling to inactive options', () => {
    render(<SegmentControl options={options} selected="week" onChange={() => {}} />)
    const dayBtn = screen.getByText('日表示')
    expect(dayBtn.className).toContain('text-text-3')
  })

  it('calls onChange with the value when an option is clicked', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<SegmentControl options={options} selected="day" onChange={handleChange} />)

    await user.click(screen.getByText('月表示'))
    expect(handleChange).toHaveBeenCalledWith('month')
  })

  it('calls onChange when clicking already-selected option', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<SegmentControl options={options} selected="day" onChange={handleChange} />)

    await user.click(screen.getByText('日表示'))
    expect(handleChange).toHaveBeenCalledWith('day')
  })
})
