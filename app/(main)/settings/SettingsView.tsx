'use client'

import Link from 'next/link'
import { Building2, DoorOpen, Coins, Receipt, ChevronRight } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'

const ITEMS = [
  { href: '/settings/inn', icon: Building2, label: '宿の情報' },
  { href: '/settings/rooms', icon: DoorOpen, label: '部屋管理' },
  { href: '/settings/pricing', icon: Coins, label: '料金設定' },
  { href: '/settings/tax', icon: Receipt, label: '宿泊税' },
] as const

export default function SettingsView() {
  return (
    <div>
      <PageHeader title="設定" />

      <div className="px-4 py-4 space-y-2 pb-32">
        {ITEMS.map(({ href, icon: Icon, label }) => (
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
      </div>
    </div>
  )
}
