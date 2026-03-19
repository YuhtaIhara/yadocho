import { cn } from '@/lib/utils/cn'

type CardProps = React.HTMLAttributes<HTMLDivElement>

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('bg-surface rounded-2xl shadow-card border border-border/40 p-5 hover:shadow-elevated transition-all duration-200 active:scale-[0.99]', className)}
      {...props}
    />
  )
}
