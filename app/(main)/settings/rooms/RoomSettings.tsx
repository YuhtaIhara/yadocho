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
import { createRoom, updateRoom, deleteRoom } from '@/lib/api/rooms'
import { ROOM_TYPE_LABELS, type RoomType } from '@/lib/types'

const ROOM_TYPES: RoomType[] = ['japanese', 'western', 'mixed', 'other']

export default function RoomSettings() {
  const qc = useQueryClient()
  const { data: rooms = [] } = useRooms()
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<RoomType>('japanese')
  const [newCapacity, setNewCapacity] = useState(2)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState<RoomType>('japanese')
  const [editCapacity, setEditCapacity] = useState(2)

  async function handleAdd() {
    if (!newName.trim()) return
    await createRoom({
      name: newName.trim(),
      room_type: newType,
      capacity: newCapacity,
      sort_order: rooms.length,
    })
    qc.invalidateQueries({ queryKey: ['rooms'] })
    setNewName('')
    setNewType('japanese')
    setNewCapacity(2)
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return
    await updateRoom(id, {
      name: editName.trim(),
      room_type: editType,
      capacity: editCapacity,
    })
    qc.invalidateQueries({ queryKey: ['rooms'] })
    setEditingId(null)
  }

  async function handleDelete(id: string) {
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
          <h3 className="text-sm font-bold text-text-2 mb-3">部屋を追加</h3>
          <div className="space-y-3">
            <Input
              label="部屋名"
              placeholder="例: 201"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1">タイプ</label>
              <div className="flex gap-2 flex-wrap">
                {ROOM_TYPES.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      newType === t
                        ? 'bg-primary text-white'
                        : 'bg-surface border border-border text-text-2'
                    }`}
                  >
                    {ROOM_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
            <Input
              label="定員"
              type="number"
              min={1}
              max={20}
              value={String(newCapacity)}
              onChange={e => setNewCapacity(Number(e.target.value) || 1)}
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
                  <div className="flex gap-2 flex-wrap">
                    {ROOM_TYPES.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setEditType(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          editType === t
                            ? 'bg-primary text-white'
                            : 'bg-surface border border-border text-text-2'
                        }`}
                      >
                        {ROOM_TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                  <Input
                    label="定員"
                    type="number"
                    min={1}
                    max={20}
                    value={String(editCapacity)}
                    onChange={e => setEditCapacity(Number(e.target.value) || 1)}
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
                      setEditType(room.room_type ?? 'japanese')
                      setEditCapacity(room.capacity || 2)
                    }}
                    className="text-left flex-1 min-w-0"
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold">{room.name}</p>
                      <Badge variant="default">{ROOM_TYPE_LABELS[room.room_type ?? 'japanese']}</Badge>
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
