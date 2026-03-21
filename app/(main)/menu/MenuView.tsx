'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ClipboardList,
  Users,
  Settings,
  BarChart3,
  LogOut,
  LogIn,
  Hotel,
  LogOutIcon,
  FileText,
  Calendar,
  Home,
  DollarSign,
  Receipt,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { signOut } from '@/lib/auth'
import { useInn } from '@/lib/hooks/useInn'
import { useReservations } from '@/lib/hooks/useReservations'
import { toDateStr } from '@/lib/utils/date'
import { subDays, addDays } from 'date-fns'

// ── Greeting by time of day ──
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 11) return 'おはようございます'
  if (hour >= 11 && hour < 17) return 'こんにちは'
  return 'おつかれさまです'
}

// ── Section: 業務 ──
const BUSINESS_ITEMS = [
  { href: '/reservations', icon: ClipboardList, label: '予約一覧' },
  { href: '/guests', icon: Users, label: '顧客管理' },
  { href: '/report', icon: BarChart3, label: '月次レポート' },
  { href: '/report/daily', icon: DollarSign, label: '売上日報' },
  { href: '/report/tax', icon: FileText, label: '税申告書' },
] as const

// ── Section: 設定 ──
const SETTINGS_ITEMS = [
  { href: '/settings', icon: Settings, label: '設定' },
] as const

export default function MenuView() {
  const router = useRouter()
  const { data: inn } = useInn()

  // Fetch reservations covering today
  const today = new Date()
  const dateStr = toDateStr(today)
  const from = toDateStr(subDays(today, 1))
  const to = toDateStr(addDays(today, 1))
  const { data: reservations = [] } = useReservations(from, to)

  // KPI counts
  const checkInCount = reservations.filter((r) => r.checkin === dateStr).length
  const stayingCount = reservations.filter(
    (r) => r.checkin <= dateStr && r.checkout > dateStr,
  ).length
  const checkOutCount = reservations.filter((r) => r.checkout === dateStr).length

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <div>
      {/* ── Greeting header ── */}
      <div
        className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border/20"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
      >
        <div className="flex flex-col h-auto px-5 py-3 gap-0.5">
          <p className="text-sub text-text-sub">{getGreeting()}</p>
          <h1 className="text-title font-medium" style={{ fontFamily: 'var(--font-heading)' }}>
            {inn?.name ?? ''}
          </h1>
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-5 pb-32">
        {/* ── 今日 ── */}
        <section>
          <h2 className="text-section font-medium text-text mb-2" style={{ fontFamily: 'var(--font-body)' }}>
            今日
          </h2>
          <Link href="/calendar" className="block">
            <div className="grid grid-cols-3 gap-3">
              <KpiCard icon={LogIn} label="チェックイン" count={checkInCount} color="var(--color-checkin)" />
              <KpiCard icon={Hotel} label="滞在中" count={stayingCount} color="var(--color-staying)" />
              <KpiCard icon={LogOutIcon} label="チェックアウト" count={checkOutCount} color="var(--color-booked)" />
            </div>
          </Link>
        </section>

        {/* ── 業務 ── */}
        <section>
          <h2 className="text-section font-medium text-text mb-2" style={{ fontFamily: 'var(--font-body)' }}>
            業務
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {BUSINESS_ITEMS.map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href} className="block">
                <Card className="flex flex-col items-center justify-center gap-2 py-5 min-h-[80px]">
                  <Icon size={24} className="text-primary" />
                  <span className="text-body font-medium">{label}</span>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* ── 設定 ── */}
        <section>
          <h2 className="text-section font-medium text-text mb-2" style={{ fontFamily: 'var(--font-body)' }}>
            設定
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {SETTINGS_ITEMS.map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href} className="block">
                <Card className="flex flex-col items-center justify-center gap-2 py-5 min-h-[80px]">
                  <Icon size={24} className="text-primary" />
                  <span className="text-body font-medium">{label}</span>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Logout ── */}
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full mt-2"
        >
          <Card className="flex items-center justify-center gap-3 py-3.5 active:scale-[0.98] transition-transform">
            <LogOut size={18} className="text-danger" />
            <span className="text-body font-medium text-danger">ログアウト</span>
          </Card>
        </button>

        <p className="text-center text-sub text-text-sub mt-4">yadocho v0.2.0</p>
      </div>
    </div>
  )
}

// ── KPI card component ──
function KpiCard({
  icon: Icon,
  label,
  count,
  color,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  count: number
  color: string
}) {
  return (
    <Card className="flex flex-col items-center justify-center gap-1.5 py-4 active:scale-[0.97] transition-transform">
      <div style={{ color }}>
        <Icon size={20} />
      </div>
      <span className="text-amount font-medium" style={{ color }}>
        {count}
      </span>
      <span className="text-sub text-text-sub">{label}</span>
    </Card>
  )
}
