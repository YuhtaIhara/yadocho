'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useGuests } from '@/lib/hooks/useGuests'
import { createGuest } from '@/lib/api/guests'

export default function GuestList() {
  const router = useRouter()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const { data: guests = [], isLoading } = useGuests(search || undefined)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [allergy, setAllergy] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!name) return
    setSaving(true)
    try {
      const guest = await createGuest({
        name,
        phone: phone || undefined,
        address: address || undefined,
        allergy: allergy || undefined,
        notes: notes || undefined,
      })
      qc.invalidateQueries({ queryKey: ['guests'] })
      setAdding(false)
      setName('')
      setPhone('')
      setAddress('')
      setAllergy('')
      setNotes('')
      router.push(`/guests/${guest.id}`)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'ゲスト登録に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="ゲスト管理"
        rightSlot={
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full active:bg-primary-soft"
          >
            <Plus size={20} className="text-primary" />
          </button>
        }
      />

      {/* Add guest form */}
      {adding && (
        <div className="px-4 py-3 border-b border-border/40">
          <div className="space-y-3">
            <p className="text-sm font-bold">新規ゲスト登録</p>
            <Input label="名前" placeholder="山田 太郎" value={name} onChange={e => setName(e.target.value)} />
            <Input label="電話番号" placeholder="09012345678" value={phone} onChange={e => setPhone(e.target.value)} />
            <Input label="住所" placeholder="東京都渋谷区..." value={address} onChange={e => setAddress(e.target.value)} />
            <Input label="アレルギー" placeholder="甲殻類、そばなど" value={allergy} onChange={e => setAllergy(e.target.value)} />
            <Input label="メモ" placeholder="備考" value={notes} onChange={e => setNotes(e.target.value)} />
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setAdding(false)}>キャンセル</Button>
              <Button className="flex-1" onClick={handleAdd} disabled={!name || saving}>{saving ? '登録中…' : '登録'}</Button>
            </div>
          </div>
        </div>
      )}

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
                    <p className="text-xs text-text-2 mt-0.5">{g.phone ?? '電話番号なし'}</p>
                    {g.allergy && (
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-danger-soft text-danger text-xs font-medium">
                        ⚠ {g.allergy}
                      </span>
                    )}
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
