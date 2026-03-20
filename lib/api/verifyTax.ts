import { supabase } from '@/lib/supabase'
import type { VerifyTaxResponse } from '@/app/api/verify-tax/route'

export type { VerifyTaxResponse }

/**
 * サーバーサイド税額検証 API を呼び出す。
 * 精算前にクライアント側の税額がサーバー計算と一致するか検証する。
 */
export async function verifyTax(
  reservationId: string,
  clientTaxTotal: number,
): Promise<VerifyTaxResponse> {
  // Supabase Auth のセッショントークンを取得
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('ログインが必要です')
  }

  const res = await fetch('/api/verify-tax', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ reservationId, clientTaxTotal }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `税額検証に失敗しました (${res.status})`)
  }

  return res.json()
}
