'use client'

import { useState, useMemo, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Printer } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Stepper from '@/components/ui/Stepper'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useReservation, useUpdateReservation } from '@/lib/hooks/useReservations'
import { useMealDays } from '@/lib/hooks/useMealDays'
import { usePricing } from '@/lib/hooks/usePricing'
import { useInvoicePresets } from '@/lib/hooks/useInvoicePresets'
import { useInn } from '@/lib/hooks/useInn'
import { upsertInvoiceItems, lockInvoice, unlockInvoice, fetchInvoiceItems } from '@/lib/api/invoices'
import { verifyTax } from '@/lib/api/verifyTax'
import { formatDateFull, nightCount } from '@/lib/utils/date'
import { formatYen } from '@/lib/utils/format'
import { getMealPrices } from '@/lib/utils/pricing'
import { calcAllTaxes, sumTaxResults } from '@/lib/utils/tax'
import { useTaxData } from '@/lib/hooks/useTaxRules'
import { roomLabel } from '@/lib/types'

type ExtraItem = { name: string; unitPrice: number; quantity: number }

export default function InvoiceView() {
  const { id } = useParams<{ id: string }>()
  const { data: res } = useReservation(id)
  const { data: mealDays = [] } = useMealDays(id)
  const { data: pricing } = usePricing()
  const { taxRules, taxRuleRates } = useTaxData()
  const updateRes = useUpdateReservation()
  const { data: presets = [] } = useInvoicePresets()
  const { data: inn } = useInn()
  const { showToast } = useToast()
  const [extras, setExtras] = useState<ExtraItem[]>([])
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [settling, setSettling] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [settleSuccess, setSettleSuccess] = useState(false)
  const [settleError, setSettleError] = useState('')
  const [undoOpen, setUndoOpen] = useState(false)

  // Load saved extras from DB when viewing a settled invoice
  useEffect(() => {
    if (!res || res.status !== 'settled') return
    fetchInvoiceItems(res.id).then(items => {
      const savedExtras = items
        .filter(item => item.category === 'extra')
        .map(item => ({ name: item.name, unitPrice: item.unit_price, quantity: item.quantity }))
      if (savedExtras.length > 0) setExtras(savedExtras)
    })
  }, [res?.id, res?.status])

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

    // 食事単価は予約にスナップショットされた値を使う（設定変更の影響を受けない）
    const { dp, cdp, bp, cbp, lp, clp } = getMealPrices(res)

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
    const taxResults = calcAllTaxes(
      res.adult_price, res.adults, nights, res.checkin,
      res.tax_exempt, false, taxRules, taxRuleRates,
    )
    const taxTotal = sumTaxResults(taxResults)

    return {
      items,
      subtotal,
      extrasTotal,
      taxResults,
      taxTotal,
      total: subtotal + extrasTotal + taxTotal,
      nights,
    }
  }, [res, mealDays, pricing, extras, taxRules, taxRuleRates])

  function addExtra() {
    if (!newName || !newPrice) return
    const price = Math.max(0, parseInt(newPrice) || 0)
    setExtras(prev => [...prev, { name: newName, unitPrice: price, quantity: 1 }])
    setNewName('')
    setNewPrice('')
  }

  async function handleSettle() {
    if (!res || !computed) return
    setSettling(true)
    setSettleError('')
    try {
      // サーバーサイド税額検証: 精算前にクライアントの税額が正しいか検証
      const verification = await verifyTax(res.id, computed.taxTotal)
      if (!verification.valid) {
        const diff = verification.discrepancy ?? 0
        setSettleError(
          `税額の検証に失敗しました。サーバー計算: ${formatYen(verification.serverTaxTotal)}, ` +
          `差額: ${formatYen(Math.abs(diff))}。ページを再読み込みしてください。`,
        )
        return
      }

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

      // サーバーサイドで検証済みの税額を使用して invoice_items を構成
      for (const taxResult of verification.serverTaxResults) {
        if (taxResult.taxable && taxResult.taxAmount > 0) {
          allItems.push({
            reservation_id: res.id,
            category: 'tax',
            name: `${taxResult.taxName}(${taxResult.displayRate})`,
            unit_price: taxResult.taxAmount,
            quantity: 1,
            sort_order: allItems.length,
            locked: false,
          })
        }
      }

      await upsertInvoiceItems(res.id, allItems)
      await lockInvoice(res.id)
      if (res.status !== 'settled') {
        updateRes.mutate({ id: res.id, status: 'settled' })
      }
      setConfirmOpen(false)
      setSettleSuccess(true)
    } catch (err) {
      console.error(err)
      setSettleError('精算に失敗しました。もう一度お試しください。')
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
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-surface border border-border text-text-2 active:bg-primary-soft transition-colors"
          >
            <Printer size={14} />
            印刷
          </button>
        }
      />

      {/* Extra items input — no-print, locked when settled */}
      {res.status !== 'settled' && (
        <div className="no-print px-4 py-3 border-b border-border/40">
          <h3 className="text-sm font-medium text-text-2 mb-2">追加費目</h3>
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
      )}

      {/* Invoice — printable */}
      <div className="px-4 py-6 max-w-md mx-auto">
        <h2 className="text-center text-xl font-medium tracking-widest mb-4">ご 請 求 書</h2>

        {inn && (
          <div className="text-right text-xs text-text-2 mb-4 space-y-0.5">
            <p className="text-sm font-medium text-text-1">{inn.name}</p>
            {inn.address && <p>{inn.address}</p>}
            {inn.phone && <p>TEL: {inn.phone}</p>}
            {inn.representative && <p>代表: {inn.representative}</p>}
          </div>
        )}

        <p className="text-lg font-medium mb-1">{res.guest?.name ?? '—'} 様</p>
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
          <p className="text-2xl font-medium text-center mt-1">{formatYen(computed.total)}</p>
        </Card>

        {/* Items table */}
        <div className="space-y-2 mb-4">
          {computed.items.map((item, i) => (
            <div key={i} className="flex items-baseline justify-between text-sm border-b border-border/20 pb-1.5">
              <div className="min-w-0 mr-3">
                <p className="truncate">{item.name}</p>
                <p className="text-xs text-text-3">{item.unitPrice.toLocaleString()} × {item.quantity}</p>
              </div>
              <span className="font-medium shrink-0">¥{item.amount.toLocaleString()}</span>
            </div>
          ))}
          {extras.map((e, i) => (
            <div key={`e${i}`} className="flex items-baseline justify-between text-sm border-b border-border/20 pb-1.5">
              <div className="min-w-0 mr-3">
                <p className="truncate">{e.name}</p>
                <p className="text-xs text-text-3">{e.unitPrice.toLocaleString()} × {e.quantity}</p>
              </div>
              <span className="font-medium shrink-0">¥{(e.unitPrice * e.quantity).toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="text-sm space-y-1 mb-6">
          <div className="flex justify-between">
            <span className="text-text-2">小計</span>
            <span>{formatYen(computed.subtotal + computed.extrasTotal)}</span>
          </div>
          {computed.taxTotal > 0 && (
            <div className="flex justify-between">
              <span className="text-text-2">宿泊税</span>
              <span>{formatYen(computed.taxTotal)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-border font-medium text-base">
            <span>合計</span>
            <span>{formatYen(computed.total)}</span>
          </div>
        </div>
      </div>

      {/* Settle / Unsettled button — no-print */}
      <div className="no-print px-4 pb-32">
        {res.status === 'settled' || settleSuccess ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-[17px] font-medium text-text-sub">精算済み</p>
            <p className="text-sm text-text-3">{formatYen(computed.total)}</p>
            <button
              type="button"
              onClick={() => setUndoOpen(true)}
              className="text-[15px] text-text-sub underline min-h-[48px] px-4"
            >
              精算を取り消す
            </button>
          </div>
        ) : (
          <Button
            size="lg"
            className="w-full"
            onClick={() => setConfirmOpen(true)}
            disabled={settling}
          >
            精算する
          </Button>
        )}
      </div>

      {/* Confirmation modal */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="精算の確認">
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-text-2 mb-1">ご請求金額（税込）</p>
            <p className="text-2xl font-medium">{formatYen(computed.total)}</p>
          </div>
          <p className="text-sm text-text-2 text-center">
            この金額で精算します。よろしいですか？
          </p>
          {settleError && (
            <p className="text-sm text-danger text-center">{settleError}</p>
          )}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => { setConfirmOpen(false); setSettleError('') }}
              disabled={settling}
            >
              キャンセル
            </Button>
            <Button
              size="lg"
              className="flex-1"
              onClick={handleSettle}
              disabled={settling}
            >
              {settling ? '精算中…' : '精算する'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Undo settlement modal */}
      <Modal open={undoOpen} onClose={() => setUndoOpen(false)} title="精算の取消">
        <div className="space-y-4">
          <p className="text-[15px] text-text-2 text-center">
            精算を取り消して、請求書を修正可能な状態に戻しますか？
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => setUndoOpen(false)}
            >
              やめる
            </Button>
            <Button
              variant="danger"
              size="lg"
              className="flex-1"
              onClick={async () => {
                try {
                  await unlockInvoice(res.id)
                  updateRes.mutate(
                    { id: res.id, status: 'checked_in' },
                    {
                      onSuccess: () => {
                        setSettleSuccess(false)
                        setUndoOpen(false)
                        showToast('精算を取り消しました')
                      },
                      onError: (err) => showToast(err instanceof Error ? err.message : '取消に失敗しました'),
                    },
                  )
                } catch (err) {
                  showToast('取消に失敗しました')
                }
              }}
            >
              取り消す
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
