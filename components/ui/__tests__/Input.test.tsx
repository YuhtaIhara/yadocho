import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/lib/test-utils'
import userEvent from '@testing-library/user-event'
import { Input } from '../Input'

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Enter text" />)
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  it('renders with label', () => {
    render(<Input label="Name" />)
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
  })

  it('associates label with input via htmlFor', () => {
    render(<Input label="Email" />)
    const input = screen.getByLabelText('Email')
    expect(input.id).toBe('Email')
  })

  it('uses custom id over label for htmlFor', () => {
    render(<Input label="Email" id="custom-id" />)
    const input = screen.getByLabelText('Email')
    expect(input.id).toBe('custom-id')
  })

  it('shows error message', () => {
    render(<Input error="Required field" />)
    expect(screen.getByText('Required field')).toBeInTheDocument()
  })

  it('applies error styling to input', () => {
    render(<Input error="Required" placeholder="test" />)
    const input = screen.getByPlaceholderText('test')
    expect(input.className).toContain('border-danger')
  })

  it('shows suffix text', () => {
    render(<Input suffix="円" />)
    expect(screen.getByText('円')).toBeInTheDocument()
  })

  it('is disabled when disabled prop is set', () => {
    render(<Input disabled placeholder="disabled" />)
    expect(screen.getByPlaceholderText('disabled')).toBeDisabled()
  })

  it('calls onChange handler', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Input onChange={handleChange} placeholder="type" />)
    await user.type(screen.getByPlaceholderText('type'), 'hello')
    expect(handleChange).toHaveBeenCalled()
  })

  it('accepts typed text', async () => {
    const user = userEvent.setup()
    render(<Input placeholder="type" />)
    const input = screen.getByPlaceholderText('type')
    await user.clear(input)
    await user.type(input, 'hello')
    expect(input).toHaveValue('hello')
  })
})
