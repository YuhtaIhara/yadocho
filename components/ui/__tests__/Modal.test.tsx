import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/lib/test-utils'
import userEvent from '@testing-library/user-event'
import Modal from '../Modal'

// jsdom does not implement HTMLDialogElement.showModal/close
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn()
  HTMLDialogElement.prototype.close = vi.fn()
})

describe('Modal', () => {
  it('renders children when open', () => {
    render(
      <Modal open onClose={() => {}}>
        <p>Modal content</p>
      </Modal>
    )
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('calls showModal when open=true', () => {
    render(
      <Modal open onClose={() => {}}>
        Content
      </Modal>
    )
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled()
  })

  it('calls close when open=false', () => {
    render(
      <Modal open={false} onClose={() => {}}>
        Content
      </Modal>
    )
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled()
  })

  it('renders title when provided', () => {
    render(
      <Modal open onClose={() => {}} title="Test Title">
        Content
      </Modal>
    )
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('does not render title header when title is not provided', () => {
    render(
      <Modal open onClose={() => {}}>
        Content
      </Modal>
    )
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('has a close button with aria-label when title is shown', () => {
    render(
      <Modal open onClose={() => {}} title="Title">
        Content
      </Modal>
    )
    expect(screen.getByLabelText('閉じる')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const handleClose = vi.fn()
    render(
      <Modal open onClose={handleClose} title="Title">
        Content
      </Modal>
    )
    await user.click(screen.getByLabelText('閉じる'))
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('renders as a dialog element', () => {
    render(
      <Modal open onClose={() => {}}>
        Content
      </Modal>
    )
    // jsdom does not expose dialog role for closed dialogs; use hidden option
    expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument()
  })

  it('applies custom className to inner container', () => {
    const { container } = render(
      <Modal open onClose={() => {}} className="custom-modal">
        Content
      </Modal>
    )
    const inner = container.querySelector('.custom-modal')
    expect(inner).toBeInTheDocument()
  })
})
