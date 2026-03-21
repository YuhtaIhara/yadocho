import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { registerFonts } from './fonts'

registerFonts()

export type MealEntry = {
  roomName: string
  guestName: string
  adults: number
  children: number
  time?: string
  allergy?: string
}

export type MealDailyReportProps = {
  innName: string
  date: string  // "2026年3月21日（金）"
  dinner: MealEntry[]
  breakfast: MealEntry[]
  lunch: MealEntry[]
  kondate: string
  allergies: { name: string; allergy: string }[]
}

const BORDER = '0.5pt solid #333'

const s = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansJP',
    fontSize: 9,
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 28,
  },
  title: {
    fontSize: 16,
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
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 4,
    marginTop: 10,
    paddingBottom: 2,
    borderBottom: '1pt solid #333',
  },
  table: {
    borderTop: BORDER,
    borderLeft: BORDER,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
  },
  row: {
    flexDirection: 'row',
  },
  cellRoom: {
    width: 50,
    borderRight: BORDER,
    borderBottom: BORDER,
    padding: 3,
    fontSize: 8,
    fontWeight: 700,
  },
  cellName: {
    width: 100,
    borderRight: BORDER,
    borderBottom: BORDER,
    padding: 3,
    fontSize: 8,
  },
  cellNum: {
    width: 45,
    borderRight: BORDER,
    borderBottom: BORDER,
    padding: 3,
    fontSize: 8,
    textAlign: 'center',
  },
  cellTime: {
    width: 45,
    borderRight: BORDER,
    borderBottom: BORDER,
    padding: 3,
    fontSize: 8,
    textAlign: 'center',
  },
  cellAllergy: {
    flex: 1,
    borderRight: BORDER,
    borderBottom: BORDER,
    padding: 3,
    fontSize: 8,
    color: '#c00',
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#fafafa',
  },
  kondateBox: {
    marginTop: 10,
    padding: 8,
    border: '0.5pt solid #999',
    borderRadius: 2,
  },
  kondateTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 4,
  },
  kondateText: {
    fontSize: 9,
    lineHeight: 1.5,
  },
  allergyBox: {
    marginTop: 10,
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

function MealTable({ entries, showTime }: { entries: MealEntry[]; showTime?: boolean }) {
  if (entries.length === 0) {
    return <Text style={{ fontSize: 8, color: '#999', marginBottom: 4 }}>なし</Text>
  }

  const totalAdults = entries.reduce((s, e) => s + e.adults, 0)
  const totalChildren = entries.reduce((s, e) => s + e.children, 0)

  return (
    <View style={s.table}>
      {/* Header */}
      <View style={s.headerRow}>
        <Text style={s.cellRoom}>部屋</Text>
        <Text style={s.cellName}>ゲスト名</Text>
        <Text style={s.cellNum}>大人</Text>
        <Text style={s.cellNum}>子供</Text>
        {showTime && <Text style={s.cellTime}>時間</Text>}
        <Text style={s.cellAllergy}>アレルギー</Text>
      </View>
      {/* Data rows */}
      {entries.map((e, i) => (
        <View key={i} style={s.row}>
          <Text style={s.cellRoom}>{e.roomName}</Text>
          <Text style={s.cellName}>{e.guestName}</Text>
          <Text style={s.cellNum}>{e.adults}</Text>
          <Text style={s.cellNum}>{e.children || ''}</Text>
          {showTime && <Text style={s.cellTime}>{e.time || ''}</Text>}
          <Text style={s.cellAllergy}>{e.allergy || ''}</Text>
        </View>
      ))}
      {/* Total row */}
      <View style={s.totalRow}>
        <Text style={s.cellRoom}></Text>
        <Text style={{ ...s.cellName, fontWeight: 700 }}>合計</Text>
        <Text style={{ ...s.cellNum, fontWeight: 700 }}>{totalAdults}</Text>
        <Text style={{ ...s.cellNum, fontWeight: 700 }}>{totalChildren || ''}</Text>
        {showTime && <Text style={s.cellTime}></Text>}
        <Text style={s.cellAllergy}></Text>
      </View>
    </View>
  )
}

export default function MealDailyReport({
  innName,
  date,
  dinner,
  breakfast,
  lunch,
  kondate,
  allergies,
}: MealDailyReportProps) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>料理帳票</Text>
        <Text style={s.subtitle}>{innName}　{date}</Text>

        {/* Dinner */}
        <Text style={s.sectionTitle}>夕食（{dinner.reduce((s, e) => s + e.adults + e.children, 0)}名）</Text>
        <MealTable entries={dinner} showTime />

        {/* Breakfast */}
        <Text style={s.sectionTitle}>朝食（{breakfast.reduce((s, e) => s + e.adults + e.children, 0)}名）</Text>
        <MealTable entries={breakfast} />

        {/* Lunch */}
        {lunch.length > 0 && (
          <>
            <Text style={s.sectionTitle}>昼食（{lunch.reduce((s, e) => s + e.adults + e.children, 0)}名）</Text>
            <MealTable entries={lunch} />
          </>
        )}

        {/* Kondate */}
        {kondate && (
          <View style={s.kondateBox}>
            <Text style={s.kondateTitle}>献立</Text>
            <Text style={s.kondateText}>{kondate}</Text>
          </View>
        )}

        {/* Allergies */}
        {allergies.length > 0 && (
          <View style={s.allergyBox}>
            <Text style={s.allergyTitle}>アレルギー注意</Text>
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
