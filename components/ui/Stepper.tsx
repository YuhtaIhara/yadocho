'use client'

import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type Props = {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}

export default function Stepper({ value, onChange, min = 0, max = 99 }: Props) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
          value <= min
            ? 'text-text-3/30'
            : 'text-primary bg-primary-soft active:bg-primary/20',
        )}
      >
        <Minus size={16} strokeWidth={2.5} />
      </button>
      <span className="w-8 text-center text-sm font-bold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
          value >= max
            ? 'text-text-3/30'
            : 'text-primary bg-primary-soft active:bg-primary/20',
        )}
      >
        <Plus size={16} strokeWidth={2.5} />
      </button>
    </div>
  )
}
