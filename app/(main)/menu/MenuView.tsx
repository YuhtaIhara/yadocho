'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Users, BarChart3, Settings, ChevronRight, LogOut } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { signOut } from '@/lib/auth'

const MENU_ITEMS = [
  { href: '/settings', icon: Settings, label: '設定' },
  { href: '/guests', icon: Users, label: 'ゲスト管理' },
  { href: '/report', icon: BarChart3, label: '月次レポート' },
] as const

export default function MenuView() {
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <div>
      <PageHeader title="メニュー" showBack={false} />

      <div className="px-4 py-4 space-y-3 pb-32">
        {MENU_ITEMS.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}>
            <Card className="flex items-center justify-between py-3.5 active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-3">
                <Icon size={18} className="text-primary" />
                <span className="text-sm font-semibold">{label}</span>
              </div>
              <ChevronRight size={16} className="text-text-3" />
            </Card>
          </Link>
        ))}

        <button
          type="button"
          onClick={handleSignOut}
          className="w-full mt-6"
        >
          <Card className="flex items-center gap-3 py-3.5 active:scale-[0.98] transition-transform">
            <LogOut size={18} className="text-danger" />
            <span className="text-sm font-semibold text-danger">ログアウト</span>
          </Card>
        </button>

        <p className="text-center text-xs text-text-3 mt-8">yadocho v0.1.0</p>
      </div>
    </div>
  )
}
