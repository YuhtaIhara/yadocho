import { cn } from '@/lib/utils/cn'

type CardProps = React.HTMLAttributes<HTMLDivElement>

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('bg-surface rounded-[16px] shadow-card p-4', className)}
      {...props}
    />
  )
}
