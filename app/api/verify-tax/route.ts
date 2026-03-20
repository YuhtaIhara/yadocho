import { NextResponse } from 'next/server'
import { createServiceClient, getInnIdFromToken } from '@/lib/supabase/server'
import { calcAllTaxes, sumTaxResults } from '@/lib/utils/tax'
import type { TaxRule, TaxRuleRate, TaxResult } from '@/lib/types'

export type VerifyTaxResponse = {
  valid: boolean
  serverTaxResults: TaxResult[]
  clientTaxTotal: number
  serverTaxTotal: number
  discrepancy: number | null
}

type VerifyTaxRequest = {
  reservationId: string
  clientTaxTotal?: number
}

/**
 * POST /api/verify-tax
 *
 * サーバーサイドで税額を再計算し、クライアントの計算結果と比較検証する。
 * 精算前に呼び出して税額改竄を防止する。
 */
export async function POST(req: Request) {
  try {
    // 1. 認証 + テナント分離
    const authResult = await getInnIdFromToken(req.headers.get('authorization'))
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status },
      )
    }
    const { innId } = authResult

    // 2. リクエストボディのパース
    let body: VerifyTaxRequest
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'リクエストボディが不正です' },
        { status: 400 },
      )
    }

    const { reservationId, clientTaxTotal } = body
    if (!reservationId || typeof reservationId !== 'string') {
      return NextResponse.json(
        { error: 'reservationId は必須です' },
        { status: 400 },
      )
    }

    // 3. サーバーサイドで予約データを取得（service_role でRLSバイパス、ただし inn_id 一致を検証）
    const admin = createServiceClient()

    const { data: reservation, error: resError } = await admin
      .from('reservations')
      .select('id, inn_id, checkin, checkout, adults, children, adult_price, child_price, tax_exempt, status')
      .eq('id', reservationId)
      .single()

    if (resError || !reservation) {
      return NextResponse.json(
        { error: '予約が見つかりません' },
        { status: 404 },
      )
    }

    // テナント分離: リクエストユーザーの inn_id と予約の inn_id が一致するか検証
    if (reservation.inn_id !== innId) {
      return NextResponse.json(
        { error: '予約が見つかりません' },
        { status: 404 },
      )
    }

    // 4. 税ルール + 税率を取得
    const { data: taxRules, error: rulesError } = await admin
      .from('tax_rules')
      .select('*')
      .eq('inn_id', innId)
      .order('sort_order')

    if (rulesError) {
      console.error('[verify-tax] tax_rules fetch error:', rulesError)
      return NextResponse.json(
        { error: '税ルールの取得に失敗しました' },
        { status: 500 },
      )
    }

    const ruleIds = (taxRules ?? []).map((r: TaxRule) => r.id)
    let taxRuleRates: TaxRuleRate[] = []

    if (ruleIds.length > 0) {
      const { data: rates, error: ratesError } = await admin
        .from('tax_rule_rates')
        .select('*')
        .in('tax_rule_id', ruleIds)

      if (ratesError) {
        console.error('[verify-tax] tax_rule_rates fetch error:', ratesError)
        return NextResponse.json(
          { error: '税率の取得に失敗しました' },
          { status: 500 },
        )
      }
      taxRuleRates = rates ?? []
    }

    // 5. 泊数計算
    const checkin = new Date(reservation.checkin)
    const checkout = new Date(reservation.checkout)
    const nights = Math.round((checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60 * 24))

    if (nights < 0) {
      return NextResponse.json(
        { error: '予約の日付が不正です' },
        { status: 400 },
      )
    }

    // 6. サーバーサイドで calcAllTaxes を実行
    // NOTE: isSchoolTrip は現状 DB にカラムがないため false 固定。
    //       将来 reservations.is_school_trip カラムが追加されたら参照に変更する。
    const serverTaxResults = calcAllTaxes(
      reservation.adult_price,
      reservation.adults,
      nights,
      reservation.checkin,
      reservation.tax_exempt ?? false,
      false, // isSchoolTrip
      taxRules ?? [],
      taxRuleRates,
    )

    const serverTaxTotal = sumTaxResults(serverTaxResults)

    // 7. クライアント税額との比較
    const clientTotal = typeof clientTaxTotal === 'number' ? clientTaxTotal : 0
    const discrepancy = clientTotal !== serverTaxTotal
      ? serverTaxTotal - clientTotal
      : null

    const response: VerifyTaxResponse = {
      valid: discrepancy === null,
      serverTaxResults,
      clientTaxTotal: clientTotal,
      serverTaxTotal,
      discrepancy,
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('[verify-tax] unexpected error:', err)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 },
    )
  }
}
