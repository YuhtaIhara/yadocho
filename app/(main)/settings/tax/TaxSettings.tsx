'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { fetchTaxPeriods, createTaxPeriod, updateTaxPeriod, deleteTaxPeriod } from '@/lib/api/tax'
import { formatDateJP } from '@/lib/utils/date'
import type { TaxPeriod } from '@/lib/types'

export default function TaxSettings() {
  const queryClient = useQueryClient()
  const { data: periods = [] } = useQuery({
    queryKey: ['taxPeriods'],
    queryFn: fetchTaxPeriods,
  })

  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const [newFrom, setNewFrom] = useState('')
  const [newTo, setNewTo] = useState('')
  const [newRate, setNewRate] = useState('')
  const [newThreshold, setNewThreshold] = useState('6000')
  const [newNotes, setNewNotes] = useState('')

  const [editFrom, setEditFrom] = useState('')
  const [editTo, setEditTo] = useState('')
  const [editRate, setEditRate] = useState('')
  const [editThreshold, setEditThreshold] = useState('')
  const [editNotes, setEditNotes] = useState('')

  function resetAddForm() {
    setNewFrom('')
    setNewTo('')
    setNewRate('')
    setNewThreshold('6000')
    setNewNotes('')
    setAdding(false)
  }

  function startEdit(p: TaxPeriod) {
    setEditId(p.id)
    setEditFrom(p.effective_from)
    setEditTo(p.effective_to ?? '')
    setEditRate(String(p.rate_percent))
    setEditThreshold(String(p.threshold))
    setEditNotes(p.notes ?? '')
  }

  async function handleAdd() {
    if (!newFrom || !newRate) return
    await createTaxPeriod({
      rate_percent: parseFloat(newRate),
      threshold: parseInt(newThreshold) || 6000,
      effective_from: newFrom,
      effective_to: newTo || null,
      notes: newNotes || undefined,
    })
    queryClient.invalidateQueries({ queryKey: ['taxPeriods'] })
    resetAddForm()
  }

  async function handleUpdate() {
    if (!editId || !editFrom || !editRate) return
    await updateTaxPeriod(editId, {
      rate_percent: parseFloat(editRate),
      threshold: parseInt(editThreshold) || 6000,
      effective_from: editFrom,
      effective_to: editTo || null,
      notes: editNotes || null,
    })
    queryClient.invalidateQueries({ queryKey: ['taxPeriods'] })
    setEditId(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('この税期間を削除しますか？')) return
    await deleteTaxPeriod(id)
    queryClient.invalidateQueries({ queryKey: ['taxPeriods'] })
  }

  return (
    <div>
      <PageHeader title="宿泊税" />

      <div className="px-4 py-4 flex flex-col gap-4 pb-32">
        <p className="text-sm text-text-2">
          宿泊税の期間と税率を設定してください。チェックイン日に該当する期間の税率が自動適用されます。
        </p>

        {periods.map(p =>
          editId === p.id ? (
            <Card key={p.id} className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <Input label="開始日" type="date" value={editFrom} onChange={e => setEditFrom(e.target.value)} />
                <Input label="終了日" type="date" value={editTo} onChange={e => setEditTo(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="税率" type="number" value={editRate} onChange={e => setEditRate(e.target.value)} suffix="%" />
                <Input label="免税点" type="number" value={editThreshold} onChange={e => setEditThreshold(e.target.value)} suffix="円" />
              </div>
              <Textarea label="メモ" value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="備考" />
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => setEditId(null)}>
                  <X size={14} className="mr-1" />キャンセル
                </Button>
                <Button size="sm" className="flex-1" onClick={handleUpdate}>
                  <Check size={14} className="mr-1" />保存
                </Button>
              </div>
            </Card>
          ) : (
            <Card key={p.id}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold">
                    {formatDateJP(p.effective_from)}〜{p.effective_to ? formatDateJP(p.effective_to) : ''}
                  </p>
                  <p className="text-sm text-text-2 mt-1">
                    税率 {p.rate_percent}% · 免税点 ¥{p.threshold.toLocaleString()}/人泊
                  </p>
                  {p.notes && <p className="text-xs text-text-3 mt-1">{p.notes}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button type="button" onClick={() => startEdit(p)} className="p-2 rounded-full active:bg-primary-soft">
                    <Pencil size={14} className="text-text-3" />
                  </button>
                  <button type="button" onClick={() => handleDelete(p.id)} className="p-2 rounded-full active:bg-danger-soft">
                    <Trash2 size={14} className="text-danger" />
                  </button>
                </div>
              </div>
            </Card>
          ),
        )}

        {periods.length === 0 && !adding && (
          <p className="text-sm text-text-3 text-center py-6">宿泊税は設定されていません</p>
        )}

        {adding ? (
          <Card className="space-y-3">
            <p className="text-sm font-bold text-text-1">新しい税期間</p>
            <div className="grid grid-cols-2 gap-4">
              <Input label="開始日" type="date" value={newFrom} onChange={e => setNewFrom(e.target.value)} />
              <Input label="終了日（任意）" type="date" value={newTo} onChange={e => setNewTo(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="税率" type="number" value={newRate} onChange={e => setNewRate(e.target.value)} suffix="%" placeholder="3.5" />
              <Input label="免税点" type="number" value={newThreshold} onChange={e => setNewThreshold(e.target.value)} suffix="円" />
            </div>
            <Textarea label="メモ（任意）" value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="例: 素泊まり料金基準で課税" />
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1" onClick={resetAddForm}>
                キャンセル
              </Button>
              <Button size="sm" className="flex-1" onClick={handleAdd} disabled={!newFrom || !newRate}>
                追加
              </Button>
            </div>
          </Card>
        ) : (
          <Button variant="secondary" onClick={() => setAdding(true)} className="w-full">
            <Plus size={16} className="mr-1" />税期間を追加
          </Button>
        )}
      </div>
    </div>
  )
}
