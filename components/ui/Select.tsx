'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const selectId = id || label
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-semibold text-text-2">{label}</label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            'w-full h-12 px-4 rounded-xl bg-surface border border-border text-base transition-shadow focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer',
            error && 'border-danger focus:ring-danger/30',
            className,
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'

export { Select }
