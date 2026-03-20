'use client'

import { useState } from 'react'
import { format, startOfMonth, addMonths, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, FileText, Download } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getSupabase } from '@/lib/supabase'
import { buildMonthlyTaxData, type MonthlyTaxSummary } from '@/lib/utils/tax-report'
import type { Reservation } from '@/lib/types'

type ReportType = 'village-monthly' | 'village-form' | 'pref-monthly' | 'pref-form'

const REPORT_TYPES: { type: ReportType; label: string; desc: string }[] = [
  {
    type: 'village-monthly',
    label: '村 月計表',
    desc: '日別の宿泊者数・課税標準額・税額',
  },
  {
    type: 'village-form',
    label: '村 納入申告書（様式第2号）',
    desc: '3ヶ月分の申告書。村に提出',
  },
  {
    type: 'pref-monthly',
    label: '県 月計表',
    desc: '日別の課税対象・対象外の宿泊数',
  },
  {
    type: 'pref-form',
    label: '県 納入申告書（様式第2号）',
    desc: '3ヶ月分の申告書。県税事務所に提出',
  },
]

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

  const year = month.getFullYear()
  const monthNum = month.getMonth() + 1

  async function generatePDF(type: ReportType) {
    setLoading(type)
    setError('')
    try {
      // Dynamic import to avoid SSR issues
      const { pdf } = await import('@react-pdf/renderer')
      const React = (await import('react')).default

      const inn = await fetchInnInfo()
      if (!inn) {
        setError('宿の情報が取得できません')
        return
      }

      let element: React.ReactElement

      if (type === 'village-monthly') {
        const { VillageMonthlyReport } = await import('@/lib/pdf/VillageMonthlyReport')
        const reservations = await fetchReservationsForMonth(year, monthNum)
        const data = buildMonthlyTaxData(reservations, year, monthNum, 6000, 3.5)
        element = React.createElement(VillageMonthlyReport, {
          data,
          innName: inn.name ?? '',
          representative: inn.representative ?? '',
        })
      } else if (type === 'village-form') {
        const { VillageDeclarationForm } = await import('@/lib/pdf/VillageDeclarationForm')
        const monthsData: MonthlyTaxSummary[] = []
        for (let m = 0; m < 3; m++) {
          const tMonth = ((monthNum - 1 + m) % 12) + 1
          const tYear = monthNum + m > 12 ? year + 1 : year
          const res = await fetchReservationsForMonth(tYear, tMonth)
          monthsData.push(buildMonthlyTaxData(res, tYear, tMonth, 6000, 3.5))
        }
        const today = new Date()
        element = React.createElement(VillageDeclarationForm, {
          months: monthsData,
          innName: inn.name ?? '',
          innAddress: inn.address ?? '',
          representative: inn.representative ?? '',
          phone: inn.phone ?? '',
          filingDate: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
          taxRatePercent: 3.5,
        })
      } else if (type === 'pref-monthly') {
        const { PrefMonthlyReport } = await import('@/lib/pdf/PrefMonthlyReport')
        const reservations = await fetchReservationsForMonth(year, monthNum)
        const data = buildMonthlyTaxData(reservations, year, monthNum, 6000, 3.5)
        element = React.createElement(PrefMonthlyReport, {
          data,
          innName: inn.name ?? '',
        })
      } else {
        const { PrefDeclarationForm } = await import('@/lib/pdf/PrefDeclarationForm')
        const monthsData: MonthlyTaxSummary[] = []
        for (let m = 0; m < 3; m++) {
          const tMonth = ((monthNum - 1 + m) % 12) + 1
          const tYear = monthNum + m > 12 ? year + 1 : year
          const res = await fetchReservationsForMonth(tYear, tMonth)
          monthsData.push(buildMonthlyTaxData(res, tYear, tMonth, 6000, 3.5))
        }
        const today = new Date()
        element = React.createElement(PrefDeclarationForm, {
          months: monthsData,
          innName: inn.name ?? '',
          innAddress: inn.address ?? '',
          representative: inn.representative ?? '',
          phone: inn.phone ?? '',
          filingDate: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
          prefFlatAmount: 100,
        })
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await pdf(element as any).toBlob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (err) {
      console.error(err)
      setError('PDF生成に失敗しました')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div>
      <PageHeader title="税申告書" />

      <div className="px-4 py-4 flex flex-col gap-4 pb-32">
        {/* Month selector */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMonth(m => subMonths(m, 1))}
            className="w-10 h-10 flex items-center justify-center rounded-full active:bg-primary-soft"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-lg font-bold">
            {format(month, 'yyyy年M月', { locale: ja })}
          </span>
          <button
            type="button"
            onClick={() => setMonth(m => addMonths(m, 1))}
            className="w-10 h-10 flex items-center justify-center rounded-full active:bg-primary-soft"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <p className="text-sm text-text-2">
          野沢温泉村への宿泊税申告書をPDFで出力します。
        </p>

        {/* Report types */}
        {REPORT_TYPES.map(r => (
          <Card key={r.type}>
            <div className="flex items-start justify-between">
              <div className="flex-1 mr-3">
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={16} className="text-primary shrink-0" />
                  <p className="text-sm font-bold">{r.label}</p>
                </div>
                <p className="text-xs text-text-3">{r.desc}</p>
              </div>
              <Button
                size="sm"
                onClick={() => generatePDF(r.type)}
                disabled={loading !== null}
              >
                {loading === r.type ? (
                  '生成中…'
                ) : (
                  <>
                    <Download size={14} className="mr-1" />
                    PDF
                  </>
                )}
              </Button>
            </div>
          </Card>
        ))}

        {error && (
          <p className="text-sm text-danger text-center bg-danger-soft rounded-xl py-3 px-4">
            {error}
          </p>
        )}

        <Card className="!bg-primary/[0.04] border border-primary/10">
          <p className="text-xs text-text-2">
            月計表は毎月の申告書添付資料として提出します。
            納入申告書は3ヶ月分をまとめて提出（年税額360万円未満の承認がある場合は四半期ごと）。
          </p>
          <p className="text-xs text-text-3 mt-1">
            「宿泊システム導入事業者は任意様式で可」（野沢温泉村）
          </p>
        </Card>
      </div>
    </div>
  )
}
