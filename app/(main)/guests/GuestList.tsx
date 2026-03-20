'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, UserPlus } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { useGuests } from '@/lib/hooks/useGuests'

export default function GuestList() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const { data: guests = [], isLoading } = useGuests(search || undefined)

  return (
    <div>
      <PageHeader title="ゲスト管理" />

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-3"
          />
          <input
            type="text"
            placeholder="名前・電話番号で検索"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface border border-border text-sm placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="px-4 pb-32">
        {isLoading ? (
          <p className="text-sm text-text-3 text-center py-8">読み込み中…</p>
        ) : guests.length === 0 ? (
          <p className="text-sm text-text-3 text-center py-8">
            {search ? '該当するゲストが見つかりません' : 'ゲストが登録されていません'}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {guests.map(g => (
              <Card
                key={g.id}
                className="stagger-item active:scale-[0.98] transition-transform cursor-pointer"
                onClick={() => router.push(`/guests/${g.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{g.name}</p>
                    <p className="text-xs text-text-2 mt-0.5">
                      {g.phone ?? '電話番号なし'}
                      {g.allergy && (
                        <span className="text-danger ml-2">⚠ {g.allergy}</span>
                      )}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
