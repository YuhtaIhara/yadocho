import { supabase } from '@/lib/supabase'
import { getInnId } from '@/lib/auth'
import type { InvoiceItem, InvoicePreset } from '@/lib/types'

export async function fetchInvoiceItems(reservationId: string): Promise<InvoiceItem[]> {
  const { data, error } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('reservation_id', reservationId)
    .order('sort_order')

  if (error) throw error
  return data ?? []
}

export async function upsertInvoiceItems(
  reservationId: string,
  items: Omit<InvoiceItem, 'id' | 'created_at'>[],
): Promise<InvoiceItem[]> {
  // Prevent modification if invoice is already locked
  const { data: lockedItems } = await supabase
    .from('invoice_items')
    .select('id')
    .eq('reservation_id', reservationId)
    .eq('locked', true)
    .limit(1)
  if (lockedItems && lockedItems.length > 0) {
    throw new Error('精算済みの請求書は変更できません')
  }
  await supabase.from('invoice_items').delete().eq('reservation_id', reservationId).eq('locked', false)

  if (items.length === 0) return []

  const { data, error } = await supabase
    .from('invoice_items')
    .insert(items.map(item => ({ ...item, reservation_id: reservationId })))
    .select()

  if (error) throw error
  return data ?? []
}

export async function unlockInvoice(reservationId: string): Promise<void> {
  const { error } = await supabase
    .from('invoice_items')
    .delete()
    .eq('reservation_id', reservationId)

  if (error) throw error
}

export async function lockInvoice(reservationId: string): Promise<void> {
  const { error } = await supabase
    .from('invoice_items')
    .update({ locked: true })
    .eq('reservation_id', reservationId)

  if (error) throw error
}

export async function fetchSettledReservationIds(reservationIds: string[]): Promise<Set<string>> {
  if (reservationIds.length === 0) return new Set()
  const { data, error } = await supabase
    .from('invoice_items')
    .select('reservation_id')
    .in('reservation_id', reservationIds)
    .eq('locked', true)
  if (error) throw error
  return new Set((data ?? []).map(d => d.reservation_id))
}

export async function fetchPresets(innId: string): Promise<InvoicePreset[]> {
  const { data, error } = await supabase
    .from('invoice_presets')
    .select('*')
    .eq('inn_id', innId)
    .order('sort_order')

  if (error) throw error
  return data ?? []
}

export async function createPreset(input: { name: string; price: number }): Promise<InvoicePreset> {
  const innId = await getInnId()
  if (!innId) throw new Error('ログインが必要です')
  const { data, error } = await supabase
    .from('invoice_presets')
    .insert({ ...input, inn_id: innId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePreset(id: string, updates: { name?: string; price?: number }): Promise<void> {
  const { error } = await supabase.from('invoice_presets').update(updates).eq('id', id)
  if (error) throw error
}

export async function deletePreset(id: string): Promise<void> {
  const { error } = await supabase.from('invoice_presets').delete().eq('id', id)
  if (error) throw error
}
