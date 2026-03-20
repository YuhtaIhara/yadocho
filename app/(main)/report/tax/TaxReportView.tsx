'use client'

import { useState } from 'react'
import { format, startOfMonth, addMonths, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, FileText, Download } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getSupabase } from '@/lib/supabase'

type ReportType = 'village-monthly' | 'village-form'

const REPORT_TYPES: { type: ReportType; label: string; desc: string }[] = [
  {
    type: 'village-monthly',
    label: '月計表',
    desc: '日別の宿泊者数・課税標準額・税額',
  },
  {
    type: 'village-form',
    label: '納入申告書（様式第2号）',
    desc: '3ヶ月分の申告書。村に提出',
  },
]

export default function TaxReportView() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [loading, setLoading] = useState<ReportType | null>(null)
  const [error, setError] = useState('')

  const year = month.getFullYear()
  const monthNum = month.getMonth() + 1

  async function downloadPDF(type: ReportType) {
    setLoading(type)
    setError('')
    try {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('ログインが必要です')
        return
      }

      const params = new URLSearchParams({
        type,
        year: String(year),
        month: String(monthNum),
      })

      const res = await fetch(`/api/tax-report?${params}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error || 'PDF生成に失敗しました')
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      // Open in new tab for preview
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
                onClick={() => downloadPDF(r.type)}
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
