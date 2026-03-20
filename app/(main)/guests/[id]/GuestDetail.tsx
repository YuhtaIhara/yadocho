'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Phone, Mail, MapPin, AlertTriangle, Pencil, Save, X, Trash2 } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { useGuest } from '@/lib/hooks/useGuests'
import { useReservations } from '@/lib/hooks/useReservations'
import { updateGuest, deleteGuest } from '@/lib/api/guests'
import { roomLabel } from '@/lib/types'
import { formatDateJP, nightCount, toDateStr } from '@/lib/utils/date'
import { useQueryClient } from '@tanstack/react-query'
import { subYears } from 'date-fns'

export default function GuestDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const { data: guest, isLoading } = useGuest(id)
  const from = toDateStr(subYears(new Date(), 3))
  const to = toDateStr(new Date())
  const { data: allRes = [] } = useReservations(from, to)
  const history = allRes.filter(r => r.guest_id === id).sort((a, b) => b.checkin.localeCompare(a.checkin))

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    allergy: '',
    notes: '',
  })

  function startEdit() {
    if (!guest) return
    setForm({
      name: guest.name,
      phone: guest.phone ?? '',
      email: guest.email ?? '',
      address: guest.address ?? '',
      allergy: guest.allergy ?? '',
      notes: guest.notes ?? '',
    })
    setEditing(true)
  }

  async function saveEdit() {
    try {
      await updateGuest(id, {
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        allergy: form.allergy || null,
        notes: form.notes || null,
      })
      qc.invalidateQueries({ queryKey: ['guest', id] })
      qc.invalidateQueries({ queryKey: ['guests'] })
      setEditing(false)
    } catch (e) {
      alert(e instanceof Error ? e.message : '保存に失敗しました')
    }
  }

  async function handleDelete() {
    const msg = history.length > 0
      ? `${guest!.name} を削除しますか？関連する予約 ${history.length} 件も削除されます。`
      : `${guest!.name} を削除しますか？`
    if (!confirm(msg)) return
    await deleteGuest(id)
    qc.invalidateQueries({ queryKey: ['guests'] })
    router.push('/guests')
  }

  if (isLoading || !guest) {
    return (
      <div>
        <PageHeader title="ゲスト詳細" />
        <div className="flex items-center justify-center h-48 text-sm text-text-3">
          {isLoading ? '読み込み中…' : 'ゲストが見つかりません'}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="ゲスト詳細"
        rightSlot={
          editing ? (
            <div className="flex gap-1">
              <button type="button" onClick={() => setEditing(false)} className="w-10 h-10 flex items-center justify-center rounded-full active:bg-primary-soft">
                <X size={18} className="text-text-2" />
              </button>
              <button type="button" onClick={saveEdit} className="w-10 h-10 flex items-center justify-center rounded-full active:bg-primary-soft">
                <Save size={18} className="text-primary" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={startEdit} className="w-10 h-10 flex items-center justify-center rounded-full active:bg-primary-soft">
              <Pencil size={18} className="text-text-2" />
            </button>
          )
        }
      />

      <div className="px-4 py-4 space-y-4 pb-32">
        {editing ? (
          <Card className="space-y-3">
            <Input label="名前" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Input label="電話番号" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <Input label="メール" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <Input label="住所" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            <Input label="アレルギー" value={form.allergy} onChange={e => setForm(f => ({ ...f, allergy: e.target.value }))} />
            <Textarea label="メモ" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </Card>
        ) : (
          <>
            <Card>
              <p className="text-lg font-bold">{guest.name}</p>
              <div className="mt-3 space-y-2 text-sm">
                {guest.phone && (
                  <a href={`tel:${guest.phone}`} className="flex items-center gap-2 text-primary">
                    <Phone size={14} /> {guest.phone}
                  </a>
                )}
                {guest.email && (
                  <div className="flex items-center gap-2 text-text-2">
                    <Mail size={14} /> {guest.email}
                  </div>
                )}
                {guest.address && (
                  <div className="flex items-center gap-2 text-text-2">
                    <MapPin size={14} /> {guest.address}
                  </div>
                )}
              </div>
              {guest.allergy && (
                <div className="flex items-center gap-2 mt-3 text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">
                  <AlertTriangle size={14} /> アレルギー: {guest.allergy}
                </div>
              )}
              {guest.notes && (
                <p className="mt-3 text-sm text-text-2 bg-primary-soft/30 rounded-lg px-3 py-2">
                  {guest.notes}
                </p>
              )}
            </Card>

            <Button
              size="lg"
              className="w-full"
              onClick={() => router.push(`/reservations/new?phone=${encodeURIComponent(guest.phone ?? '')}`)}
            >
              この人で新規予約
            </Button>
          </>
        )}

        {/* History */}
        <section>
          <h2 className="text-sm font-bold text-text-2 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-primary rounded-full" />
            宿泊履歴（{history.length}回）
          </h2>
          {history.length === 0 ? (
            <p className="text-sm text-text-3">履歴なし</p>
          ) : (
            <div className="space-y-2">
              {history.map(r => (
                <Card
                  key={r.id}
                  className="py-2.5 cursor-pointer active:scale-[0.98] transition-transform"
                  onClick={() => router.push(`/reservations/${r.id}`)}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      {formatDateJP(r.checkin)} {roomLabel(r)} {nightCount(r.checkin, r.checkout)}泊
                    </span>
                    <Badge
                      variant={
                        r.status === 'cancelled'
                          ? 'danger'
                          : r.status === 'settled'
                            ? 'accent'
                            : 'default'
                      }
                    >
                      {roomLabel(r)}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <Button variant="danger" size="lg" className="w-full" onClick={handleDelete}>
          <Trash2 size={16} className="mr-1" />ゲストを削除
        </Button>
      </div>
    </div>
  )
}
