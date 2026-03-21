'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, UserPlus, ChevronDown, ChevronRight } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useQueryClient } from '@tanstack/react-query'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useGuests } from '@/lib/hooks/useGuests'
import { createGuest } from '@/lib/api/guests'
import type { Guest } from '@/lib/types'

/**
 * ふりがな（あれば）or 名前の先頭文字からセクションキーを取得
 * ひらがな・カタカナ → 五十音のあ行〜わ行
 * 漢字 → そのまま先頭1文字
 * その他 → '#'
 */
function getSectionKey(guest: Guest): string {
  const source = guest.furigana || guest.name
  if (!source) return '#'
  const first = source.charAt(0)

  // カタカナ→ひらがな変換してから行判定
  const kana = first.replace(/[\u30A0-\u30FF]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60),
  )

  const code = kana.charCodeAt(0)
  // ひらがな判定
  if (code >= 0x3041 && code <= 0x3093) {
    if (code <= 0x304A) return 'あ'
    if (code <= 0x3054) return 'か'
    if (code <= 0x305E) return 'さ'
    if (code <= 0x3068) return 'た'
    if (code <= 0x306E) return 'な'
    if (code <= 0x307D) return 'は'
    if (code <= 0x3082) return 'ま'
    if (code <= 0x3088) return 'や'
    if (code <= 0x308D) return 'ら'
    return 'わ'
  }
  // 漢字
  if (code >= 0x4E00 && code <= 0x9FFF) return first
  // 英字
  if (/[a-zA-Z]/.test(first)) return first.toUpperCase()
  return '#'
}

type GuestSection = { key: string; guests: Guest[] }

function groupAndSort(guests: Guest[]): GuestSection[] {
  const sorted = [...guests].sort((a, b) => {
    const aKey = a.furigana || a.name
    const bKey = b.furigana || b.name
    return aKey.localeCompare(bKey, 'ja')
  })
  const map = new Map<string, Guest[]>()
  for (const g of sorted) {
    const key = getSectionKey(g)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(g)
  }
  return Array.from(map.entries()).map(([key, guests]) => ({ key, guests }))
}

export default function GuestList() {
  const router = useRouter()
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const { data: guests = [], isLoading } = useGuests(search || undefined)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [furigana, setFurigana] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [company, setCompany] = useState('')
  const [allergy, setAllergy] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const sections = useMemo(() => groupAndSort(guests), [guests])

  function toggleSection(key: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleAdd() {
    if (!name) return
    setSaving(true)
    try {
      const guest = await createGuest({
        name,
        furigana: furigana || undefined,
        phone: phone || undefined,
        address: address || undefined,
        company: company || undefined,
        allergy: allergy || undefined,
        notes: notes || undefined,
      })
      qc.invalidateQueries({ queryKey: ['guests'] })
      setAdding(false)
      setName('')
      setFurigana('')
      setPhone('')
      setAddress('')
      setCompany('')
      setAllergy('')
      setNotes('')
      router.push(`/guests/${guest.id}`)
    } catch (e) {
      showToast('ゲスト登録に失敗しました')
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
            <UserPlus size={20} className="text-primary" />
          </button>
        }
      />

      {/* Add guest form */}
      {adding && (
        <div className="px-4 py-3 border-b border-border/40">
          <div className="space-y-3">
            <p className="text-sm font-medium">新規ゲスト登録</p>
            <Input label="名前" placeholder="山田 太郎" value={name} onChange={e => setName(e.target.value)} />
            <Input label="ふりがな" placeholder="やまだ たろう" value={furigana} onChange={e => setFurigana(e.target.value)} />
            <Input label="電話番号" placeholder="09012345678" value={phone} onChange={e => setPhone(e.target.value)} />
            <Input label="住所" placeholder="東京都渋谷区..." value={address} onChange={e => setAddress(e.target.value)} />
            <Input label="会社名" placeholder="株式会社〇〇" value={company} onChange={e => setCompany(e.target.value)} />
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
            placeholder="名前・ふりがな・電話番号で検索"
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
          <div className="flex flex-col gap-1">
            {sections.map(({ key, guests: sectionGuests }) => {
              const isCollapsed = collapsed.has(key)
              return (
                <div key={key}>
                  {/* Section header */}
                  <button
                    type="button"
                    onClick={() => toggleSection(key)}
                    className="flex items-center gap-2 w-full py-2 px-1 active:bg-primary-soft/50 rounded-lg"
                  >
                    {isCollapsed ? (
                      <ChevronRight size={14} className="text-text-3" />
                    ) : (
                      <ChevronDown size={14} className="text-text-3" />
                    )}
                    <span className="text-xs font-medium text-text-2">{key}</span>
                    <span className="text-xs text-text-3">{sectionGuests.length}</span>
                  </button>

                  {/* Guest cards */}
                  {!isCollapsed && (
                    <div className="flex flex-col gap-2 ml-1 mb-3">
                      {sectionGuests.map(g => (
                        <Card
                          key={g.id}
                          className="stagger-item active:scale-[0.98] transition-transform cursor-pointer"
                          onClick={() => router.push(`/guests/${g.id}`)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{g.name}</p>
                              {g.furigana && <p className="text-[15px] text-text-3 -mt-0.5">{g.furigana}</p>}
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
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
