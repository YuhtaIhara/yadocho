'use client'

import { cn } from '@/lib/utils/cn'

type Option = {
  value: string
  label: string
}

type Props = {
  options: Option[]
  selected: string
  onChange: (value: string) => void
}

export default function SegmentControl({ options, selected, onChange }: Props) {
  return (
    <div
      className="inline-flex bg-bg-secondary rounded-[var(--radius-md)] p-1"
      style={{
        boxShadow: 'inset 2px 2px 4px rgba(180,170,158,0.2), inset -2px -2px 4px rgba(255,255,255,0.5)',
      }}
    >
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-5 py-2.5 rounded-[calc(var(--radius-md)-2px)] text-[15px] font-medium min-h-[48px] flex items-center justify-center transition-all',
            selected === opt.value
              ? 'bg-background text-text-1'
              : 'text-text-3 active:bg-background/50',
          )}
          style={
            selected === opt.value
              ? { boxShadow: '2px 2px 6px rgba(180,170,158,0.2), -2px -2px 4px rgba(255,255,255,0.7)' }
              : undefined
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
