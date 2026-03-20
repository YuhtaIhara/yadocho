'use client'

import { useState, useRef } from 'react'
import { format, isSameDay, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, LogIn, LogOut, Ban, Check, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils/cn'
import { roomLabel } from '@/lib/types'
import { useUpdateBlockedDate } from '@/lib/hooks/useBlockedDates'
import type { Reservation, BlockedDate, Room } from '@/lib/types'

type Props = {
  date: Date
  reservations: Reservation[]
  blockedDates?: BlockedDate[]
  rooms?: Room[]
  onPrevDay: () => void
  onNextDay: () => void
  onToday: () => void
  onSelectDate?: (date: Date) => void
  onSelectReservation?: (id: string) => void
}

export default function DayPanel({
  date,
  reservations,
  blockedDates = [],
  rooms = [],
  onPrevDay,
  onNextDay,
  onToday,
  onSelectDate,
  onSelectReservation,
}: Props) {
  const dateStr = format(date, 'yyyy-MM-dd')
  const isToday = isSameDay(date, new Date())
  const dateInputRef = useRef<HTMLInputElement>(null)

  const checkIns = reservations.filter(r => r.checkin === dateStr)
  const checkOuts = reservations.filter(r => r.checkout === dateStr)
  const staying = reservations.filter(
    r => r.checkin < dateStr && r.checkout > dateStr && r.status !== 'cancelled',
  )

  const empty = checkIns.length === 0 && checkOuts.length === 0 && staying.length === 0

  function handleDatePick(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    if (!val) return
    onSelectDate?.(parseISO(val))
  }

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

        <div className="flex items-center gap-2 relative">
          <button
            type="button"
            onClick={() => dateInputRef.current?.showPicker()}
            className="flex items-center gap-2"
          >
            <span className="text-base font-bold">
              {format(date, 'M/d（E）', { locale: ja })}
            </span>
            {isToday && <Badge>今日</Badge>}
          </button>
          <input
            ref={dateInputRef}
            type="date"
            value={dateStr}
            onChange={handleDatePick}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            tabIndex={-1}
          />
        </div>

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
            <div key={r.id} className="stagger-item">
              <ResCard reservation={r} onClick={() => onSelectReservation?.(r.id)} />
            </div>
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
            <div key={r.id} className="stagger-item">
              <ResCard reservation={r} onClick={() => onSelectReservation?.(r.id)} />
            </div>
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
            <div key={r.id} className="stagger-item">
              <ResCard reservation={r} onClick={() => onSelectReservation?.(r.id)} />
            </div>
          ))}
        </Section>
      )}

      {/* ── Blocked dates ── */}
      {blockedDates.length > 0 && (
        <Section
          icon={<Ban size={14} className="text-danger" />}
          title={`休業 — ${blockedDates.length}室`}
          dotColor="bg-danger"
        >
          <DailyReasonEditor blockedDates={blockedDates} />
          {blockedDates.map(b => (
            <div key={b.id} className="stagger-item">
              <BlockedCard block={b} rooms={rooms} />
            </div>
          ))}
        </Section>
      )}

      {/* ── Empty state ── */}
      {empty && blockedDates.length === 0 && (
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
      <div className="space-y-4">{children}</div>
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
          {roomLabel(r)} · {personLabel}
          {r.checkin_time && ` · ${r.checkin_time.slice(0, 5)}`}
        </p>
      </div>
      <Badge
        variant={
          r.status === 'settled' ? 'accent' : r.status === 'cancelled' ? 'danger' : 'default'
        }
      >
        {roomLabel(r)}
      </Badge>
    </Card>
  )
}

/** Edit a shared reason for ALL blocked dates on this day */
function DailyReasonEditor({ blockedDates }: { blockedDates: BlockedDate[] }) {
  const [editing, setEditing] = useState(false)
  // Use the first block's reason as the "shared" reason
  const sharedReason = blockedDates[0]?.reason ?? ''
  const [reason, setReason] = useState(sharedReason)
  const updateBlocked = useUpdateBlockedDate()

  function handleSave() {
    // Update ALL blocks for this day with the same reason
    blockedDates.forEach(b => {
      updateBlocked.mutate({ id: b.id, reason: reason.trim() || null })
    })
    setEditing(false)
  }

  return (
    <Card className="py-2.5 px-3 border-danger/20 bg-danger/[0.03]">
      {!editing ? (
        <button
          type="button"
          onClick={() => { setReason(sharedReason); setEditing(true) }}
          className="w-full text-left text-sm"
        >
          <span className="text-xs font-semibold text-danger">休業理由（共通）</span>
          <p className="text-text-2 mt-0.5">{sharedReason || '（タップして理由を入力）'}</p>
        </button>
      ) : (
        <div>
          <span className="text-xs font-semibold text-danger">休業理由（全室共通）</span>
          <div className="flex items-center gap-2 mt-1.5">
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="定休日、改装工事 など"
              className="flex-1 text-sm px-2.5 py-1.5 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') setEditing(false)
              }}
            />
            <button
              type="button"
              onClick={handleSave}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white active:brightness-90"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-surface border border-border active:bg-primary-soft"
            >
              <X size={14} className="text-text-2" />
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}

function BlockedCard({ block, rooms }: { block: BlockedDate; rooms: Room[] }) {
  const [editing, setEditing] = useState(false)
  const [reason, setReason] = useState(block.reason ?? '')
  const updateBlocked = useUpdateBlockedDate()

  const roomName = rooms.find(r => r.id === block.room_id)?.name ?? '—'

  function handleSave() {
    updateBlocked.mutate(
      { id: block.id, reason: reason.trim() || null },
      { onSuccess: () => setEditing(false) },
    )
  }

  function handleCancel() {
    setReason(block.reason ?? '')
    setEditing(false)
  }

  return (
    <Card className="py-2.5 px-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-danger bg-danger/10 px-2 py-0.5 rounded shrink-0">
            {roomName}
          </span>
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs text-text-3 truncate active:text-text-1 transition-colors"
            >
              {block.reason || '理由を追加…'}
            </button>
          )}
        </div>
      </div>
      {editing && (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="理由（任意）"
            className="flex-1 text-sm px-2.5 py-1.5 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') handleCancel()
            }}
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={updateBlocked.isPending}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white active:brightness-90 disabled:opacity-50"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-surface border border-border active:bg-primary-soft"
          >
            <X size={14} className="text-text-2" />
          </button>
        </div>
      )}
    </Card>
  )
}
