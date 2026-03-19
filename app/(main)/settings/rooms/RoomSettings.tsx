'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useRooms } from '@/lib/hooks/useRooms'
import { createRoom, updateRoom, deleteRoom } from '@/lib/api/rooms'

export default function RoomSettings() {
  const qc = useQueryClient()
  const { data: rooms = [] } = useRooms()
  const [newName, setNewName] = useState('')
  const [newCapacity, setNewCapacity] = useState('2')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  async function handleAdd() {
    if (!newName.trim()) return
    await createRoom({
      name: newName.trim(),
      capacity: parseInt(newCapacity) || 2,
      sort_order: rooms.length,
    })
    qc.invalidateQueries({ queryKey: ['rooms'] })
    setNewName('')
    setNewCapacity('2')
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return
    await updateRoom(id, { name: editName.trim() })
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
          <div className="flex gap-2">
            <Input
              placeholder="部屋名 (例: 201)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="定員"
              type="number"
              value={newCapacity}
              onChange={e => setNewCapacity(e.target.value)}
              className="w-20"
            />
            <Button onClick={handleAdd} size="md">
              <Plus size={16} />
            </Button>
          </div>
        </Card>

        {/* Room list */}
        <div className="space-y-2">
          {rooms.map(room => (
            <Card key={room.id} className="flex items-center justify-between py-3">
              {editingId === room.id ? (
                <div className="flex gap-2 flex-1">
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleUpdate(room.id)}
                  />
                  <Button size="sm" onClick={() => handleUpdate(room.id)}>
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
                      setEditingId(room.id)
                      setEditName(room.name)
                    }}
                    className="text-left flex-1"
                  >
                    <p className="text-sm font-bold">{room.name}</p>
                    <p className="text-xs text-text-3">定員 {room.capacity}名</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(room.id)}
                    className="w-10 h-10 flex items-center justify-center text-danger/50 active:text-danger"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
