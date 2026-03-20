'use client'

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import PageHeader from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { usePricing } from '@/lib/hooks/usePricing'
import { upsertPricing } from '@/lib/api/pricing'
import { getInnId } from '@/lib/auth'
import { useToast } from '@/components/ui/Toast'

export default function PricingSettings() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const { data: pricing } = usePricing()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    adult_price: 8500,
    child_price: 5000,
    breakfast_price: 800,
    lunch_price: 0,
    dinner_price: 2000,
    child_breakfast_price: 500,
    child_lunch_price: 0,
    child_dinner_price: 1500,
  })

  useEffect(() => {
    if (pricing) {
      setForm({
        adult_price: pricing.adult_price,
        child_price: pricing.child_price,
        breakfast_price: pricing.breakfast_price,
        lunch_price: pricing.lunch_price,
        dinner_price: pricing.dinner_price,
        child_breakfast_price: pricing.child_breakfast_price,
        child_lunch_price: pricing.child_lunch_price,
        child_dinner_price: pricing.child_dinner_price,
      })
    }
  }, [pricing])

  function set(key: keyof typeof form, val: string) {
    setForm(f => ({ ...f, [key]: parseInt(val) || 0 }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const innId = await getInnId()
      if (!innId) throw new Error('ログインが必要です')
      await upsertPricing({ inn_id: innId, ...form })
      qc.invalidateQueries({ queryKey: ['pricing'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error(err)
      showToast('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title="料金設定" />
      <div className="px-4 py-4 space-y-6 pb-32">
        <section>
          <h3 className="text-sm font-bold text-text-2 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-primary rounded-full" />
            宿泊料（1泊）
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Input label="大人" type="number" suffix="円" value={String(form.adult_price)} onChange={e => set('adult_price', e.target.value)} />
            <Input label="子供" type="number" suffix="円" value={String(form.child_price)} onChange={e => set('child_price', e.target.value)} />
          </div>
        </section>

        <section>
          <h3 className="text-sm font-bold text-text-2 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-primary rounded-full" />
            食事料金（大人）
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <Input label="朝食" type="number" suffix="円" value={String(form.breakfast_price)} onChange={e => set('breakfast_price', e.target.value)} />
            <Input label="昼食" type="number" suffix="円" value={String(form.lunch_price)} onChange={e => set('lunch_price', e.target.value)} />
            <Input label="夕食" type="number" suffix="円" value={String(form.dinner_price)} onChange={e => set('dinner_price', e.target.value)} />
          </div>
        </section>

        <section>
          <h3 className="text-sm font-bold text-text-2 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-primary rounded-full" />
            食事料金（子供）
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <Input label="朝食" type="number" suffix="円" value={String(form.child_breakfast_price)} onChange={e => set('child_breakfast_price', e.target.value)} />
            <Input label="昼食" type="number" suffix="円" value={String(form.child_lunch_price)} onChange={e => set('child_lunch_price', e.target.value)} />
            <Input label="夕食" type="number" suffix="円" value={String(form.child_dinner_price)} onChange={e => set('child_dinner_price', e.target.value)} />
          </div>
        </section>

        <Button size="lg" className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </Button>
        {saved && (
          <div className="animate-fade-in-up text-center py-2 px-4 rounded-xl bg-accent/10 text-accent text-sm font-medium">
            保存しました ✓
          </div>
        )}
      </div>
    </div>
  )
}
