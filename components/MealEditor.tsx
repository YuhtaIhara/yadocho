'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Stepper from '@/components/ui/Stepper'
import { Button } from '@/components/ui/Button'
import { upsertMealDays } from '@/lib/api/meals'
import { formatDateJP } from '@/lib/utils/date'
import type { MealDay } from '@/lib/types'

type Props = {
  reservationId: string
  mealDays: MealDay[]
  open: boolean
  onClose: () => void
  onSaved: () => void
}

type EditableMealDay = {
  date: string
  breakfast_adults: number
  breakfast_children: number
  lunch_adults: number
  lunch_children: number
  dinner_adults: number
  dinner_children: number
  dinner_time: string | null
}

const DINNER_TIMES = (() => {
  const times: string[] = []
  for (let h = 17; h <= 20; h++) {
    times.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 20) times.push(`${String(h).padStart(2, '0')}:30`)
  }
  return times
})()

function toEditable(md: MealDay): EditableMealDay {
  return {
    date: md.date,
    breakfast_adults: md.breakfast_adults,
    breakfast_children: md.breakfast_children,
    lunch_adults: md.lunch_adults,
    lunch_children: md.lunch_children,
    dinner_adults: md.dinner_adults,
    dinner_children: md.dinner_children,
    dinner_time: md.dinner_time,
  }
}

export default function MealEditor({ reservationId, mealDays, open, onClose, onSaved }: Props) {
  const [days, setDays] = useState<EditableMealDay[]>(() => mealDays.map(toEditable))
  const [saving, setSaving] = useState(false)

  // Reset state when modal opens with new data
  function handleOpen() {
    setDays(mealDays.map(toEditable))
  }

  function updateDay(idx: number, patch: Partial<EditableMealDay>) {
    setDays(prev => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const inputs = days.map(d => ({
        reservation_id: reservationId,
        date: d.date,
        dinner_adults: d.dinner_adults,
        dinner_children: d.dinner_children,
        dinner_time: d.dinner_time,
        breakfast_adults: d.breakfast_adults,
        breakfast_children: d.breakfast_children,
        breakfast_time: null,
        lunch_adults: d.lunch_adults,
        lunch_children: d.lunch_children,
        lunch_time: null,
        notes: null,
      }))
      await upsertMealDays(inputs)
      onSaved()
      onClose()
    } catch (e) {
      console.error('Failed to save meal days:', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="食事編集">
      <div className="space-y-5 max-h-[60vh] overflow-y-auto -mx-4 px-4">
        {days.map((day, idx) => (
          <div key={day.date} className="space-y-3">
            <p className="text-sm font-bold text-text-1">{formatDateJP(day.date)}</p>

            {/* Breakfast */}
            <div className="grid grid-cols-[1fr_auto] items-center gap-y-1.5">
              <span className="text-xs text-text-2">朝食 大人</span>
              <Stepper
                value={day.breakfast_adults}
                onChange={v => updateDay(idx, { breakfast_adults: v })}
              />
              <span className="text-xs text-text-2">朝食 子供</span>
              <Stepper
                value={day.breakfast_children}
                onChange={v => updateDay(idx, { breakfast_children: v })}
              />
            </div>

            {/* Lunch */}
            <div className="grid grid-cols-[1fr_auto] items-center gap-y-1.5">
              <span className="text-xs text-text-2">昼食 大人</span>
              <Stepper
                value={day.lunch_adults}
                onChange={v => updateDay(idx, { lunch_adults: v })}
              />
              <span className="text-xs text-text-2">昼食 子供</span>
              <Stepper
                value={day.lunch_children}
                onChange={v => updateDay(idx, { lunch_children: v })}
              />
            </div>

            {/* Dinner */}
            <div className="grid grid-cols-[1fr_auto] items-center gap-y-1.5">
              <span className="text-xs text-text-2">夕食 大人</span>
              <Stepper
                value={day.dinner_adults}
                onChange={v => updateDay(idx, { dinner_adults: v })}
              />
              <span className="text-xs text-text-2">夕食 子供</span>
              <Stepper
                value={day.dinner_children}
                onChange={v => updateDay(idx, { dinner_children: v })}
              />
              <span className="text-xs text-text-2">夕食時間</span>
              <select
                value={day.dinner_time ?? ''}
                onChange={e => updateDay(idx, { dinner_time: e.target.value || null })}
                className="h-8 rounded-lg border border-border bg-surface px-2 text-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">未設定</option>
                {DINNER_TIMES.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {idx < days.length - 1 && <hr className="border-border/40" />}
          </div>
        ))}

        {days.length === 0 && (
          <p className="text-sm text-text-3 text-center py-4">食事データがありません</p>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          キャンセル
        </Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving || days.length === 0}>
          {saving ? '保存中…' : '保存'}
        </Button>
      </div>
    </Modal>
  )
}
