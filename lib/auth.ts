'use client'

import { supabase } from './supabase'

let _cachedInnId: string | null | undefined = undefined

export function clearInnIdCache() {
  _cachedInnId = undefined
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { session: data.session, error }
}

export async function signOut() {
  clearInnIdCache()
  await supabase.auth.signOut()
}

export async function getInnId(): Promise<string | null> {
  if (_cachedInnId !== undefined) return _cachedInnId
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { _cachedInnId = null; return null }
  const { data } = await supabase.from('user_profiles').select('inn_id').eq('id', user.id).single()
  const innId = data?.inn_id ?? null
  _cachedInnId = innId
  return innId
}
