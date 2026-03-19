'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { fetchTaxPeriods, createTaxPeriod, deleteTaxPeriod } from '@/lib/api/tax'

export default function TaxSettings() {
  const qc = useQueryClient()
  const { data: periods = [] } = useQuery({
    queryKey: ['taxPeriods'],
    queryFn: fetchTaxPeriods,
  })
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    rate_percent: '3.5',
    threshold: '6000',
    effective_from: '2026-06-01',
    effective_to: '',
    notes: '',
  })

  async function handleAdd() {
    await createTaxPeriod({
      rate_percent: parseFloat(form.rate_percent) || 0,
      threshold: parseInt(form.threshold) || 6000,
      effective_from: form.effective_from,
      effective_to: form.effective_to || null,
      notes: form.notes || undefined,
    })
    qc.invalidateQueries({ queryKey: ['taxPeriods'] })
    setShowAdd(false)
    setForm({ rate_percent: '3.5', threshold: '6000', effective_from: '', effective_to: '', notes: '' })
  }

  async function handleDelete(id: string) {
    if (!confirm('この税期間を削除しますか？')) return
    await deleteTaxPeriod(id)
    qc.invalidateQueries({ queryKey: ['taxPeriods'] })
  }

  return (
    <div>
      <PageHeader title="宿泊税" />

      <div className="px-4 py-4 space-y-4 pb-32">
        <p className="text-sm text-text-2">
          野沢温泉村の宿泊税は2026年6月1日開始。1人1泊6,000円以上の場合に課税されます。
        </p>

        {/* Existing periods */}
        {periods.map(p => (
          <Card key={p.id} className="flex items-start justify-between">
            <div className="text-sm">
              <p className="font-bold">{p.rate_percent}%（免税点 {p.threshold.toLocaleString()}円）</p>
              <p className="text-text-2 mt-0.5">
                {p.effective_from} 〜 {p.effective_to ?? '現在'}
              </p>
              {p.notes && <p className="text-text-3 mt-0.5">{p.notes}</p>}
            </div>
            <button
              type="button"
              onClick={() => handleDelete(p.id)}
              className="w-10 h-10 flex items-center justify-center text-danger/50 active:text-danger shrink-0"
            >
              <Trash2 size={16} />
            </button>
          </Card>
        ))}

        {/* Add form */}
        {showAdd ? (
          <Card className="space-y-3">
            <h3 className="text-sm font-bold text-text-2">税期間を追加</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="税率(%)"
                type="number"
                value={form.rate_percent}
                onChange={e => setForm(f => ({ ...f, rate_percent: e.target.value }))}
              />
              <Input
                label="免税点(円)"
                type="number"
                value={form.threshold}
                onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))}
              />
              <Input
                label="開始日"
                type="date"
                value={form.effective_from}
                onChange={e => setForm(f => ({ ...f, effective_from: e.target.value }))}
              />
              <Input
                label="終了日"
                type="date"
                value={form.effective_to}
                onChange={e => setForm(f => ({ ...f, effective_to: e.target.value }))}
              />
            </div>
            <Input
              label="メモ"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleAdd}>追加</Button>
              <Button variant="ghost" onClick={() => setShowAdd(false)}>取消</Button>
            </div>
          </Card>
        ) : (
          <Button variant="secondary" className="w-full" onClick={() => setShowAdd(true)}>
            <Plus size={16} className="mr-1" />
            税期間を追加
          </Button>
        )}
      </div>
    </div>
  )
}
