'use client'

import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-2xl font-medium transition-all active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground shadow-[var(--shadow-button)] hover:brightness-105',
        secondary: 'bg-transparent text-primary border-[1.5px] border-primary hover:bg-primary-soft',
        ghost: 'text-text-2 hover:bg-primary-soft',
        danger: 'bg-transparent text-danger border-[1.5px] border-danger hover:bg-danger-soft',
      },
      size: {
        sm: 'h-11 px-3 text-sm gap-1.5 min-h-[44px]',
        md: 'h-11 px-5 text-base gap-2 min-h-[44px]',
        lg: 'h-[52px] px-6 text-base gap-2 min-w-[44px]',
        icon: 'h-11 w-11 min-h-[44px] min-w-[44px]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
