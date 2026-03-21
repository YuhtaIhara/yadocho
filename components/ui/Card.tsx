import { cn } from '@/lib/utils/cn'

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'status'
  statusColor?: string
}

export function Card({ className, variant = 'default', statusColor, style, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface rounded-2xl shadow-card border border-border/40 p-5 hover:shadow-elevated transition-all duration-200 active:scale-[0.99]',
        variant === 'status' && 'border-l-4',
        className,
      )}
      style={{
        ...(variant === 'status' && statusColor ? { borderLeftColor: statusColor } : {}),
        ...style,
      }}
      {...props}
    />
  )
}
