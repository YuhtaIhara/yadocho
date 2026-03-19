'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  error?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id || label
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-semibold text-text-2">{label}</label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={cn(
            'w-full min-h-[80px] px-4 py-3 rounded-[12px] bg-surface border border-border text-base placeholder:text-text-3 transition-shadow focus:outline-none focus:ring-2 focus:ring-ring resize-y',
            error && 'border-danger focus:ring-danger/30',
            className,
          )}
          {...props}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
