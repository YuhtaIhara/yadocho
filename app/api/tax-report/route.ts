import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { createServiceClient, getInnIdFromToken } from '@/lib/supabase/server'
import { buildMonthlyTaxData, type MonthlyTaxSummary } from '@/lib/utils/tax-report'
import { VillageMonthlyReport } from '@/lib/pdf/VillageMonthlyReport'
import { VillageDeclarationForm } from '@/lib/pdf/VillageDeclarationForm'
import { PrefMonthlyReport } from '@/lib/pdf/PrefMonthlyReport'
import { PrefDeclarationForm } from '@/lib/pdf/PrefDeclarationForm'
import type { Reservation } from '@/lib/types'

/**
 * GET /api/tax-report?type=village-monthly&year=2026&month=6
 *
 * 税申告書PDFを生成して返却する。
 * type: village-monthly (村月計表), village-form (村申告書), pref-monthly (県月計表), pref-form (県申告書)
 */
export async function GET(req: Request) {
  try {
    const authResult = await getInnIdFromToken(req.headers.get('authorization'))
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }
    const { innId } = authResult

    const url = new URL(req.url)
    const type = url.searchParams.get('type')
    const year = parseInt(url.searchParams.get('year') ?? '')
    const month = parseInt(url.searchParams.get('month') ?? '')

    if (!type || !year || !month || month < 1 || month > 12) {
      return NextResponse.json({ error: 'type, year, month are required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Fetch inn info
    const { data: inn } = await supabase
      .from('inns')
      .select('name, representative, address, phone')
      .eq('id', innId)
      .single()

    if (!inn) {
      return NextResponse.json({ error: 'Inn not found' }, { status: 404 })
    }

    // Fetch reservations for the month (checkin in this month)
    const from = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const to = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

    const { data: reservations = [] } = await supabase
      .from('reservations')
      .select('*')
      .eq('inn_id', innId)
      .gte('checkin', from)
      .lte('checkin', to)
      .neq('status', 'cancelled')

    switch (type) {
      case 'village-monthly': {
        // 野沢温泉村の税率: 3.5%（経過措置）, 免税点: 6000円
        const data = buildMonthlyTaxData(
          reservations as Reservation[],
          year, month, 6000, 3.5,
        )

        const element = React.createElement(VillageMonthlyReport, {
          data,
          innName: inn.name ?? '',
          representative: inn.representative ?? '',
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfBuffer = await renderToBuffer(element as any)

        return new Response(Buffer.from(pdfBuffer), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="village-monthly-${year}-${month}.pdf"`,
          },
        })
      }

      case 'village-form': {
        // 村申告書は3ヶ月分（四半期）を1枚に収める
        // month パラメータは四半期の最初の月（6, 9, 12, 3）
        const monthsData: MonthlyTaxSummary[] = []
        for (let m = 0; m < 3; m++) {
          const targetMonth = ((month - 1 + m) % 12) + 1
          const targetYear = month + m > 12 ? year + 1 : year
          const mFrom = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`
          const mLastDay = new Date(targetYear, targetMonth, 0).getDate()
          const mTo = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${mLastDay}`

          const { data: mReservations = [] } = await supabase
            .from('reservations')
            .select('*')
            .eq('inn_id', innId)
            .gte('checkin', mFrom)
            .lte('checkin', mTo)
            .neq('status', 'cancelled')

          monthsData.push(
            buildMonthlyTaxData(mReservations as Reservation[], targetYear, targetMonth, 6000, 3.5),
          )
        }

        const today = new Date()
        const filingDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

        const formElement = React.createElement(VillageDeclarationForm, {
          months: monthsData,
          innName: inn.name ?? '',
          innAddress: inn.address ?? '',
          representative: inn.representative ?? '',
          phone: inn.phone ?? '',
          filingDate,
          taxRatePercent: 3.5,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formBuffer = await renderToBuffer(formElement as any)

        return new Response(Buffer.from(formBuffer), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="village-form-${year}-${month}.pdf"`,
          },
        })
      }

      case 'pref-monthly': {
        const prefData = buildMonthlyTaxData(
          reservations as Reservation[],
          year, month, 6000, 3.5,
        )

        const prefMonthlyEl = React.createElement(PrefMonthlyReport, {
          data: prefData,
          innName: inn.name ?? '',
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prefMonthlyBuf = await renderToBuffer(prefMonthlyEl as any)

        return new Response(Buffer.from(prefMonthlyBuf), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="pref-monthly-${year}-${month}.pdf"`,
          },
        })
      }

      case 'pref-form': {
        const prefMonthsData: MonthlyTaxSummary[] = []
        for (let m = 0; m < 3; m++) {
          const targetMonth = ((month - 1 + m) % 12) + 1
          const targetYear = month + m > 12 ? year + 1 : year
          const mFrom = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`
          const mLastDay = new Date(targetYear, targetMonth, 0).getDate()
          const mTo = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${mLastDay}`

          const { data: mRes = [] } = await supabase
            .from('reservations')
            .select('*')
            .eq('inn_id', innId)
            .gte('checkin', mFrom)
            .lte('checkin', mTo)
            .neq('status', 'cancelled')

          prefMonthsData.push(
            buildMonthlyTaxData(mRes as Reservation[], targetYear, targetMonth, 6000, 3.5),
          )
        }

        const prefToday = new Date()
        const prefFilingDate = `${prefToday.getFullYear()}-${String(prefToday.getMonth() + 1).padStart(2, '0')}-${String(prefToday.getDate()).padStart(2, '0')}`

        const prefFormEl = React.createElement(PrefDeclarationForm, {
          months: prefMonthsData,
          innName: inn.name ?? '',
          innAddress: inn.address ?? '',
          representative: inn.representative ?? '',
          phone: inn.phone ?? '',
          filingDate: prefFilingDate,
          prefFlatAmount: 100,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prefFormBuf = await renderToBuffer(prefFormEl as any)

        return new Response(Buffer.from(prefFormBuf), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="pref-form-${year}-${month}.pdf"`,
          },
        })
      }

      default:
        return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 })
    }
  } catch (err) {
    console.error('tax-report error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
