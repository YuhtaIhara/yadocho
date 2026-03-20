import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { registerFonts } from './fonts'
import { toReiwaLabel } from '@/lib/utils/reiwa'
import type { MonthlyTaxSummary } from '@/lib/utils/tax-report'

registerFonts()

/**
 * 野沢温泉村 月計表（宿泊税月経表）
 *
 * 仕様: tax-form-spec.md セクション 1.2 + 6.2
 * - A4縦、印刷倍率89%
 * - 4列: 日 / 宿泊者数（課税）/ 課税免除 / 課税標準額 / 宿泊税額
 * - 31行 + 合計行
 * - 「宿泊システム導入事業者は任意様式で可」
 */

const BORDER = '0.5pt solid #000'
const BORDER_THICK = '1pt solid #000'

const s = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansJP',
    fontSize: 9,
    paddingTop: 19,
    paddingBottom: 19,
    paddingLeft: 26,
    paddingRight: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  headerLabel: {
    fontSize: 10,
  },
  headerValue: {
    fontSize: 10,
    textDecoration: 'underline',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1,
    fontSize: 9,
  },
  // Table
  table: {
    borderTop: BORDER_THICK,
    borderLeft: BORDER_THICK,
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    borderBottom: BORDER,
  },
  rowBold: {
    flexDirection: 'row',
    borderBottom: BORDER_THICK,
    backgroundColor: '#f5f5f5',
  },
  headerCell: {
    borderRight: BORDER_THICK,
    padding: '2 3',
    fontSize: 8,
    fontWeight: 700,
    textAlign: 'center',
  },
  cell: {
    borderRight: BORDER_THICK,
    padding: '1.5 3',
    fontSize: 8.5,
    textAlign: 'right',
  },
  cellLeft: {
    borderRight: BORDER_THICK,
    padding: '1.5 3',
    fontSize: 8.5,
    textAlign: 'center',
  },
  cellBold: {
    borderRight: BORDER_THICK,
    padding: '1.5 3',
    fontSize: 8.5,
    textAlign: 'right',
    fontWeight: 700,
  },
  // Column widths
  colDay: { width: 28 },
  colStays: { width: 90 },
  colExempt: { width: 70 },
  colBase: { width: 100 },
  colTax: { width: 100 },
  // Footer
  footer: {
    marginTop: 6,
    fontSize: 7,
    color: '#666',
  },
})

type Props = {
  data: MonthlyTaxSummary
  innName: string
  representative: string
  registrationNo?: string
}

export function VillageMonthlyReport({ data, innName, representative, registrationNo }: Props) {
  const reiwaLabel = toReiwaLabel(data.year, data.month)

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Title */}
        <Text style={s.title}>宿泊税月経表</Text>

        {/* Header info */}
        <View style={s.headerRow}>
          <Text style={s.headerLabel}>{reiwaLabel}分</Text>
        </View>
        <View style={s.infoRow}>
          <Text>指定番号: {registrationNo || '________'}</Text>
        </View>
        <View style={s.infoRow}>
          <Text>宿泊施設の名称: {innName}</Text>
        </View>
        <View style={s.infoRow}>
          <Text>特別徴収義務者の氏名又は名称: {representative}</Text>
        </View>

        {/* Table */}
        <View style={s.table}>
          {/* Header row */}
          <View style={s.row}>
            <View style={[s.headerCell, s.colDay]}>
              <Text>日</Text>
            </View>
            <View style={[s.headerCell, s.colStays]}>
              <Text>1.宿泊者数</Text>
              <Text>（課税）</Text>
            </View>
            <View style={[s.headerCell, s.colExempt]}>
              <Text>2.課税免除</Text>
            </View>
            <View style={[s.headerCell, s.colBase]}>
              <Text>3.課税標準額</Text>
            </View>
            <View style={[s.headerCell, s.colTax]}>
              <Text>4.宿泊税額</Text>
            </View>
          </View>

          {/* Data rows (1-31) */}
          {Array.from({ length: 31 }, (_, i) => {
            const row = data.rows[i]
            const isEmpty = !row || (row.taxableStays === 0 && row.exemptStays === 0)
            const dayLabel = i < data.daysInMonth ? String(i + 1) : ''

            return (
              <View key={i} style={s.row}>
                <View style={[s.cellLeft, s.colDay]}>
                  <Text>{dayLabel}</Text>
                </View>
                <View style={[s.cell, s.colStays]}>
                  <Text>{dayLabel && !isEmpty ? row!.taxableStays : ''}</Text>
                </View>
                <View style={[s.cell, s.colExempt]}>
                  <Text>{dayLabel && !isEmpty ? (row!.exemptStays || '') : ''}</Text>
                </View>
                <View style={[s.cell, s.colBase]}>
                  <Text>
                    {dayLabel && !isEmpty && row!.taxableBase > 0
                      ? row!.taxableBase.toLocaleString()
                      : ''}
                  </Text>
                </View>
                <View style={[s.cell, s.colTax]}>
                  <Text>
                    {dayLabel && !isEmpty && row!.taxAmount > 0
                      ? row!.taxAmount.toLocaleString()
                      : ''}
                  </Text>
                </View>
              </View>
            )
          })}

          {/* Totals row */}
          <View style={s.rowBold}>
            <View style={[s.cellBold, s.colDay]}>
              <Text>計</Text>
            </View>
            <View style={[s.cellBold, s.colStays]}>
              <Text>{data.totals.taxableStays || ''}</Text>
            </View>
            <View style={[s.cellBold, s.colExempt]}>
              <Text>{data.totals.exemptStays || ''}</Text>
            </View>
            <View style={[s.cellBold, s.colBase]}>
              <Text>
                {data.totals.taxableBase > 0
                  ? data.totals.taxableBase.toLocaleString()
                  : ''}
              </Text>
            </View>
            <View style={[s.cellBold, s.colTax]}>
              <Text>
                {data.totals.taxAmount > 0
                  ? data.totals.taxAmount.toLocaleString()
                  : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer notes */}
        <View style={s.footer}>
          <Text>※ 宿泊システム導入事業者においては、この様式の要件を満たすものであれば任意様式でもかまいません</Text>
          <Text>※ 1.宿泊者数 = 宿泊延べ人数</Text>
          <Text>※ 2.課税免除 = 修学旅行生等の課税免除となった人数</Text>
          <Text>※ 3.課税標準額 = 宿泊料金総額から消費税・宿泊税・食事代等を除いて100円未満切捨て</Text>
          <Text>※ 4.宿泊税額 = 課税標準額×3.5%（1円単位未満切捨て）</Text>
          <Text style={{ marginTop: 4 }}>yadocho により自動生成</Text>
        </View>
      </Page>
    </Document>
  )
}
