'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  suffix?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, suffix, id, ...props }, ref) => {
    const inputId = id || label
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-semibold text-text-2">{label}</label>
        )}
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full h-12 px-4 rounded-xl bg-surface border border-border/60 text-base placeholder:text-text-3 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/50',
              error && 'border-danger focus:ring-danger/30',
              suffix && 'pr-12',
              className,
            )}
            {...props}
          />
          {suffix && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-text-3 pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
