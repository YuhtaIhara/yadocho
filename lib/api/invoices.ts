import { supabase } from '@/lib/supabase'
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
  await supabase.from('invoice_items').delete().eq('reservation_id', reservationId).eq('locked', false)

  if (items.length === 0) return []

  const { data, error } = await supabase
    .from('invoice_items')
    .insert(items.map(item => ({ ...item, reservation_id: reservationId })))
    .select()

  if (error) throw error
  return data ?? []
}

export async function lockInvoice(reservationId: string): Promise<void> {
  const { error } = await supabase
    .from('invoice_items')
    .update({ locked: true })
    .eq('reservation_id', reservationId)

  if (error) throw error
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
