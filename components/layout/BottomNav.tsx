'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, UtensilsCrossed, Plus, Receipt, Menu } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/calendar', label: 'カレンダー', icon: CalendarDays },
  { href: '/meals', label: '食事', icon: UtensilsCrossed },
  { href: '/reservations/new', label: '', icon: Plus, isCenter: true },
  { href: '/billing', label: '会計', icon: Receipt },
  { href: '/menu', label: 'メニュー', icon: Menu },
] as const

export default function BottomNav() {
  const pathname = usePathname()

  const hiddenRoutes = ['/login', '/setup']
  if (hiddenRoutes.some(r => pathname.startsWith(r))) return null

  return (
    <nav className="no-print fixed bottom-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-xl border-t border-border/30">
      <div className="max-w-xl mx-auto flex items-end justify-around px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
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
                <span className="flex items-center justify-center w-[52px] h-[52px] rounded-full shadow-elevated bg-primary active:scale-95 transition-transform">
                  <Icon size={26} strokeWidth={2.2} className="text-primary-foreground" />
                </span>
              </Link>
            )
          }

          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-0.5 min-w-[52px] py-0.5 relative">
              {active && (
                <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-10 h-7 rounded-full bg-primary-soft" />
              )}
              <Icon
                size={22}
                strokeWidth={1.75}
                className={`relative z-10 ${active ? 'text-primary' : 'text-text-3'}`}
              />
              <span className={`relative z-10 leading-tight text-[12px] tracking-wide ${active ? 'font-semibold text-primary' : 'font-medium text-text-3'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
