'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import PageHeader from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { fetchInn, updateInn } from '@/lib/api/inn'

export default function InnSettings() {
  const qc = useQueryClient()
  const { data: inn } = useQuery({ queryKey: ['inn'], queryFn: fetchInn })
  const [form, setForm] = useState({ name: '', address: '', phone: '', representative: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (inn) {
      setForm({
        name: inn.name,
        address: inn.address ?? '',
        phone: inn.phone ?? '',
        representative: inn.representative ?? '',
      })
    }
  }, [inn])

  async function handleSave() {
    setSaving(true)
    try {
      await updateInn({
        name: form.name,
        address: form.address || undefined,
        phone: form.phone || undefined,
        representative: form.representative || undefined,
      })
      qc.invalidateQueries({ queryKey: ['inn'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error(err)
      alert('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title="宿の情報" />
      <div className="px-4 py-4 space-y-4 pb-32">
        <Input
          label="宿名"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        />
        <Input
          label="代表者名"
          value={form.representative}
          onChange={e => setForm(f => ({ ...f, representative: e.target.value }))}
        />
        <Input
          label="住所"
          value={form.address}
          onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
        />
        <Input
          label="電話番号"
          value={form.phone}
          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
        />
        <Button size="lg" className="w-full" onClick={handleSave} disabled={saving}>
          {saved ? '保存しました ✓' : saving ? '保存中…' : '保存'}
        </Button>
      </div>
    </div>
  )
}
