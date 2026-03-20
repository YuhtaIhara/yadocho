import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { registerFonts } from './fonts'
import { toReiwaLabel } from '@/lib/utils/reiwa'
import type { MonthlyTaxSummary } from '@/lib/utils/tax-report'

registerFonts()

/**
 * 長野県 月計表（宿泊税月計表）
 *
 * 仕様: tax-form-spec.md セクション 1.4 + 6.2
 * - A4縦、6列: 日付 / 課税対象 / 課税対象外計 / 6千円未満 / 課税免除 / うち外国大使等
 * - 金額列なし（宿泊数のみ）
 * - 課税対象外計 = 6千円未満 + 課税免除
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1,
    fontSize: 9,
  },
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
    padding: '2 2',
    fontSize: 7,
    fontWeight: 700,
    textAlign: 'center',
  },
  cell: {
    borderRight: BORDER_THICK,
    padding: '1.5 2',
    fontSize: 8.5,
    textAlign: 'right',
  },
  cellCenter: {
    borderRight: BORDER_THICK,
    padding: '1.5 2',
    fontSize: 8.5,
    textAlign: 'center',
  },
  cellBold: {
    borderRight: BORDER_THICK,
    padding: '1.5 2',
    fontSize: 8.5,
    textAlign: 'right',
    fontWeight: 700,
  },
  colDay: { width: 24 },
  colTaxable: { width: 62 },
  colExemptTotal: { width: 72 },
  colBelow: { width: 72 },
  colExempt: { width: 62 },
  colDiplomatic: { width: 80 },
  footer: {
    marginTop: 6,
    fontSize: 7,
    color: '#666',
  },
})

type Props = {
  data: MonthlyTaxSummary
  innName: string
  prefTaxNo?: string
}

export function PrefMonthlyReport({ data, innName, prefTaxNo }: Props) {
  const reiwaLabel = toReiwaLabel(data.year, data.month)

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>宿泊税月計表</Text>

        <View style={s.infoRow}>
          <Text>{reiwaLabel}分</Text>
        </View>
        <View style={s.infoRow}>
          <Text>課税番号: {prefTaxNo || '________'}</Text>
        </View>
        <View style={s.infoRow}>
          <Text>施設の名称又は届出番号: {innName}</Text>
        </View>

        <View style={s.table}>
          {/* Header */}
          <View style={s.row}>
            <View style={[s.headerCell, s.colDay]}>
              <Text>日付</Text>
            </View>
            <View style={[s.headerCell, s.colTaxable]}>
              <Text>課税対象</Text>
            </View>
            <View style={[s.headerCell, s.colExemptTotal]}>
              <Text>課税対象外計</Text>
              <Text style={{ fontSize: 5.5 }}>①+②</Text>
            </View>
            <View style={[s.headerCell, s.colBelow]}>
              <Text>1人1泊</Text>
              <Text>6千円未満 ①</Text>
            </View>
            <View style={[s.headerCell, s.colExempt]}>
              <Text>課税免除 ②</Text>
            </View>
            <View style={[s.headerCell, s.colDiplomatic]}>
              <Text>うち外国の</Text>
              <Text>大使等の任務遂行</Text>
            </View>
          </View>

          {/* Data rows */}
          {Array.from({ length: 31 }, (_, i) => {
            const row = data.rows[i]
            const dayLabel = i < data.daysInMonth ? String(i + 1) : ''
            const isEmpty = !row || (row.taxableStays === 0 && row.belowThresholdStays === 0 && row.exemptStays === 0)
            const exemptTotal = row ? row.belowThresholdStays + row.exemptStays : 0

            return (
              <View key={i} style={s.row}>
                <View style={[s.cellCenter, s.colDay]}>
                  <Text>{dayLabel}</Text>
                </View>
                <View style={[s.cell, s.colTaxable]}>
                  <Text>{dayLabel && !isEmpty ? row!.taxableStays : ''}</Text>
                </View>
                <View style={[s.cell, s.colExemptTotal]}>
                  <Text>{dayLabel && !isEmpty && exemptTotal > 0 ? exemptTotal : ''}</Text>
                </View>
                <View style={[s.cell, s.colBelow]}>
                  <Text>{dayLabel && !isEmpty && row!.belowThresholdStays > 0 ? row!.belowThresholdStays : ''}</Text>
                </View>
                <View style={[s.cell, s.colExempt]}>
                  <Text>{dayLabel && !isEmpty && row!.exemptStays > 0 ? row!.exemptStays : ''}</Text>
                </View>
                <View style={[s.cell, s.colDiplomatic]}>
                  <Text />
                </View>
              </View>
            )
          })}

          {/* Totals */}
          <View style={s.rowBold}>
            <View style={[s.cellBold, s.colDay]}>
              <Text>計</Text>
            </View>
            <View style={[s.cellBold, s.colTaxable]}>
              <Text>{data.totals.taxableStays || ''}</Text>
            </View>
            <View style={[s.cellBold, s.colExemptTotal]}>
              <Text>
                {data.totals.belowThresholdStays + data.totals.exemptStays > 0
                  ? data.totals.belowThresholdStays + data.totals.exemptStays
                  : ''}
              </Text>
            </View>
            <View style={[s.cellBold, s.colBelow]}>
              <Text>{data.totals.belowThresholdStays || ''}</Text>
            </View>
            <View style={[s.cellBold, s.colExempt]}>
              <Text>{data.totals.exemptStays || ''}</Text>
            </View>
            <View style={[s.cellBold, s.colDiplomatic]}>
              <Text />
            </View>
          </View>
        </View>

        <View style={s.footer}>
          <Text>※ 記載項目を満たしていれば任意の様式で結構です（長野県）</Text>
          <Text style={{ marginTop: 4 }}>yadocho により自動生成</Text>
        </View>
      </Page>
    </Document>
  )
}
