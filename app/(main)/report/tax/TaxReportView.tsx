'use client'

import { useState, useMemo, useRef } from 'react'
import { format, startOfMonth, addMonths, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, FileText, Printer } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getSupabase } from '@/lib/supabase'
import { buildMonthlyTaxData, type MonthlyTaxSummary } from '@/lib/utils/tax-report'
import { toReiwaLabel } from '@/lib/utils/reiwa'
import { useTaxData } from '@/lib/hooks/useTaxRules'
import type { Reservation } from '@/lib/types'

type ReportType = 'village-monthly' | 'village-form' | 'pref-monthly' | 'pref-form'
type ReportDef = { type: ReportType; label: string; desc: string }

async function fetchReservationsForMonth(year: number, month: number) {
  const supabase = getSupabase()
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

  const { data } = await supabase
    .from('reservations')
    .select('*')
    .gte('checkin', from)
    .lte('checkin', to)
    .neq('status', 'cancelled')

  return (data ?? []) as Reservation[]
}

async function fetchInnInfo() {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('inn_id')
    .eq('id', user.id)
    .single()

  if (!profile?.inn_id) return null

  const { data: inn } = await supabase
    .from('inns')
    .select('name, representative, address, phone')
    .eq('id', profile.inn_id)
    .single()

  return inn
}

export default function TaxReportView() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [loading, setLoading] = useState<ReportType | null>(null)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<{ type: ReportType; html: string } | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const { taxRules } = useTaxData()

  const year = month.getFullYear()
  const monthNum = month.getMonth() + 1

  // Get earliest effective_from from tax rules
  const effectiveFrom = useMemo(() => {
    const dates = taxRules.map(r => r.effective_from).filter(Boolean).sort()
    return dates[0] ?? undefined
  }, [taxRules])

  const hasMunicipalTax = useMemo(
    () => taxRules.some(r => r.tax_type === 'municipal'),
    [taxRules],
  )
  const hasPrefectureTax = useMemo(
    () => taxRules.some(r => r.tax_type === 'prefecture'),
    [taxRules],
  )

  // Extract threshold and rate from tax rules (use first matching rule)
  const { threshold, municipalRate } = useMemo(() => {
    const municipal = taxRules.find(r => r.tax_type === 'municipal')
    const pref = taxRules.find(r => r.tax_type === 'prefecture')
    const rule = municipal ?? pref
    return {
      threshold: rule?.threshold ?? 6000,
      municipalRate: 3.5, // TODO: extract from tax_rule_rates when calc_method varies
    }
  }, [taxRules])

  const reportTypes = useMemo<ReportDef[]>(() => {
    if (hasMunicipalTax) {
      return [
        { type: 'village-monthly', label: '月計表', desc: '日別の宿泊者数・課税標準額・税額' },
        { type: 'village-form', label: '納入申告書（様式第2号）', desc: '3ヶ月分の申告書' },
      ]
    }
    if (hasPrefectureTax) {
      return [
        { type: 'pref-monthly', label: '月計表', desc: '日別の課税対象・対象外の宿泊数' },
        { type: 'pref-form', label: '納入申告書（様式第2号）', desc: '3ヶ月分の申告書。県税事務所に提出' },
      ]
    }
    return []
  }, [hasMunicipalTax, hasPrefectureTax])

  const filingNote = useMemo(() => {
    if (hasMunicipalTax) {
      return '申告書は村（町/市）に提出します。県への申告は不要です（村が県分を代行納入します）。'
    }
    if (hasPrefectureTax) {
      return '申告書は管轄の県税事務所に提出します。'
    }
    return '宿泊税の設定がされていません。設定画面で自治体を選択してください。'
  }, [hasMunicipalTax, hasPrefectureTax])

  async function showReport(type: ReportType) {
    setLoading(type)
    setError('')
    try {
      const inn = await fetchInnInfo()
      if (!inn) {
        setError('宿の情報が取得できません')
        return
      }

      let html = ''

      if (type === 'village-monthly') {
        const reservations = await fetchReservationsForMonth(year, monthNum)
        const data = buildMonthlyTaxData(reservations, year, monthNum, threshold, municipalRate, effectiveFrom)
        html = renderVillageMonthly(data, inn.name ?? '', inn.representative ?? '')
      } else if (type === 'village-form') {
        const monthsData: MonthlyTaxSummary[] = []
        for (let m = 0; m < 3; m++) {
          const tMonth = ((monthNum - 1 + m) % 12) + 1
          const tYear = monthNum + m > 12 ? year + 1 : year
          const res = await fetchReservationsForMonth(tYear, tMonth)
          monthsData.push(buildMonthlyTaxData(res, tYear, tMonth, threshold, municipalRate, effectiveFrom))
        }
        html = renderVillageForm(monthsData, inn)
      } else if (type === 'pref-monthly') {
        const reservations = await fetchReservationsForMonth(year, monthNum)
        const data = buildMonthlyTaxData(reservations, year, monthNum, threshold, municipalRate, effectiveFrom)
        html = renderPrefMonthly(data, inn.name ?? '')
      } else {
        const monthsData: MonthlyTaxSummary[] = []
        for (let m = 0; m < 3; m++) {
          const tMonth = ((monthNum - 1 + m) % 12) + 1
          const tYear = monthNum + m > 12 ? year + 1 : year
          const res = await fetchReservationsForMonth(tYear, tMonth)
          monthsData.push(buildMonthlyTaxData(res, tYear, tMonth, threshold, municipalRate, effectiveFrom))
        }
        html = renderPrefForm(monthsData, inn)
      }

      setPreview({ type, html })
      // Scroll to preview after render
      setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (err) {
      console.error(err)
      setError('データの取得に失敗しました')
    } finally {
      setLoading(null)
    }
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div>
      <PageHeader title="税申告書" />

      <div className="px-4 py-4 flex flex-col gap-4 pb-32 no-print">
        {/* Month selector */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => { setMonth(m => subMonths(m, 1)); setPreview(null) }}
            className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full active:bg-primary-soft"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-lg font-medium">
            {format(month, 'yyyy年M月', { locale: ja })}
          </span>
          <button
            type="button"
            onClick={() => { setMonth(m => addMonths(m, 1)); setPreview(null) }}
            className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full active:bg-primary-soft"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <p className="text-[15px] text-text-2">{filingNote}</p>

        {/* Report types */}
        {reportTypes.map(r => (
          <Card key={r.type}>
            <div className="flex items-start justify-between">
              <div className="flex-1 mr-3">
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={16} className="text-primary shrink-0" />
                  <p className="text-[15px] font-medium">{r.label}</p>
                </div>
                <p className="text-[15px] text-text-3">{r.desc}</p>
              </div>
              <Button
                size="sm"
                onClick={() => showReport(r.type)}
                disabled={loading !== null}
              >
                {loading === r.type ? '読込中…' : '表示'}
              </Button>
            </div>
          </Card>
        ))}

        {reportTypes.length === 0 && (
          <Card className="!bg-danger-soft border border-danger/10">
            <p className="text-[15px] text-danger">
              宿泊税の設定がされていません。設定 → 宿泊税 から自治体を選択してください。
            </p>
          </Card>
        )}

        {error && (
          <p className="text-[15px] text-danger text-center bg-danger-soft rounded-xl py-3 px-4">
            {error}
          </p>
        )}

        <Card className="!bg-primary/[0.04] border border-primary/10">
          <p className="text-[15px] text-text-2">
            月計表は毎月の申告書添付資料として提出します。
            納入申告書は3ヶ月分をまとめて提出（年税額360万円未満の承認がある場合は四半期ごと）。
          </p>
          <p className="text-[15px] text-text-3 mt-1">
            「宿泊システム導入事業者は任意様式で可」
          </p>
        </Card>
      </div>

      {/* Print-only: HTML report preview */}
      {preview && (
        <div
          className="hidden print:block print-report"
          dangerouslySetInnerHTML={{ __html: preview.html }}
        />
      )}

      {/* Inline preview (visible on screen too) */}
      {preview && (
        <div ref={previewRef} className="px-4 pb-32 no-print space-y-4">
          <div className="border border-border rounded-xl p-4 bg-white overflow-x-auto">
            <div dangerouslySetInnerHTML={{ __html: preview.html }} />
          </div>
          <Button size="lg" className="w-full" onClick={handlePrint}>
            <Printer size={16} className="mr-2" />
            この帳票を印刷する
          </Button>
        </div>
      )}
    </div>
  )
}

// ── HTML renderers ──

function renderVillageMonthly(data: MonthlyTaxSummary, innName: string, representative: string): string {
  const reiwa = toReiwaLabel(data.year, data.month)
  const rows = data.rows.map(r => `
    <tr>
      <td style="border:1px solid #333;text-align:center;padding:3px">${r.day}</td>
      <td style="border:1px solid #333;text-align:right;padding:3px">${r.taxableStays || ''}</td>
      <td style="border:1px solid #333;text-align:right;padding:3px">${r.exemptStays || ''}</td>
      <td style="border:1px solid #333;text-align:right;padding:3px">${r.taxableBase ? r.taxableBase.toLocaleString() : ''}</td>
      <td style="border:1px solid #333;text-align:right;padding:3px">${r.taxAmount ? r.taxAmount.toLocaleString() : ''}</td>
    </tr>
  `).join('')

  return `
    <div style="font-family:'Noto Sans JP',sans-serif;font-size:11px;max-width:600px;margin:0 auto">
      <h2 style="text-align:center;font-size:16px;font-weight:500;margin-bottom:4px">宿泊税月計表</h2>
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:8px">
        <span>${reiwa}</span>
        <span>施設名: ${innName}</span>
        <span>義務者: ${representative}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="border:1px solid #333;padding:3px;width:30px">日</th>
            <th style="border:1px solid #333;padding:3px">課税宿泊数</th>
            <th style="border:1px solid #333;padding:3px">課税免除</th>
            <th style="border:1px solid #333;padding:3px">課税標準額</th>
            <th style="border:1px solid #333;padding:3px">宿泊税額</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr style="background:#f5f5f5;font-weight:500">
            <td style="border:1px solid #333;padding:3px;text-align:center">計</td>
            <td style="border:1px solid #333;padding:3px;text-align:right">${data.totals.taxableStays}</td>
            <td style="border:1px solid #333;padding:3px;text-align:right">${data.totals.exemptStays || ''}</td>
            <td style="border:1px solid #333;padding:3px;text-align:right">${data.totals.taxableBase.toLocaleString()}</td>
            <td style="border:1px solid #333;padding:3px;text-align:right">${data.totals.taxAmount.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `
}

function renderVillageForm(months: MonthlyTaxSummary[], inn: { name: string | null; address: string | null; representative: string | null; phone: string | null }): string {
  const today = new Date()
  const filingDate = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`

  const monthRows = months.map(m => `
    <tr>
      <td style="border:1px solid #333;padding:4px;text-align:center">${toReiwaLabel(m.year, m.month)}</td>
      <td style="border:1px solid #333;padding:4px;text-align:right">${m.totals.taxableStays}</td>
      <td style="border:1px solid #333;padding:4px;text-align:right">${m.totals.taxableBase.toLocaleString()}</td>
      <td style="border:1px solid #333;padding:4px;text-align:right">${m.totals.taxAmount.toLocaleString()}</td>
    </tr>
  `).join('')

  const grandTotal = months.reduce((s, m) => s + m.totals.taxAmount, 0)

  return `
    <div style="font-family:'Noto Sans JP',sans-serif;font-size:12px;max-width:600px;margin:0 auto">
      <h2 style="text-align:center;font-size:16px;font-weight:500;margin-bottom:8px">宿泊税 納入申告書（様式第2号）</h2>
      <div style="text-align:right;margin-bottom:8px">提出日: ${filingDate}</div>
      <div style="margin-bottom:12px;font-size:11px">
        <div>施設名: ${inn.name ?? ''}</div>
        <div>所在地: ${inn.address ?? ''}</div>
        <div>代表者: ${inn.representative ?? ''}</div>
        <div>電話: ${inn.phone ?? ''}</div>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="border:1px solid #333;padding:4px">期間</th>
            <th style="border:1px solid #333;padding:4px">課税宿泊数</th>
            <th style="border:1px solid #333;padding:4px">課税標準額</th>
            <th style="border:1px solid #333;padding:4px">宿泊税額</th>
          </tr>
        </thead>
        <tbody>
          ${monthRows}
          <tr style="background:#f5f5f5;font-weight:500">
            <td style="border:1px solid #333;padding:4px;text-align:center">合計</td>
            <td style="border:1px solid #333;padding:4px"></td>
            <td style="border:1px solid #333;padding:4px"></td>
            <td style="border:1px solid #333;padding:4px;text-align:right">${grandTotal.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
      <p style="margin-top:8px;font-size:10px;color:#666">税率: 0.035（3.5%）</p>
    </div>
  `
}

function renderPrefMonthly(data: MonthlyTaxSummary, innName: string): string {
  const reiwa = toReiwaLabel(data.year, data.month)
  const rows = data.rows.map(r => `
    <tr>
      <td style="border:1px solid #333;text-align:center;padding:3px">${r.day}</td>
      <td style="border:1px solid #333;text-align:right;padding:3px">${r.taxableStays || ''}</td>
      <td style="border:1px solid #333;text-align:right;padding:3px">${r.belowThresholdStays || ''}</td>
      <td style="border:1px solid #333;text-align:right;padding:3px">${r.exemptStays || ''}</td>
      <td style="border:1px solid #333;text-align:right;padding:3px">${(r.taxableStays + r.belowThresholdStays + r.exemptStays) || ''}</td>
    </tr>
  `).join('')

  const total = data.totals
  return `
    <div style="font-family:'Noto Sans JP',sans-serif;font-size:11px;max-width:600px;margin:0 auto">
      <h2 style="text-align:center;font-size:16px;font-weight:500;margin-bottom:4px">宿泊税月計表</h2>
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:8px">
        <span>${reiwa}</span>
        <span>施設名: ${innName}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="border:1px solid #333;padding:3px;width:30px">日</th>
            <th style="border:1px solid #333;padding:3px">課税対象</th>
            <th style="border:1px solid #333;padding:3px">免税点未満</th>
            <th style="border:1px solid #333;padding:3px">課税免除</th>
            <th style="border:1px solid #333;padding:3px">合計</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr style="background:#f5f5f5;font-weight:500">
            <td style="border:1px solid #333;padding:3px;text-align:center">計</td>
            <td style="border:1px solid #333;padding:3px;text-align:right">${total.taxableStays}</td>
            <td style="border:1px solid #333;padding:3px;text-align:right">${total.belowThresholdStays}</td>
            <td style="border:1px solid #333;padding:3px;text-align:right">${total.exemptStays}</td>
            <td style="border:1px solid #333;padding:3px;text-align:right">${total.taxableStays + total.belowThresholdStays + total.exemptStays}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `
}

function renderPrefForm(months: MonthlyTaxSummary[], inn: { name: string | null; address: string | null; representative: string | null; phone: string | null }): string {
  const today = new Date()
  const filingDate = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`

  const monthRows = months.map(m => `
    <tr>
      <td style="border:1px solid #333;padding:4px;text-align:center">${toReiwaLabel(m.year, m.month)}</td>
      <td style="border:1px solid #333;padding:4px;text-align:right">${m.totals.taxableStays}</td>
      <td style="border:1px solid #333;padding:4px;text-align:right">${(m.totals.taxableStays * 100).toLocaleString()}</td>
    </tr>
  `).join('')

  const grandTax = months.reduce((s, m) => s + m.totals.taxableStays * 100, 0)

  return `
    <div style="font-family:'Noto Sans JP',sans-serif;font-size:12px;max-width:600px;margin:0 auto">
      <h2 style="text-align:center;font-size:16px;font-weight:500;margin-bottom:8px">宿泊税 納入申告書（様式第2号）</h2>
      <div style="text-align:right;margin-bottom:8px">提出日: ${filingDate}</div>
      <div style="margin-bottom:12px;font-size:11px">
        <div>施設名: ${inn.name ?? ''}</div>
        <div>所在地: ${inn.address ?? ''}</div>
        <div>代表者: ${inn.representative ?? ''}</div>
        <div>電話: ${inn.phone ?? ''}</div>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="border:1px solid #333;padding:4px">期間</th>
            <th style="border:1px solid #333;padding:4px">課税宿泊数</th>
            <th style="border:1px solid #333;padding:4px">宿泊税額（@¥100）</th>
          </tr>
        </thead>
        <tbody>
          ${monthRows}
          <tr style="background:#f5f5f5;font-weight:500">
            <td style="border:1px solid #333;padding:4px;text-align:center">合計</td>
            <td style="border:1px solid #333;padding:4px"></td>
            <td style="border:1px solid #333;padding:4px;text-align:right">${grandTax.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `
}
