import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { registerFonts } from './fonts'

registerFonts()

export type DaySummary = {
  dateLabel: string   // "3/21(金)"
  dinnerAdults: number
  dinnerChildren: number
  breakfastAdults: number
  breakfastChildren: number
  lunchAdults: number
  lunchChildren: number
}

export type MealWeeklyReportProps = {
  innName: string
  periodLabel: string  // "3/21〜3/27"
  days: DaySummary[]
  allergies: { name: string; allergy: string }[]
}

const BORDER = '0.5pt solid #333'

const s = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansJP',
    fontSize: 9,
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 10,
    textAlign: 'center',
    color: '#666',
    marginBottom: 12,
  },
  table: {
    borderTop: BORDER,
    borderLeft: BORDER,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
  },
  row: {
    flexDirection: 'row',
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#fafafa',
  },
  cellLabel: {
    width: 55,
    borderRight: BORDER,
    borderBottom: BORDER,
    padding: 3,
    fontSize: 8,
    fontWeight: 700,
  },
  cellDay: {
    flex: 1,
    borderRight: BORDER,
    borderBottom: BORDER,
    padding: 3,
    fontSize: 8,
    textAlign: 'center',
  },
  cellDayHeader: {
    flex: 1,
    borderRight: BORDER,
    borderBottom: BORDER,
    padding: 3,
    fontSize: 8,
    fontWeight: 700,
    textAlign: 'center',
    backgroundColor: '#f5f5f5',
  },
  allergyBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fff5f5',
    border: '0.5pt solid #c00',
    borderRadius: 2,
  },
  allergyTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: '#c00',
    marginBottom: 4,
  },
  allergyItem: {
    fontSize: 9,
    marginBottom: 2,
  },
})

function num(n: number) {
  return n > 0 ? String(n) : ''
}

export default function MealWeeklyReport({
  innName,
  periodLabel,
  days,
  allergies,
}: MealWeeklyReportProps) {
  // Compute totals
  const totals = {
    dinnerAdults: days.reduce((s, d) => s + d.dinnerAdults, 0),
    dinnerChildren: days.reduce((s, d) => s + d.dinnerChildren, 0),
    breakfastAdults: days.reduce((s, d) => s + d.breakfastAdults, 0),
    breakfastChildren: days.reduce((s, d) => s + d.breakfastChildren, 0),
    lunchAdults: days.reduce((s, d) => s + d.lunchAdults, 0),
    lunchChildren: days.reduce((s, d) => s + d.lunchChildren, 0),
  }

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <Text style={s.title}>週間料理一覧</Text>
        <Text style={s.subtitle}>{innName}　{periodLabel}</Text>

        <View style={s.table}>
          {/* Header: dates */}
          <View style={s.headerRow}>
            <Text style={s.cellLabel}></Text>
            {days.map((d, i) => (
              <Text key={i} style={s.cellDayHeader}>{d.dateLabel}</Text>
            ))}
            <Text style={s.cellDayHeader}>合計</Text>
          </View>

          {/* Dinner - adults */}
          <View style={s.row}>
            <Text style={s.cellLabel}>夕食 大人</Text>
            {days.map((d, i) => (
              <Text key={i} style={s.cellDay}>{num(d.dinnerAdults)}</Text>
            ))}
            <Text style={{ ...s.cellDay, fontWeight: 700 }}>{num(totals.dinnerAdults)}</Text>
          </View>
          {/* Dinner - children */}
          <View style={s.row}>
            <Text style={s.cellLabel}>夕食 子供</Text>
            {days.map((d, i) => (
              <Text key={i} style={s.cellDay}>{num(d.dinnerChildren)}</Text>
            ))}
            <Text style={{ ...s.cellDay, fontWeight: 700 }}>{num(totals.dinnerChildren)}</Text>
          </View>

          {/* Breakfast - adults */}
          <View style={s.row}>
            <Text style={s.cellLabel}>朝食 大人</Text>
            {days.map((d, i) => (
              <Text key={i} style={s.cellDay}>{num(d.breakfastAdults)}</Text>
            ))}
            <Text style={{ ...s.cellDay, fontWeight: 700 }}>{num(totals.breakfastAdults)}</Text>
          </View>
          {/* Breakfast - children */}
          <View style={s.row}>
            <Text style={s.cellLabel}>朝食 子供</Text>
            {days.map((d, i) => (
              <Text key={i} style={s.cellDay}>{num(d.breakfastChildren)}</Text>
            ))}
            <Text style={{ ...s.cellDay, fontWeight: 700 }}>{num(totals.breakfastChildren)}</Text>
          </View>

          {/* Lunch - adults */}
          <View style={s.row}>
            <Text style={s.cellLabel}>昼食 大人</Text>
            {days.map((d, i) => (
              <Text key={i} style={s.cellDay}>{num(d.lunchAdults)}</Text>
            ))}
            <Text style={{ ...s.cellDay, fontWeight: 700 }}>{num(totals.lunchAdults)}</Text>
          </View>
          {/* Lunch - children */}
          <View style={s.row}>
            <Text style={s.cellLabel}>昼食 子供</Text>
            {days.map((d, i) => (
              <Text key={i} style={s.cellDay}>{num(d.lunchChildren)}</Text>
            ))}
            <Text style={{ ...s.cellDay, fontWeight: 700 }}>{num(totals.lunchChildren)}</Text>
          </View>

          {/* Total per day */}
          <View style={s.totalRow}>
            <Text style={{ ...s.cellLabel, fontWeight: 700 }}>合計</Text>
            {days.map((d, i) => {
              const t = d.dinnerAdults + d.dinnerChildren + d.breakfastAdults + d.breakfastChildren + d.lunchAdults + d.lunchChildren
              return <Text key={i} style={{ ...s.cellDay, fontWeight: 700 }}>{num(t)}</Text>
            })}
            {(() => {
              const grand = totals.dinnerAdults + totals.dinnerChildren + totals.breakfastAdults + totals.breakfastChildren + totals.lunchAdults + totals.lunchChildren
              return <Text style={{ ...s.cellDay, fontWeight: 700 }}>{num(grand)}</Text>
            })()}
          </View>
        </View>

        {/* Allergies */}
        {allergies.length > 0 && (
          <View style={s.allergyBox}>
            <Text style={s.allergyTitle}>アレルギー注意（期間中のゲスト）</Text>
            {allergies.map((a, i) => (
              <Text key={i} style={s.allergyItem}>
                {a.name} 様 — {a.allergy}
              </Text>
            ))}
          </View>
        )}
      </Page>
    </Document>
  )
}
