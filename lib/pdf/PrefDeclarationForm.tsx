import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { registerFonts } from './fonts'
import { toReiwaLabel, toReiwaDateLabel } from '@/lib/utils/reiwa'
import type { MonthlyTaxSummary } from '@/lib/utils/tax-report'

registerFonts()

/**
 * 長野県 様式第2号（宿泊税納入申告書）
 *
 * 仕様: tax-form-spec.md セクション 1.3
 * - A4縦、3ヶ月分を1枚
 * - 村版と異なり備考欄に課税対象外の内訳（3区分）を記載
 * - 税額は flat（定額 × 宿泊数）
 */

const BORDER = '0.5pt solid #000'
const BORDER_THICK = '1pt solid #000'

const s = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansJP',
    fontSize: 7.2,
    paddingTop: 19,
    paddingBottom: 15,
    paddingLeft: 18,
    paddingRight: 15,
  },
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
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    borderBottom: '0.3pt solid #999',
    paddingBottom: 2,
    marginBottom: 3,
  },
  infoLabel: {
    width: 110,
    fontSize: 6,
    color: '#333',
  },
  infoValue: {
    flex: 1,
    fontSize: 7.2,
  },
  blockContainer: {
    marginBottom: 4,
  },
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
  remarkRow: {
    borderLeft: BORDER_THICK,
    borderBottom: BORDER_THICK,
    borderRight: BORDER_THICK,
    padding: '3 4',
    fontSize: 6,
  },
  remarkLine: {
    flexDirection: 'row',
    marginBottom: 1,
  },
  remarkLabel: {
    width: 200,
    fontSize: 5.5,
  },
  remarkValue: {
    fontSize: 6,
    textAlign: 'right',
    width: 50,
  },
  colMonth: { width: 55 },
  colCategory: { width: 120 },
  colStays: { width: 60 },
  colRate: { width: 70 },
  colTax: { width: 80 },
  noteBlock: {
    marginTop: 4,
    fontSize: 5,
    color: '#555',
    lineHeight: 1.6,
  },
  footer: {
    marginTop: 'auto',
    fontSize: 4.5,
    color: '#999',
  },
})

type Props = {
  months: MonthlyTaxSummary[]
  innName: string
  innAddress: string
  representative: string
  phone: string
  filingDate: string
  /** 県税の定額（経過措置: 100円） */
  prefFlatAmount: number
  /** 県税事務所名 */
  prefTaxOffice?: string
  prefTaxNo?: string
}

function PrefBlock({
  data,
  prefFlatAmount,
}: {
  data: MonthlyTaxSummary
  prefFlatAmount: number
}) {
  const yearMonth = data.year > 0 ? toReiwaLabel(data.year, data.month) : ''
  const taxAmount = data.totals.taxableStays * prefFlatAmount

  return (
    <View style={s.blockContainer}>
      <View style={s.tableHeader}>
        <View style={[s.thCell, s.colMonth]}>
          <Text>申告年月</Text>
        </View>
        <View style={[s.thCell, s.colCategory]}>
          <Text>区分</Text>
        </View>
        <View style={[s.thCell, s.colStays]}>
          <Text>宿泊数</Text>
        </View>
        <View style={[s.thCell, s.colRate]}>
          <Text>税率</Text>
        </View>
        <View style={[s.thCell, s.colTax]}>
          <Text>税額</Text>
        </View>
      </View>

      {/* Row 1: 課税対象 */}
      <View style={s.dataRow}>
        <View style={[s.tdCell, s.colMonth]}>
          <Text>{yearMonth}</Text>
        </View>
        <View style={[s.tdCell, s.colCategory]}>
          <Text>1人1泊6千円以上の宿泊</Text>
        </View>
        <View style={[s.tdCellRight, s.colStays]}>
          <Text>{data.totals.taxableStays ? `${data.totals.taxableStays}泊` : ''}</Text>
        </View>
        <View style={[s.tdCellCenter, s.colRate]}>
          <Text>¥{prefFlatAmount}/泊</Text>
        </View>
        <View style={[s.tdCellRight, s.colTax]}>
          <Text>{taxAmount > 0 ? `${taxAmount.toLocaleString()}円` : ''}</Text>
        </View>
      </View>

      {/* Row 2: 課税対象外 */}
      <View style={s.dataRow}>
        <View style={[s.tdCell, s.colMonth]}>
          <Text />
        </View>
        <View style={[s.tdCell, s.colCategory]}>
          <Text>課税対象外</Text>
        </View>
        <View style={[s.tdCellRight, s.colStays]}>
          <Text>
            {data.totals.belowThresholdStays + data.totals.exemptStays > 0
              ? `${data.totals.belowThresholdStays + data.totals.exemptStays}泊`
              : ''}
          </Text>
        </View>
        <View style={[s.tdCell, s.colRate]}>
          <Text />
        </View>
        <View style={[s.tdCell, s.colTax]}>
          <Text />
        </View>
      </View>

      {/* Remark: 課税対象外の内訳 */}
      <View style={s.remarkRow}>
        <Text style={{ fontSize: 5.5, marginBottom: 2 }}>備考 課税対象外の宿泊の内訳:</Text>
        <View style={s.remarkLine}>
          <Text style={s.remarkLabel}>(1) 1人1泊6千円未満の宿泊</Text>
          <Text style={s.remarkValue}>
            {data.totals.belowThresholdStays > 0 ? `${data.totals.belowThresholdStays}泊` : ''}
          </Text>
        </View>
        <View style={s.remarkLine}>
          <Text style={s.remarkLabel}>(2) 長野県宿泊税条例第3条により課税免除される宿泊</Text>
          <Text style={s.remarkValue}>
            {data.totals.exemptStays > 0 ? `${data.totals.exemptStays}泊` : ''}
          </Text>
        </View>
        <View style={s.remarkLine}>
          <Text style={s.remarkLabel}>(3) 外国の大使等の任務遂行に伴う宿泊</Text>
          <Text style={s.remarkValue} />
        </View>
      </View>
    </View>
  )
}

export function PrefDeclarationForm({
  months,
  innName,
  innAddress,
  representative,
  phone,
  filingDate,
  prefFlatAmount,
  prefTaxOffice,
  prefTaxNo,
}: Props) {
  const filingDateParts = filingDate.split('-').map(Number)
  const filingLabel = toReiwaDateLabel(
    filingDateParts[0], filingDateParts[1], filingDateParts[2],
  )

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.formNumber}>（様式第2号）（第5条関係）</Text>
        <Text style={s.title}>宿泊税納入申告書</Text>

        <Text style={s.addressee}>
          長野県{prefTaxOffice ? `　${prefTaxOffice}` : '　　　'}県税事務所長 殿
        </Text>

        <View style={s.dateRow}>
          <Text>{filingLabel}</Text>
        </View>

        <View style={s.infoSection}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>住（居）所（所在地）</Text>
            <Text style={s.infoValue}>{innAddress}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>電話番号</Text>
            <Text style={s.infoValue}>{phone}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>氏名（法人名）</Text>
            <Text style={s.infoValue}>{representative}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>施設の名称又は届出番号</Text>
            <Text style={s.infoValue}>{innName}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>課税番号</Text>
            <Text style={s.infoValue}>{prefTaxNo || ''}</Text>
          </View>
        </View>

        {months.map((m, i) => (
          <PrefBlock key={i} data={m} prefFlatAmount={prefFlatAmount} />
        ))}

        {months.length < 3 &&
          Array.from({ length: 3 - months.length }, (_, i) => (
            <PrefBlock
              key={`empty-${i}`}
              data={{
                year: 0, month: 0, daysInMonth: 0, rows: [],
                totals: { day: 0, taxableStays: 0, belowThresholdStays: 0, exemptStays: 0, taxableBase: 0, taxAmount: 0 },
              }}
              prefFlatAmount={prefFlatAmount}
            />
          ))}

        <View style={s.noteBlock}>
          <Text>※ ※欄は記入しないでください</Text>
          <Text>※ 課税対象及び課税対象外の宿泊数が宿泊年月日ごとに記入された書類を添付してください（月計表）</Text>
          <Text>※ 宿泊税額が0円の場合も申告書を提出してください</Text>
        </View>

        <View style={s.footer}>
          <Text>yadocho により自動生成</Text>
        </View>
      </Page>
    </Document>
  )
}
