import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/lib/test-utils'
import userEvent from '@testing-library/user-event'
import Stepper from '../Stepper'

describe('Stepper', () => {
  it('renders current value', () => {
    render(<Stepper value={3} onChange={() => {}} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('calls onChange with decremented value on minus click', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Stepper value={5} onChange={handleChange} />)
    const buttons = screen.getAllByRole('button')
    // First button is decrement (Minus)
    await user.click(buttons[0])
    expect(handleChange).toHaveBeenCalledWith(4)
  })

  it('calls onChange with incremented value on plus click', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Stepper value={5} onChange={handleChange} />)
    const buttons = screen.getAllByRole('button')
    // Second button is increment (Plus)
    await user.click(buttons[1])
    expect(handleChange).toHaveBeenCalledWith(6)
  })

  it('disables decrement button at min value', () => {
    render(<Stepper value={0} onChange={() => {}} min={0} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toBeDisabled()
  })

  it('disables increment button at max value', () => {
    render(<Stepper value={99} onChange={() => {}} max={99} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[1]).toBeDisabled()
  })

  it('clamps decrement to min', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Stepper value={1} onChange={handleChange} min={0} />)
    const buttons = screen.getAllByRole('button')
    await user.click(buttons[0])
    expect(handleChange).toHaveBeenCalledWith(0)
  })

  it('clamps increment to max', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Stepper value={9} onChange={handleChange} max={10} />)
    const buttons = screen.getAllByRole('button')
    await user.click(buttons[1])
    expect(handleChange).toHaveBeenCalledWith(10)
  })

  it('respects custom min and max', () => {
    render(<Stepper value={5} onChange={() => {}} min={5} max={5} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toBeDisabled()
    expect(buttons[1]).toBeDisabled()
  })

  it('does not call onChange when decrement is disabled', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Stepper value={0} onChange={handleChange} min={0} />)
    const buttons = screen.getAllByRole('button')
    await user.click(buttons[0])
    expect(handleChange).not.toHaveBeenCalled()
  })
})
