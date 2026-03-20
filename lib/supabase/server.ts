import { createClient } from '@supabase/supabase-js'

/**
 * サーバーサイド専用の Supabase クライアント（service_role_key 使用）
 * API Routes からのみ使用すること。クライアントサイドでは絶対に import しない
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL')
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Authorization ヘッダーの JWT からユーザーの inn_id を取得
 * RLS と同等のテナント分離をサーバーサイドで担保
 */
export async function getInnIdFromToken(
  authHeader: string | null,
): Promise<{ innId: string; userId: string } | { error: string; status: number }> {
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: '認証トークンがありません', status: 401 }
  }

  const token = authHeader.slice(7)

  // anon key でユーザー認証用クライアントを作成
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return { error: 'サーバー設定エラー', status: 500 }
  }

  const authClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: { user }, error: authError } = await authClient.auth.getUser(token)
  if (authError || !user) {
    return { error: '認証に失敗しました', status: 401 }
  }

  // service_role で inn_id を取得（RLS バイパス）
  const admin = createServiceClient()
  const { data: profile, error: profileError } = await admin
    .from('user_profiles')
    .select('inn_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.inn_id) {
    return { error: 'ユーザープロフィールが見つかりません', status: 403 }
  }

  return { innId: profile.inn_id, userId: user.id }
}
