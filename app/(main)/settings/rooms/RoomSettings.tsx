'use client'

import { useState } from 'react'
import { Plus, Trash2, Users } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useRooms } from '@/lib/hooks/useRooms'
import { useReservations } from '@/lib/hooks/useReservations'
import { createRoom, updateRoom, deleteRoom } from '@/lib/api/rooms'
import { ROOM_TYPE_PRESETS } from '@/lib/types'
import { toDateStr } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'

export default function RoomSettings() {
  const qc = useQueryClient()
  const { data: rooms = [] } = useRooms()
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('和室')
  const [newCapacity, setNewCapacity] = useState(2)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState('和室')
  const [editCapacity, setEditCapacity] = useState(2)

  // For deletion guard: fetch future reservations
  const today = toDateStr(new Date())
  const farFuture = toDateStr(new Date(Date.now() + 365 * 86400000))
  const { data: futureRes = [] } = useReservations(today, farFuture)

  // Collect unique room types from existing rooms + presets
  const allTypes = [...new Set([
    ...ROOM_TYPE_PRESETS,
    ...rooms.map(r => r.room_type).filter(Boolean),
  ])]

  async function handleAdd() {
    if (!newName.trim()) return
    await createRoom({
      name: newName.trim(),
      room_type: newType.trim() || '和室',
      capacity: Math.max(1, newCapacity),
      sort_order: rooms.length,
    })
    qc.invalidateQueries({ queryKey: ['rooms'] })
    setNewName('')
    setNewType('和室')
    setNewCapacity(2)
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return
    await updateRoom(id, {
      name: editName.trim(),
      room_type: editType.trim() || '和室',
      capacity: Math.max(1, editCapacity),
    })
    qc.invalidateQueries({ queryKey: ['rooms'] })
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    // Guard: check if room has future reservations
    const hasRes = futureRes.some(r => r.rooms?.some(room => room.id === id))
    if (hasRes) {
      alert('この部屋には予約があるため削除できません。先に予約を別の部屋に変更してください。')
      return
    }
    if (!confirm('この部屋を削除しますか？')) return
    await deleteRoom(id)
    qc.invalidateQueries({ queryKey: ['rooms'] })
  }

  return (
    <div>
      <PageHeader title="部屋管理" />

      <div className="px-4 py-4 space-y-4 pb-32">
        {/* Add new */}
        <Card>
          <h3 className="text-sm font-medium text-text-2 mb-3">部屋を追加</h3>
          <div className="space-y-3">
            <Input
              label="部屋名"
              placeholder="例: 201"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <RoomTypeSelector value={newType} onChange={setNewType} allTypes={allTypes} />
            <Input
              label="定員"
              type="number"
              min={1}
              max={20}
              value={String(newCapacity)}
              onChange={e => setNewCapacity(Math.max(1, Number(e.target.value) || 1))}
            />
            <Button onClick={handleAdd} size="md" className="w-full">
              <Plus size={16} className="mr-1" /> 追加
            </Button>
          </div>
        </Card>

        {/* Room list */}
        <div className="space-y-2">
          {rooms.map(room => (
            <Card key={room.id} className="py-3">
              {editingId === room.id ? (
                <div className="space-y-3">
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    autoFocus
                  />
                  <RoomTypeSelector value={editType} onChange={setEditType} allTypes={allTypes} />
                  <Input
                    label="定員"
                    type="number"
                    min={1}
                    max={20}
                    value={String(editCapacity)}
                    onChange={e => setEditCapacity(Math.max(1, Number(e.target.value) || 1))}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => handleUpdate(room.id)}>
                      保存
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1" onClick={() => setEditingId(null)}>
                      取消
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(room.id)
                      setEditName(room.name)
                      setEditType(room.room_type || '和室')
                      setEditCapacity(room.capacity || 2)
                    }}
                    className="text-left flex-1 min-w-0"
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{room.name}</p>
                      <Badge variant="default">{room.room_type || '—'}</Badge>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-text-3">
                      <Users size={12} /> 定員{room.capacity || '—'}名
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(room.id)}
                    className="w-10 h-10 flex items-center justify-center text-danger/50 active:text-danger"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Room type selector: preset chips + custom input */
function RoomTypeSelector({
  value,
  onChange,
  allTypes,
}: {
  value: string
  onChange: (v: string) => void
  allTypes: string[]
}) {
  const [customMode, setCustomMode] = useState(false)
  const isPreset = allTypes.includes(value)

  return (
    <div>
      <label className="block text-xs font-medium text-text-2 mb-1">タイプ</label>
      <div className="flex gap-2 flex-wrap">
        {allTypes.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => { onChange(t); setCustomMode(false) }}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px]',
              value === t && !customMode
                ? 'bg-primary text-white'
                : 'bg-surface border border-border text-text-2',
            )}
          >
            {t}
          </button>
        ))}
        <button
          type="button"
          onClick={() => { setCustomMode(true); onChange('') }}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px]',
            customMode
              ? 'bg-primary text-white'
              : 'bg-surface border border-border text-text-2',
          )}
        >
          ＋ カスタム
        </button>
      </div>
      {customMode && (
        <Input
          placeholder="例: 禁煙ツイン"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="mt-2"
          autoFocus
        />
      )}
    </div>
  )
}
