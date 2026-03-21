'use client'

import { useState } from 'react'
import { Plus, Star, Trash2, Edit2 } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { usePricingPlans, useCreatePricingPlan, useUpdatePricingPlan, useDeletePricingPlan } from '@/lib/hooks/usePricingPlans'
import { getInnId } from '@/lib/auth'
import { formatYen } from '@/lib/utils/format'
import type { PricingPlan } from '@/lib/types'

type FormState = {
  name: string
  adult_price: number
  child_price: number
  dinner_price: number
  child_dinner_price: number
  breakfast_price: number
  child_breakfast_price: number
  lunch_price: number
  child_lunch_price: number
}

const EMPTY_FORM: FormState = {
  name: '',
  adult_price: 8500,
  child_price: 5000,
  dinner_price: 2000,
  child_dinner_price: 1500,
  breakfast_price: 800,
  child_breakfast_price: 500,
  lunch_price: 0,
  child_lunch_price: 0,
}

function planToForm(plan: PricingPlan): FormState {
  return {
    name: plan.name,
    adult_price: plan.adult_price,
    child_price: plan.child_price,
    dinner_price: plan.dinner_price,
    child_dinner_price: plan.child_dinner_price,
    breakfast_price: plan.breakfast_price,
    child_breakfast_price: plan.child_breakfast_price,
    lunch_price: plan.lunch_price,
    child_lunch_price: plan.child_lunch_price,
  }
}

export default function PricingSettings() {
  const { showToast } = useToast()
  const { data: plans = [], isLoading } = usePricingPlans()
  const createPlan = useCreatePricingPlan()
  const updatePlan = useUpdatePricingPlan()
  const deletePlan = useDeletePricingPlan()

  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  function set(key: keyof FormState, val: string) {
    if (key === 'name') setForm(f => ({ ...f, name: val }))
    else setForm(f => ({ ...f, [key]: parseInt(val) || 0 }))
  }

  function startNew() {
    setForm(EMPTY_FORM)
    setEditing('new')
  }

  function startEdit(plan: PricingPlan) {
    setForm(planToForm(plan))
    setEditing(plan.id)
  }

  function cancel() {
    setEditing(null)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      showToast('プラン名を入力してください')
      return
    }
    setSaving(true)
    try {
      const innId = await getInnId()
      if (!innId) throw new Error('ログインが必要です')

      if (editing === 'new') {
        await createPlan.mutateAsync({
          inn_id: innId,
          ...form,
          is_default: plans.length === 0,
          sort_order: plans.length,
        })
        showToast('プランを追加しました')
      } else if (editing) {
        await updatePlan.mutateAsync({ id: editing, ...form })
        showToast('プランを更新しました')
      }
      setEditing(null)
    } catch (err) {
      console.error(err)
      showToast('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(plan: PricingPlan) {
    if (plan.is_default) {
      showToast('デフォルトプランは削除できません')
      return
    }
    try {
      await deletePlan.mutateAsync(plan.id)
      showToast('プランを削除しました')
      if (editing === plan.id) setEditing(null)
    } catch (err) {
      console.error(err)
      showToast('削除に失敗しました')
    }
  }

  async function handleSetDefault(plan: PricingPlan) {
    if (plan.is_default) return
    try {
      // 現在のデフォルトを解除
      const current = plans.find(p => p.is_default)
      if (current) await updatePlan.mutateAsync({ id: current.id, is_default: false })
      // 新しいデフォルトを設定
      await updatePlan.mutateAsync({ id: plan.id, is_default: true })
      showToast(`「${plan.name}」をデフォルトに設定しました`)
    } catch (err) {
      console.error(err)
      showToast('設定に失敗しました')
    }
  }

  return (
    <div>
      <PageHeader
        title="料金プラン"
        rightSlot={
          <button
            type="button"
            onClick={startNew}
            className="w-10 h-10 flex items-center justify-center rounded-full active:bg-primary-soft"
          >
            <Plus size={20} className="text-primary" />
          </button>
        }
      />

      <div className="px-4 py-4 space-y-4 pb-32">
        <p className="text-xs text-text-3">
          予約作成時にプランを選ぶと料金が自動入力されます。デフォルトプランは新規予約の初期値になります。
        </p>

        {isLoading && <p className="text-sm text-text-3 text-center py-8">読み込み中…</p>}

        {/* Plan list */}
        {plans.map(plan => (
          <Card key={plan.id} className="relative">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-bold">{plan.name}</p>
                  {plan.is_default && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      デフォルト
                    </span>
                  )}
                </div>
                <div className="text-xs text-text-2 space-y-0.5">
                  <p>宿泊: 大人 {formatYen(plan.adult_price)} / 子供 {formatYen(plan.child_price)}</p>
                  <p>夕食: {formatYen(plan.dinner_price)} / 朝食: {formatYen(plan.breakfast_price)}
                    {plan.lunch_price > 0 && ` / 昼食: ${formatYen(plan.lunch_price)}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!plan.is_default && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(plan)}
                    className="w-9 h-9 flex items-center justify-center rounded-full active:bg-primary-soft"
                    title="デフォルトに設定"
                  >
                    <Star size={16} className="text-text-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => startEdit(plan)}
                  className="w-9 h-9 flex items-center justify-center rounded-full active:bg-primary-soft"
                >
                  <Edit2 size={16} className="text-text-2" />
                </button>
                {!plan.is_default && (
                  <button
                    type="button"
                    onClick={() => handleDelete(plan)}
                    className="w-9 h-9 flex items-center justify-center rounded-full active:bg-danger-soft"
                  >
                    <Trash2 size={16} className="text-danger" />
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}

        {plans.length === 0 && !isLoading && (
          <Card className="text-center py-8">
            <p className="text-sm text-text-3 mb-3">料金プランがありません</p>
            <Button size="sm" onClick={startNew}>プランを作成</Button>
          </Card>
        )}

        {/* Edit / New form */}
        {editing !== null && (
          <Card className="!bg-primary/[0.04] border border-primary/10">
            <p className="text-sm font-bold mb-3">
              {editing === 'new' ? '新しいプラン' : 'プランを編集'}
            </p>
            <div className="space-y-4">
              <Input
                label="プラン名"
                placeholder="例: 通常、シーズン、学生合宿"
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />

              <div>
                <p className="text-xs font-medium text-text-2 mb-2">宿泊料（1泊）</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="大人" type="number" suffix="円" value={String(form.adult_price)} onChange={e => set('adult_price', e.target.value)} />
                  <Input label="子供" type="number" suffix="円" value={String(form.child_price)} onChange={e => set('child_price', e.target.value)} />
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-text-2 mb-2">食事料金（大人）</p>
                <div className="grid grid-cols-3 gap-3">
                  <Input label="朝食" type="number" suffix="円" value={String(form.breakfast_price)} onChange={e => set('breakfast_price', e.target.value)} />
                  <Input label="昼食" type="number" suffix="円" value={String(form.lunch_price)} onChange={e => set('lunch_price', e.target.value)} />
                  <Input label="夕食" type="number" suffix="円" value={String(form.dinner_price)} onChange={e => set('dinner_price', e.target.value)} />
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-text-2 mb-2">食事料金（子供）</p>
                <div className="grid grid-cols-3 gap-3">
                  <Input label="朝食" type="number" suffix="円" value={String(form.child_breakfast_price)} onChange={e => set('child_breakfast_price', e.target.value)} />
                  <Input label="昼食" type="number" suffix="円" value={String(form.child_lunch_price)} onChange={e => set('child_lunch_price', e.target.value)} />
                  <Input label="夕食" type="number" suffix="円" value={String(form.child_dinner_price)} onChange={e => set('child_dinner_price', e.target.value)} />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={cancel}>キャンセル</Button>
                <Button className="flex-1" onClick={handleSave} disabled={saving}>
                  {saving ? '保存中…' : '保存'}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
