'use client'

import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { fetchTaxPeriods } from '@/lib/api/tax'

export default function TaxSettings() {
  const { data: periods = [] } = useQuery({
    queryKey: ['taxPeriods'],
    queryFn: fetchTaxPeriods,
  })

  function formatDate(dateStr: string) {
    return format(parseISO(dateStr), 'yyyy年M月d日', { locale: ja })
  }

  return (
    <div>
      <PageHeader title="宿泊税" />

      <div className="px-4 py-4 space-y-4 pb-32">
        <p className="text-sm text-text-2">
          野沢温泉村の宿泊税は2026年6月1日開始。1人1泊6,000円以上の場合に課税されます。
        </p>

        {periods.map(p => (
          <Card key={p.id}>
            <p className="text-sm font-bold">
              {formatDate(p.effective_from)}〜 税率{p.rate_percent}% 免税点&yen;{p.threshold.toLocaleString()}/人泊
            </p>
            {p.notes && <p className="text-xs text-text-3 mt-1">{p.notes}</p>}
          </Card>
        ))}

        {periods.length === 0 && (
          <p className="text-sm text-text-3 text-center py-6">税期間が登録されていません</p>
        )}

        <p className="text-xs text-text-3 text-center mt-4">
          宿泊税の設定変更は管理者にお問い合わせください
        </p>
      </div>
    </div>
  )
}
