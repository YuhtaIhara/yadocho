'use client'

import { useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Printer } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Stepper from '@/components/ui/Stepper'
import { useReservation, useUpdateReservation } from '@/lib/hooks/useReservations'
import { useMealDays } from '@/lib/hooks/useMealDays'
import { usePricing } from '@/lib/hooks/usePricing'
import { useInvoicePresets } from '@/lib/hooks/useInvoicePresets'
import { upsertInvoiceItems, lockInvoice } from '@/lib/api/invoices'
import { formatDateFull, nightCount } from '@/lib/utils/date'
import { formatYen } from '@/lib/utils/format'
import { calcLodgingTax } from '@/lib/utils/tax'
import { roomLabel } from '@/lib/types'

type ExtraItem = { name: string; unitPrice: number; quantity: number }

export default function InvoiceView() {
  const { id } = useParams<{ id: string }>()
  const { data: res } = useReservation(id)
  const { data: mealDays = [] } = useMealDays(id)
  const { data: pricing } = usePricing()
  const updateRes = useUpdateReservation()
  const { data: presets = [] } = useInvoicePresets()
  const [extras, setExtras] = useState<ExtraItem[]>([])
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [settling, setSettling] = useState(false)

  const computed = useMemo(() => {
    if (!res) return null
    const nights = nightCount(res.checkin, res.checkout)
    const items: { name: string; unitPrice: number; quantity: number; amount: number }[] = []

    items.push({
      name: '宿泊料（大人）',
      unitPrice: res.adult_price,
      quantity: res.adults * nights,
      amount: res.adult_price * res.adults * nights,
    })
    if (res.children > 0) {
      items.push({
        name: '宿泊料（子供）',
        unitPrice: res.child_price,
        quantity: res.children * nights,
        amount: res.child_price * res.children * nights,
      })
    }

    const dp = pricing?.dinner_price ?? 2000
    const cdp = pricing?.child_dinner_price ?? 1500
    const bp = pricing?.breakfast_price ?? 800
    const cbp = pricing?.child_breakfast_price ?? 500
    const lp = pricing?.lunch_price ?? 0
    const clp = pricing?.child_lunch_price ?? 0

    let totalDinnerA = 0, totalDinnerC = 0
    let totalBreakA = 0, totalBreakC = 0
    let totalLunchA = 0, totalLunchC = 0
    for (const md of mealDays) {
      totalDinnerA += md.dinner_adults
      totalDinnerC += md.dinner_children
      totalBreakA += md.breakfast_adults
      totalBreakC += md.breakfast_children
      totalLunchA += md.lunch_adults
      totalLunchC += md.lunch_children
    }

    if (totalDinnerA > 0) items.push({ name: '夕食（大人）', unitPrice: dp, quantity: totalDinnerA, amount: dp * totalDinnerA })
    if (totalDinnerC > 0) items.push({ name: '夕食（子供）', unitPrice: cdp, quantity: totalDinnerC, amount: cdp * totalDinnerC })
    if (totalBreakA > 0) items.push({ name: '朝食（大人）', unitPrice: bp, quantity: totalBreakA, amount: bp * totalBreakA })
    if (totalBreakC > 0) items.push({ name: '朝食（子供）', unitPrice: cbp, quantity: totalBreakC, amount: cbp * totalBreakC })
    if (totalLunchA > 0) items.push({ name: '昼食（大人）', unitPrice: lp, quantity: totalLunchA, amount: lp * totalLunchA })
    if (totalLunchC > 0) items.push({ name: '昼食（子供）', unitPrice: clp, quantity: totalLunchC, amount: clp * totalLunchC })

    const subtotal = items.reduce((s, i) => s + i.amount, 0)
    const extrasTotal = extras.reduce((s, e) => s + e.unitPrice * e.quantity, 0)
    const tax = calcLodgingTax(res.adult_price, res.adults, nights, res.checkin)

    return {
      items,
      subtotal,
      extrasTotal,
      tax,
      total: subtotal + extrasTotal + tax.taxAmount,
      nights,
    }
  }, [res, mealDays, pricing, extras])

  function addExtra() {
    if (!newName || !newPrice) return
    setExtras(prev => [...prev, { name: newName, unitPrice: parseInt(newPrice) || 0, quantity: 1 }])
    setNewName('')
    setNewPrice('')
  }

  async function handleSettle() {
    if (!res || !computed) return
    setSettling(true)
    try {
      type ItemCategory = 'stay' | 'meal' | 'tax' | 'extra'
      const allItems: {
        reservation_id: string
        category: ItemCategory
        name: string
        unit_price: number
        quantity: number
        sort_order: number
        locked: boolean
      }[] = [
        ...computed.items.map((item, i) => ({
          reservation_id: res.id,
          category: 'stay' as ItemCategory,
          name: item.name,
          unit_price: item.unitPrice,
          quantity: item.quantity,
          sort_order: i,
          locked: false,
        })),
        ...extras.map((e, i) => ({
          reservation_id: res.id,
          category: 'extra' as ItemCategory,
          name: e.name,
          unit_price: e.unitPrice,
          quantity: e.quantity,
          sort_order: computed.items.length + i,
          locked: false,
        })),
      ]
      if (computed.tax.taxable) {
        allItems.push({
          reservation_id: res.id,
          category: 'tax',
          name: `宿泊税(${computed.tax.ratePercent}%)`,
          unit_price: computed.tax.taxAmount,
          quantity: 1,
          sort_order: allItems.length,
          locked: false,
        })
      }
      await upsertInvoiceItems(res.id, allItems)
      await lockInvoice(res.id)
      if (res.status !== 'settled') {
        updateRes.mutate({ id: res.id, status: 'settled' })
      }
      alert('精算が完了しました')
    } catch (err) {
      console.error(err)
      alert('精算に失敗しました')
    } finally {
      setSettling(false)
    }
  }

  if (!res || !computed) {
    return (
      <div>
        <PageHeader title="請求書" />
        <div className="flex items-center justify-center h-48 text-sm text-text-3">読み込み中…</div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="請求書"
        rightSlot={
          <button
            type="button"
            onClick={() => window.print()}
            className="w-10 h-10 flex items-center justify-center rounded-full active:bg-primary-soft"
          >
            <Printer size={18} className="text-text-2" />
          </button>
        }
      />

      {/* Extra items input — no-print */}
      <div className="no-print px-4 py-3 border-b border-border/40">
        <h3 className="text-sm font-bold text-text-2 mb-2">追加費目</h3>
        {presets.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2 -mx-1 px-1 scrollbar-hide">
            {presets.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setExtras(prev => [...prev, { name: p.name, unitPrice: p.price, quantity: 1 }])}
                className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-full bg-primary-soft text-primary active:bg-primary/20 transition-colors"
              >
                {p.name} {formatYen(p.price)}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              placeholder="品目"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="!h-10"
            />
          </div>
          <div className="w-24">
            <Input
              placeholder="単価"
              type="number"
              value={newPrice}
              onChange={e => setNewPrice(e.target.value)}
              className="!h-10"
            />
          </div>
          <Button variant="secondary" size="sm" onClick={addExtra} className="shrink-0">
            追加
          </Button>
        </div>
        {extras.length > 0 && (
          <div className="mt-2 space-y-1">
            {extras.map((e, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-surface rounded-lg px-3 py-1.5">
                <span>{e.name}</span>
                <div className="flex items-center gap-2">
                  <span>{formatYen(e.unitPrice)}</span>
                  <Stepper
                    value={e.quantity}
                    onChange={v =>
                      setExtras(prev => prev.map((x, j) => (j === i ? { ...x, quantity: v } : x)))
                    }
                    min={1}
                    max={99}
                  />
                  <button
                    type="button"
                    onClick={() => setExtras(prev => prev.filter((_, j) => j !== i))}
                    className="text-xs text-danger"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoice — printable */}
      <div className="px-4 py-6 max-w-md mx-auto">
        <h2 className="text-center text-xl font-bold tracking-widest mb-6">ご 請 求 書</h2>

        <p className="text-lg font-bold mb-1">{res.guest?.name ?? '—'} 様</p>
        <div className="text-sm text-text-2 space-y-0.5 mb-4">
          <p>チェックイン: {formatDateFull(res.checkin)}</p>
          <p>チェックアウト: {formatDateFull(res.checkout)}（{computed.nights}泊）</p>
          <p>
            部屋: {roomLabel(res)} 人数: 大人{res.adults}名
            {res.children > 0 && ` 子供${res.children}名`}
          </p>
        </div>

        <Card className="!bg-primary/[0.04] border border-primary/10 mb-4">
          <p className="text-sm text-text-2 text-center">ご請求金額（税込）</p>
          <p className="text-2xl font-bold text-center mt-1">{formatYen(computed.total)}</p>
        </Card>

        {/* Items table */}
        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="border-b border-border text-left text-text-3">
              <th className="py-1.5 font-medium">項目</th>
              <th className="py-1.5 font-medium text-right">単価</th>
              <th className="py-1.5 font-medium text-right">数量</th>
              <th className="py-1.5 font-medium text-right">金額</th>
            </tr>
          </thead>
          <tbody>
            {computed.items.map((item, i) => (
              <tr key={i} className="border-b border-border/30">
                <td className="py-1.5">{item.name}</td>
                <td className="py-1.5 text-right">{item.unitPrice.toLocaleString()}</td>
                <td className="py-1.5 text-right">{item.quantity}</td>
                <td className="py-1.5 text-right font-medium">{item.amount.toLocaleString()}</td>
              </tr>
            ))}
            {extras.map((e, i) => (
              <tr key={`e${i}`} className="border-b border-border/30">
                <td className="py-1.5">{e.name}</td>
                <td className="py-1.5 text-right">{e.unitPrice.toLocaleString()}</td>
                <td className="py-1.5 text-right">{e.quantity}</td>
                <td className="py-1.5 text-right font-medium">
                  {(e.unitPrice * e.quantity).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-sm space-y-1 mb-6">
          <div className="flex justify-between">
            <span className="text-text-2">小計</span>
            <span>{formatYen(computed.subtotal + computed.extrasTotal)}</span>
          </div>
          {computed.tax.taxable && (
            <div className="flex justify-between">
              <span className="text-text-2">宿泊税({computed.tax.ratePercent}%)</span>
              <span>{formatYen(computed.tax.taxAmount)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-border font-bold text-base">
            <span>合計</span>
            <span>{formatYen(computed.total)}</span>
          </div>
        </div>
      </div>

      {/* Settle button — no-print */}
      <div className="no-print px-4 pb-32">
        <Button
          size="lg"
          className="w-full"
          onClick={handleSettle}
          disabled={settling}
        >
          {settling ? '精算中…' : '精算する'}
        </Button>
      </div>
    </div>
  )
}
