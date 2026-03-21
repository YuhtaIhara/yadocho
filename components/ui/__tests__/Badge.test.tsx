import { describe, it, expect } from 'vitest'
import { render, screen } from '@/lib/test-utils'
import { Badge } from '../Badge'

describe('Badge', () => {
  it('renders text content', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('applies default variant', () => {
    render(<Badge>Default</Badge>)
    const badge = screen.getByText('Default')
    expect(badge.className).toContain('bg-primary-soft')
    expect(badge.className).toContain('text-primary')
  })

  it('applies accent variant', () => {
    render(<Badge variant="accent">Accent</Badge>)
    const badge = screen.getByText('Accent')
    expect(badge.className).toContain('text-accent')
  })

  it('applies warning variant', () => {
    render(<Badge variant="warning">Warning</Badge>)
    const badge = screen.getByText('Warning')
    expect(badge.className).toContain('text-warning')
  })

  it('applies danger variant', () => {
    render(<Badge variant="danger">Danger</Badge>)
    const badge = screen.getByText('Danger')
    expect(badge.className).toContain('text-danger')
  })

  it('applies outline variant', () => {
    render(<Badge variant="outline">Outline</Badge>)
    const badge = screen.getByText('Outline')
    expect(badge.className).toContain('border')
    expect(badge.className).toContain('text-text-2')
  })

  it('renders as a span element', () => {
    render(<Badge data-testid="badge">Span</Badge>)
    const badge = screen.getByTestId('badge')
    expect(badge.tagName).toBe('SPAN')
  })

  it('applies custom className', () => {
    render(<Badge className="extra">Custom</Badge>)
    expect(screen.getByText('Custom').className).toContain('extra')
  })
})
