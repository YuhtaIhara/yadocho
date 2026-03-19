'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

type Props = {
  title: string
  showBack?: boolean
  rightSlot?: React.ReactNode
}

export default function PageHeader({ title, showBack = true, rightSlot }: Props) {
  const router = useRouter()

  return (
    <div
      className="sticky top-0 z-10 bg-white/95 backdrop-blur-lg border-b border-border/20"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
    >
      <div className="flex items-center h-14 px-5 gap-3">
        {showBack && (
          <button
            type="button"
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full active:bg-primary-soft transition-colors"
          >
            <ArrowLeft size={20} className="text-text-2" />
          </button>
        )}
        <h1 className="text-xl font-bold flex-1 min-w-0 truncate">{title}</h1>
        {rightSlot && <div className="shrink-0">{rightSlot}</div>}
      </div>
    </div>
  )
}
