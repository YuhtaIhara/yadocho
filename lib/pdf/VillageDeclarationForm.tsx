import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { registerFonts } from './fonts'
import { toReiwaLabel, toReiwaDateLabel } from '@/lib/utils/reiwa'
import type { MonthlyTaxSummary } from '@/lib/utils/tax-report'

registerFonts()

/**
 * 野沢温泉村 様式第2号（宿泊税納入申告書）
 *
 * 仕様: tax-form-spec.md セクション 1.1 + 6.1
 * - A4縦、3ヶ月分を1枚に収める
 * - 印刷倍率72%相当のフォントサイズ
 */

const BORDER = '0.5pt solid #000'
const BORDER_THICK = '1pt solid #000'

const s = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansJP',
    fontSize: 7.2, // 10pt × 0.72
    paddingTop: 19,
    paddingBottom: 15,
    paddingLeft: 18,
    paddingRight: 15,
  },
  // Header
  formNumber: {
    fontSize: 6,
    color: '#333',
    marginBottom: 2,
  },
  title: {
    fontSize: 10,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 6,
  },
  addressee: {
    fontSize: 7.2,
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  infoSection: {
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    borderBottom: '0.3pt solid #999',
    paddingBottom: 2,
    marginBottom: 3,
  },
  infoLabel: {
    width: 80,
    fontSize: 6.5,
    color: '#333',
  },
  infoValue: {
    flex: 1,
    fontSize: 7.2,
  },
  // Declaration block
  blockContainer: {
    marginBottom: 6,
  },
  // Table header
  tableHeader: {
    flexDirection: 'row',
    borderTop: BORDER_THICK,
    borderLeft: BORDER_THICK,
    backgroundColor: '#f8f8f8',
  },
  thCell: {
    borderRight: BORDER_THICK,
    borderBottom: BORDER_THICK,
    padding: '2 2',
    fontSize: 5.5,
    fontWeight: 700,
    textAlign: 'center',
  },
  // Table data row
  dataRow: {
    flexDirection: 'row',
    borderLeft: BORDER_THICK,
  },
  tdCell: {
    borderRight: BORDER_THICK,
    borderBottom: BORDER,
    padding: '2 2',
    fontSize: 7,
  },
  tdCellRight: {
    borderRight: BORDER_THICK,
    borderBottom: BORDER,
    padding: '2 2',
    fontSize: 7,
    textAlign: 'right',
  },
  tdCellCenter: {
    borderRight: BORDER_THICK,
    borderBottom: BORDER,
    padding: '2 2',
    fontSize: 7,
    textAlign: 'center',
  },
  // Remark row
  remarkRow: {
    flexDirection: 'row',
    borderLeft: BORDER_THICK,
    borderBottom: BORDER_THICK,
  },
  remarkCell: {
    flex: 1,
    borderRight: BORDER_THICK,
    padding: '2 4',
    fontSize: 6,
    minHeight: 16,
  },
  // Column widths (proportional to spec)
  colMonth: { width: 60 },
  colCategory: { width: 130 },
  colStays: { width: 55 },
  colBase: { width: 100 },
  colRate: { width: 40 },
  colTax: { width: 85 },
  // Notes
  noteBlock: {
    marginTop: 4,
    fontSize: 5,
    color: '#555',
    lineHeight: 1.6,
  },
  // Footer
  footer: {
    marginTop: 'auto',
    fontSize: 4.5,
    color: '#999',
  },
})

type Props = {
  /** 3ヶ月分のデータ（四半期） */
  months: MonthlyTaxSummary[]
  innName: string
  innAddress: string
  representative: string
  phone: string
  /** 申告日（YYYY-MM-DD） */
  filingDate: string
  taxRatePercent: number
}

function DeclarationBlock({
  data,
  taxRatePercent,
}: {
  data: MonthlyTaxSummary
  taxRatePercent: number
}) {
  const yearMonth = toReiwaLabel(data.year, data.month)

  return (
    <View style={s.blockContainer}>
      {/* Table header */}
      <View style={s.tableHeader}>
        <View style={[s.thCell, s.colMonth]}>
          <Text>宿泊年月</Text>
        </View>
        <View style={[s.thCell, s.colCategory]}>
          <Text>区分</Text>
        </View>
        <View style={[s.thCell, s.colStays]}>
          <Text>（単位:泊）</Text>
        </View>
        <View style={[s.thCell, s.colBase]}>
          <Text>①課税対象総額（円）</Text>
          <Text style={{ fontSize: 4.5 }}>100円未満切捨て</Text>
        </View>
        <View style={[s.thCell, s.colRate]}>
          <Text>②税率</Text>
          <Text>％</Text>
        </View>
        <View style={[s.thCell, s.colTax]}>
          <Text>①×②宿泊税額（円）</Text>
          <Text style={{ fontSize: 4.5 }}>1円未満切捨て</Text>
        </View>
      </View>

      {/* Row 1: 6000円以上 */}
      <View style={s.dataRow}>
        <View style={[s.tdCell, s.colMonth]}>
          <Text>{yearMonth}</Text>
        </View>
        <View style={[s.tdCell, s.colCategory]}>
          <Text>1人1泊6,000円以上の宿泊延べ数</Text>
        </View>
        <View style={[s.tdCellRight, s.colStays]}>
          <Text>{data.totals.taxableStays || ''}</Text>
        </View>
        <View style={[s.tdCellRight, s.colBase]}>
          <Text>
            {data.totals.taxableBase > 0
              ? data.totals.taxableBase.toLocaleString()
              : ''}
          </Text>
        </View>
        <View style={[s.tdCellCenter, s.colRate]}>
          <Text>{taxRatePercent}%</Text>
        </View>
        <View style={[s.tdCellRight, s.colTax]}>
          <Text>
            {data.totals.taxAmount > 0
              ? data.totals.taxAmount.toLocaleString()
              : ''}
          </Text>
        </View>
      </View>

      {/* Row 2: 6000円以下 */}
      <View style={s.dataRow}>
        <View style={[s.tdCell, s.colMonth]}>
          <Text />
        </View>
        <View style={[s.tdCell, s.colCategory]}>
          <Text>1人1泊6,000円以下の宿泊延べ数</Text>
        </View>
        <View style={[s.tdCellRight, s.colStays]}>
          <Text>{data.totals.belowThresholdStays || ''}</Text>
        </View>
        <View style={[s.tdCell, s.colBase]}>
          <Text style={{ fontSize: 4.5, color: '#666' }}>
            ※飲食代・消費税・入湯税等を除いた総額
          </Text>
        </View>
        <View style={[s.tdCell, s.colRate]}>
          <Text />
        </View>
        <View style={[s.tdCell, s.colTax]}>
          <Text />
        </View>
      </View>

      {/* Row 3: 教育活動等課税免除 */}
      <View style={s.dataRow}>
        <View style={[s.tdCell, s.colMonth]}>
          <Text />
        </View>
        <View style={[s.tdCell, s.colCategory]}>
          <Text>教育活動等課税免除の宿泊延べ数</Text>
        </View>
        <View style={[s.tdCellRight, s.colStays]}>
          <Text>{data.totals.exemptStays || ''}</Text>
        </View>
        <View style={[s.tdCell, s.colBase]}>
          <Text style={{ fontSize: 4.5, color: '#666' }}>
            ※宿泊税が0円の月も申告書を提出
          </Text>
        </View>
        <View style={[s.tdCell, s.colRate]}>
          <Text />
        </View>
        <View style={[s.tdCell, s.colTax]}>
          <Text />
        </View>
      </View>

      {/* Remark row */}
      <View style={s.remarkRow}>
        <View style={s.remarkCell}>
          <Text>備考:</Text>
        </View>
      </View>
    </View>
  )
}

export function VillageDeclarationForm({
  months,
  innName,
  innAddress,
  representative,
  phone,
  filingDate,
  taxRatePercent,
}: Props) {
  const filingDateParts = filingDate.split('-').map(Number)
  const filingLabel = toReiwaDateLabel(
    filingDateParts[0], filingDateParts[1], filingDateParts[2],
  )

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Form number */}
        <Text style={s.formNumber}>（様式第2号）（第5条関係）</Text>

        {/* Title */}
        <Text style={s.title}>宿泊税納入申告書</Text>

        {/* Addressee */}
        <Text style={s.addressee}>野沢温泉村長　様</Text>

        {/* Filing date */}
        <View style={s.dateRow}>
          <Text>{filingLabel}</Text>
        </View>

        {/* Inn info */}
        <View style={s.infoSection}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>住所</Text>
            <Text style={s.infoValue}>
              下高井郡野沢温泉村{innAddress ? ` ${innAddress}` : ''}
            </Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>施設名（屋号）</Text>
            <Text style={s.infoValue}>{innName}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>特別徴収義務者</Text>
            <Text style={s.infoValue}>{representative}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>電話番号</Text>
            <Text style={s.infoValue}>{phone}</Text>
          </View>
        </View>

        {/* Declaration blocks (up to 3 months) */}
        {months.map((m, i) => (
          <DeclarationBlock
            key={i}
            data={m}
            taxRatePercent={taxRatePercent}
          />
        ))}

        {/* Fill empty blocks if less than 3 months */}
        {months.length < 3 &&
          Array.from({ length: 3 - months.length }, (_, i) => (
            <DeclarationBlock
              key={`empty-${i}`}
              data={{
                year: 0,
                month: 0,
                daysInMonth: 0,
                rows: [],
                totals: {
                  day: 0,
                  taxableStays: 0,
                  belowThresholdStays: 0,
                  exemptStays: 0,
                  taxableBase: 0,
                  taxAmount: 0,
                },
              }}
              taxRatePercent={taxRatePercent}
            />
          ))}

        {/* Footer notes */}
        <View style={s.noteBlock}>
          <Text>
            ※ 教育活動等課税免除の場合、受領した証明書は宿泊施設において5年間保存してください。
          </Text>
          <Text>
            ※ 前月中の宿泊について記載し、毎月末日までに提出してください。
          </Text>
          <Text>
            ※
            年税額360万円未満の承認を受けている場合は3月/6月/9月/12月末日までに提出してください。
          </Text>
        </View>

        <View style={s.footer}>
          <Text>yadocho により自動生成</Text>
        </View>
      </Page>
    </Document>
  )
}
