'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, UtensilsCrossed, Plus, Receipt, Menu } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/calendar', label: 'カレンダー', icon: Calendar },
  { href: '/meals', label: '食事', icon: UtensilsCrossed },
  { href: '/reservations/new', label: '新規予約', icon: Plus, isCenter: true },
  { href: '/billing', label: '請求', icon: Receipt },
  { href: '/menu', label: 'メニュー', icon: Menu },
] as const

export default function BottomNav() {
  const pathname = usePathname()

  const hiddenRoutes = ['/login', '/setup']
  if (hiddenRoutes.some(r => pathname.startsWith(r))) return null

  return (
    <nav className="no-print fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border/50">
      <div className="max-w-xl mx-auto flex items-end justify-around px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {NAV_ITEMS.map(({ href, label, icon: Icon, ...rest }) => {
          const isCenter = 'isCenter' in rest && rest.isCenter
          const active =
            pathname === '/'
              ? href === '/calendar'
              : href === '/reservations/new'
                ? pathname === '/reservations/new'
                : pathname.startsWith(href)

          if (isCenter) {
            return (
              <Link key={href} href={href} className="flex flex-col items-center -mt-5 relative">
                <span className="flex items-center justify-center w-[64px] h-[64px] rounded-full bg-primary active:scale-95 transition-transform" style={{ boxShadow: '0 4px 12px rgba(196,105,74,0.4)' }}>
                  <Icon size={26} strokeWidth={2.2} className="text-primary-foreground" />
                </span>
                {label && <span className="text-[13px] font-medium text-primary mt-0.5">{label}</span>}
              </Link>
            )
          }

          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-0.5 min-w-[56px] min-h-[44px] py-1 relative justify-center">
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-11 h-8 rounded-full bg-primary-soft transition-all duration-300" />
              )}
              <Icon
                size={22}
                strokeWidth={1.75}
                className={`relative z-10 ${active ? 'text-primary' : 'text-text-3'}`}
              />
              <span className={`relative z-10 leading-tight text-[13px] tracking-wide ${active ? 'font-medium text-primary' : 'font-medium text-text-3'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
