import { describe, it, expect } from 'vitest'
import { render, screen } from '@/lib/test-utils'
import { Card } from '../Card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card><p>Card content</p></Card>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('applies default variant classes', () => {
    render(<Card data-testid="card">Content</Card>)
    const card = screen.getByTestId('card')
    expect(card.className).toContain('rounded-2xl')
    expect(card.className).toContain('shadow-card')
  })

  it('applies status variant with border-l-4', () => {
    render(<Card variant="status" data-testid="card">Content</Card>)
    const card = screen.getByTestId('card')
    expect(card.className).toContain('border-l-4')
  })

  it('applies statusColor as inline style', () => {
    render(<Card variant="status" statusColor="#ff0000" data-testid="card">Content</Card>)
    const card = screen.getByTestId('card')
    expect(card.style.borderLeftColor).toBe('rgb(255, 0, 0)')
  })

  it('does not apply statusColor without status variant', () => {
    render(<Card statusColor="#ff0000" data-testid="card">Content</Card>)
    const card = screen.getByTestId('card')
    expect(card.style.borderLeftColor).toBe('')
  })

  it('applies custom className', () => {
    render(<Card className="my-custom" data-testid="card">Content</Card>)
    expect(screen.getByTestId('card').className).toContain('my-custom')
  })

  it('passes through additional props', () => {
    render(<Card data-testid="card" role="article">Content</Card>)
    expect(screen.getByRole('article')).toBeInTheDocument()
  })
})
