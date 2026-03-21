'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useInvoicePresets } from '@/lib/hooks/useInvoicePresets'
import { createPreset, updatePreset, deletePreset } from '@/lib/api/invoices'
import { formatYen } from '@/lib/utils/format'

export default function PresetSettings() {
  const qc = useQueryClient()
  const { data: presets = [] } = useInvoicePresets()
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')

  async function handleAdd() {
    if (!newName.trim() || !newPrice) return
    await createPreset({ name: newName.trim(), price: parseInt(newPrice) || 0 })
    qc.invalidateQueries({ queryKey: ['invoicePresets'] })
    setNewName('')
    setNewPrice('')
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return
    await updatePreset(id, { name: editName.trim(), price: parseInt(editPrice) || 0 })
    qc.invalidateQueries({ queryKey: ['invoicePresets'] })
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('この費目を削除しますか？')) return
    await deletePreset(id)
    qc.invalidateQueries({ queryKey: ['invoicePresets'] })
  }

  return (
    <div>
      <PageHeader title="追加費目" />

      <div className="px-4 py-4 space-y-4 pb-32">
        {/* Add new */}
        <Card>
          <h3 className="text-sm font-medium text-text-2 mb-3">費目を追加</h3>
          <div className="flex gap-2">
            <Input
              placeholder="品目名"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="単価"
              type="number"
              value={newPrice}
              onChange={e => setNewPrice(e.target.value)}
              className="w-24"
            />
            <Button onClick={handleAdd} size="md">
              <Plus size={16} />
            </Button>
          </div>
        </Card>

        {/* Preset list */}
        <div className="space-y-2">
          {presets.map(preset => (
            <Card key={preset.id} className="flex items-center justify-between py-3">
              {editingId === preset.id ? (
                <div className="flex gap-2 flex-1">
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    autoFocus
                  />
                  <input
                    value={editPrice}
                    onChange={e => setEditPrice(e.target.value)}
                    type="number"
                    className="w-24 h-9 px-3 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button size="sm" onClick={() => handleUpdate(preset.id)}>
                    保存
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    取消
                  </Button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(preset.id)
                      setEditName(preset.name)
                      setEditPrice(String(preset.price))
                    }}
                    className="text-left flex-1"
                  >
                    <p className="text-sm font-medium">{preset.name}</p>
                    <p className="text-xs text-text-3">{formatYen(preset.price)}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(preset.id)}
                    className="w-10 h-10 flex items-center justify-center text-danger/50 active:text-danger"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </Card>
          ))}
        </div>

        {presets.length === 0 && (
          <p className="text-sm text-text-3 text-center py-6">
            追加費目が登録されていません
          </p>
        )}
      </div>
    </div>
  )
}
