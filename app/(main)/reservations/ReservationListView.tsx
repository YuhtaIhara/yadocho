'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useSearchReservations } from '@/lib/hooks/useReservations'
import { formatDateJP } from '@/lib/utils/date'
import { roomLabel, STATUS_LABELS, type ReservationStatus } from '@/lib/types'
import { cn } from '@/lib/utils/cn'

const STATUS_FILTERS: { value: ReservationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'scheduled', label: '予約済み' },
  { value: 'checked_in', label: 'チェックイン' },
  { value: 'settled', label: '精算済み' },
  { value: 'cancelled', label: 'キャンセル' },
]

const STATUS_BADGE: Record<string, 'default' | 'accent' | 'warning' | 'danger' | 'outline'> = {
  scheduled: 'default',
  checked_in: 'warning',
  settled: 'accent',
  cancelled: 'danger',
}

export default function ReservationListView() {
  const router = useRouter()
  const { data: reservations = [], isLoading } = useSearchReservations()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'all'>('all')

  const filtered = useMemo(() => {
    let list = reservations
    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter)
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(
        (r) =>
          r.guest?.name?.toLowerCase().includes(q) ||
          r.guest?.furigana?.toLowerCase().includes(q) ||
          r.guest?.phone?.includes(q) ||
          r.reservation_number?.includes(q),
      )
    }
    return list
  }, [reservations, statusFilter, query])

  return (
    <div>
      <PageHeader title="予約一覧" />

      <div className="px-4 py-3 space-y-3 pb-32">
        {/* Search bar */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sub" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="名前・ふりがな・電話番号で検索"
            className="w-full pl-10 pr-10 py-3 bg-surface border border-border/40 rounded-xl text-body placeholder:text-text-sub focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center"
            >
              <X size={16} className="text-text-sub" />
            </button>
          )}
        </div>

        {/* Status filter chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={cn(
                'shrink-0 px-4 py-2 rounded-full text-sub font-medium transition-colors',
                statusFilter === value
                  ? 'bg-primary text-white'
                  : 'bg-surface border border-border/40 text-text-body',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Results */}
        {isLoading ? (
          <p className="text-center text-sub text-text-sub py-12">読み込み中…</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sub text-text-sub py-12">該当する予約がありません</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sub text-text-sub">{filtered.length}件</p>
            {filtered.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => router.push(`/reservations/${r.id}`)}
                className="w-full text-left"
              >
                <Card className="flex items-center justify-between py-3.5 active:scale-[0.98] transition-transform">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-body font-medium truncate">
                        {r.guest?.name ?? '—'}
                      </span>
                      <Badge variant={STATUS_BADGE[r.status]}>
                        {STATUS_LABELS[r.status]}
                      </Badge>
                    </div>
                    <p className="text-sub text-text-sub mt-0.5">
                      {r.reservation_number && <span className="mr-2">{r.reservation_number}</span>}
                      {formatDateJP(r.checkin)} 〜 {formatDateJP(r.checkout)}　{roomLabel(r)}
                    </p>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
