'use client'

import { format, isSameDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, LogIn, LogOut } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils/cn'
import type { Reservation } from '@/lib/types'

type Props = {
  date: Date
  reservations: Reservation[]
  onPrevDay: () => void
  onNextDay: () => void
  onToday: () => void
  onSelectReservation?: (id: string) => void
}

export default function DayPanel({
  date,
  reservations,
  onPrevDay,
  onNextDay,
  onToday,
  onSelectReservation,
}: Props) {
  const dateStr = format(date, 'yyyy-MM-dd')
  const isToday = isSameDay(date, new Date())

  const checkIns = reservations.filter(r => r.checkin === dateStr)
  const checkOuts = reservations.filter(r => r.checkout === dateStr)
  const staying = reservations.filter(
    r => r.checkin < dateStr && r.checkout > dateStr && r.status !== 'cancelled',
  )

  const empty = checkIns.length === 0 && checkOuts.length === 0 && staying.length === 0

  return (
    <div className="px-4 pt-3 pb-4">
      {/* ── Day navigation ── */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={onPrevDay}
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-primary-soft transition-colors"
        >
          <ChevronLeft size={20} className="text-text-2" />
        </button>

        <button
          type="button"
          onClick={onToday}
          className="flex items-center gap-2"
        >
          <span className="text-base font-bold">
            {format(date, 'M/d（E）', { locale: ja })}
          </span>
          {isToday && <Badge>今日</Badge>}
        </button>

        <button
          type="button"
          onClick={onNextDay}
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-primary-soft transition-colors"
        >
          <ChevronRight size={20} className="text-text-2" />
        </button>
      </div>

      {/* ── Check-ins ── */}
      {checkIns.length > 0 && (
        <Section
          icon={<LogIn size={14} className="text-accent" />}
          title={`チェックイン — ${checkIns.length}件`}
          dotColor="bg-accent"
        >
          {checkIns.map(r => (
            <ResCard key={r.id} reservation={r} onClick={() => onSelectReservation?.(r.id)} />
          ))}
        </Section>
      )}

      {/* ── Check-outs ── */}
      {checkOuts.length > 0 && (
        <Section
          icon={<LogOut size={14} className="text-warning" />}
          title={`チェックアウト — ${checkOuts.length}件`}
          dotColor="bg-warning"
        >
          {checkOuts.map(r => (
            <ResCard key={r.id} reservation={r} onClick={() => onSelectReservation?.(r.id)} />
          ))}
        </Section>
      )}

      {/* ── Staying ── */}
      {staying.length > 0 && (
        <Section
          title={`滞在中 — ${staying.length}件`}
          dotColor="bg-primary"
        >
          {staying.map(r => (
            <ResCard key={r.id} reservation={r} onClick={() => onSelectReservation?.(r.id)} />
          ))}
        </Section>
      )}

      {/* ── Empty state ── */}
      {empty && (
        <p className="text-sm text-text-3 text-center py-8">この日の予約はありません</p>
      )}
    </div>
  )
}

function Section({
  icon,
  title,
  dotColor,
  children,
}: {
  icon?: React.ReactNode
  title: string
  dotColor: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        {icon ?? <span className={cn('w-2 h-2 rounded-full', dotColor)} />}
        <span className="text-sm font-semibold text-text-2">{title}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function ResCard({ reservation: r, onClick }: { reservation: Reservation; onClick?: () => void }) {
  const persons = r.adults + r.children
  const personLabel = r.children > 0 ? `大人${r.adults} 子供${r.children}` : `${persons}名`

  return (
    <Card
      className="flex items-center justify-between py-3 active:scale-[0.98] transition-transform cursor-pointer"
      onClick={onClick}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold truncate">{r.guest?.name ?? '—'} 様</p>
        <p className="text-xs text-text-2 mt-0.5">
          {r.room?.name} · {personLabel}
          {r.checkin_time && ` · ${r.checkin_time.slice(0, 5)}`}
        </p>
      </div>
      <Badge
        variant={
          r.status === 'checked_in' ? 'accent' : r.status === 'checked_out' ? 'outline' : 'default'
        }
      >
        {r.room?.name}
      </Badge>
    </Card>
  )
}
