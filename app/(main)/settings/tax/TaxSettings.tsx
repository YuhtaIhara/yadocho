'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { MapPin, AlertTriangle } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { useTaxData } from '@/lib/hooks/useTaxRules'
import { setupMunicipalityTaxRules, type MunicipalityCode } from '@/lib/api/tax'
import { formatDateJP } from '@/lib/utils/date'
import type { TaxRule, TaxRuleRate } from '@/lib/types'

const MUNICIPALITIES: { code: MunicipalityCode; label: string; desc: string }[] = [
  { code: 'nozawa', label: '野沢温泉村', desc: '県税込み3.5%（経過措置）→ 5%（本則）' },
  { code: 'hakuba', label: '白馬村', desc: '県税flat + 村税tiered' },
  { code: 'karuizawa', label: '軽井沢町', desc: '県税flat + 町税tiered' },
  { code: 'matsumoto', label: '松本市', desc: '県税flat + 市税flat' },
  { code: 'achi', label: '阿智村', desc: '県税flat + 村税flat' },
  { code: 'nagano_other', label: 'その他長野県', desc: '県税flatのみ' },
  { code: 'tokyo', label: '東京都', desc: 'tiered 100/200円' },
  { code: 'kutchan', label: '倶知安町', desc: 'percentage 2%→3%' },
]

const CALC_METHOD_LABEL: Record<string, string> = {
  flat: '定額',
  tiered: '段階定額',
  percentage: '定率',
  inclusive_percentage: '県税込み定率',
}

function rateDescription(rule: TaxRule, rates: TaxRuleRate[]): string {
  const ruleRates = rates.filter(r => r.tax_rule_id === rule.id)
  switch (rule.calc_method) {
    case 'flat':
      return ruleRates[0]?.flat_amount != null ? `¥${ruleRates[0].flat_amount}/人泊` : '—'
    case 'percentage':
    case 'inclusive_percentage':
      return ruleRates[0]?.rate_percent != null ? `${ruleRates[0].rate_percent}%` : '—'
    case 'tiered':
      return ruleRates
        .map(r => {
          const max = r.bracket_max ? `¥${(r.bracket_max / 1000).toFixed(0)}k` : '〜'
          return `¥${(r.bracket_min / 1000).toFixed(0)}k–${max}: ¥${r.flat_amount}`
        })
        .join(', ')
    default:
      return '—'
  }
}

function periodLabel(rule: TaxRule): string {
  const from = formatDateJP(rule.effective_from)
  const to = rule.effective_to ? formatDateJP(rule.effective_to) : ''
  return `${from}〜${to}`
}

export default function TaxSettings() {
  const queryClient = useQueryClient()
  const { taxRules, taxRuleRates, isLoading } = useTaxData()
  const [confirmMuni, setConfirmMuni] = useState<typeof MUNICIPALITIES[0] | null>(null)
  const [setting, setSetting] = useState(false)
  const [error, setError] = useState('')

  // Group rules by effective period
  const periodKey = (r: TaxRule) => `${r.effective_from}|${r.effective_to ?? ''}`
  const periods = taxRules.reduce<Map<string, TaxRule[]>>((map, rule) => {
    const key = periodKey(rule)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(rule)
    return map
  }, new Map())

  async function handleSetup() {
    if (!confirmMuni) return
    setSetting(true)
    setError('')
    try {
      await setupMunicipalityTaxRules(confirmMuni.code)
      queryClient.invalidateQueries({ queryKey: ['taxRules'] })
      queryClient.invalidateQueries({ queryKey: ['taxRuleRates'] })
      setConfirmMuni(null)
    } catch (err) {
      console.error(err)
      setError('設定に失敗しました。もう一度お試しください。')
    } finally {
      setSetting(false)
    }
  }

  return (
    <div>
      <PageHeader title="宿泊税" />

      <div className="px-4 py-4 flex flex-col gap-4 pb-32">
        {/* Current rules display */}
        {isLoading ? (
          <p className="text-sm text-text-3 text-center py-6">読み込み中…</p>
        ) : taxRules.length > 0 ? (
          <>
            <p className="text-sm text-text-2">
              現在の税ルール設定です。変更するには自治体を再選択してください。
            </p>
            {[...periods.entries()].map(([key, rules]) => (
              <Card key={key}>
                <p className="text-xs font-semibold text-primary mb-2">
                  {periodLabel(rules[0])}
                </p>
                <div className="space-y-2">
                  {rules.map(rule => (
                    <div key={rule.id} className="flex justify-between items-baseline">
                      <div>
                        <p className="text-sm font-medium">{rule.tax_name}</p>
                        <p className="text-xs text-text-3">
                          {CALC_METHOD_LABEL[rule.calc_method]}
                          {rule.threshold > 0 && ` · 免税点 ¥${rule.threshold.toLocaleString()}`}
                          {rule.exempt_school_trips && ' · 修学旅行免税'}
                        </p>
                      </div>
                      <span className="text-sm font-semibold shrink-0 ml-3">
                        {rateDescription(rule, taxRuleRates)}
                      </span>
                    </div>
                  ))}
                </div>
                {rules[0].notes && (
                  <p className="text-xs text-text-3 mt-2 bg-primary-soft/30 rounded-lg px-3 py-1.5">
                    {rules[0].notes}
                  </p>
                )}
              </Card>
            ))}
          </>
        ) : (
          <p className="text-sm text-text-3 text-center py-6">
            宿泊税が設定されていません。下のリストからお住まいの自治体を選択してください。
          </p>
        )}

        {/* Municipality selector */}
        <div className="mt-2">
          <h3 className="text-sm font-bold text-text-1 mb-3 flex items-center gap-1.5">
            <MapPin size={14} />
            自治体から設定
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {MUNICIPALITIES.map(m => (
              <button
                key={m.code}
                type="button"
                onClick={() => setConfirmMuni(m)}
                className="text-left px-3 py-2.5 rounded-xl bg-surface border border-border/40 active:bg-primary-soft transition-colors"
              >
                <p className="text-sm font-semibold">{m.label}</p>
                <p className="text-xs text-text-3 mt-0.5">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Confirmation modal */}
      <Modal
        open={!!confirmMuni}
        onClose={() => { setConfirmMuni(null); setError('') }}
        title="税ルールの設定"
      >
        {confirmMuni && (
          <div className="space-y-4">
            <p className="text-sm">
              <span className="font-bold">{confirmMuni.label}</span>の宿泊税ルールを設定します。
            </p>
            {taxRules.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-warning-soft text-warning text-sm">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>現在の税ルールは上書きされます。</span>
              </div>
            )}
            <p className="text-xs text-text-3">{confirmMuni.desc}</p>
            {error && (
              <p className="text-sm text-danger text-center">{error}</p>
            )}
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={() => { setConfirmMuni(null); setError('') }}
                disabled={setting}
              >
                キャンセル
              </Button>
              <Button
                size="lg"
                className="flex-1"
                onClick={handleSetup}
                disabled={setting}
              >
                {setting ? '設定中…' : '設定する'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
