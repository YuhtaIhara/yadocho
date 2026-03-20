// ── Entity types (matching DB schema) ──

export type Inn = {
  id: string
  name: string
  address: string | null
  phone: string | null
  representative: string | null
  created_at: string
  updated_at: string
}

export type Room = {
  id: string
  inn_id: string
  name: string
  capacity: number
  sort_order: number
  created_at: string
}

export type Guest = {
  id: string
  inn_id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  allergy: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type ReservationStatus = 'scheduled' | 'settled' | 'cancelled'

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  scheduled: '予約済み',
  settled: '済',
  cancelled: 'キャンセル',
}

export type Reservation = {
  id: string
  inn_id: string
  guest_id: string
  checkin: string
  checkout: string
  adults: number
  children: number
  adult_price: number
  child_price: number
  checkin_time: string | null
  status: ReservationStatus
  tax_exempt: boolean
  tax_exempt_reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // joined via reservation_rooms
  rooms?: Room[]
  guest?: Guest
}

/** Helper: first room name for display */
export function roomLabel(res: Reservation): string {
  if (!res.rooms || res.rooms.length === 0) return '—'
  if (res.rooms.length === 1) return res.rooms[0].name
  return res.rooms.map(r => r.name).join(', ')
}

export type MealDay = {
  id: string
  reservation_id: string
  date: string
  dinner_adults: number
  dinner_children: number
  dinner_time: string | null
  breakfast_adults: number
  breakfast_children: number
  breakfast_time: string | null
  lunch_adults: number
  lunch_children: number
  lunch_time: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type InvoiceItem = {
  id: string
  reservation_id: string
  category: 'stay' | 'meal' | 'tax' | 'extra'
  name: string
  unit_price: number
  quantity: number
  sort_order: number
  locked: boolean
  created_at: string
}

export type InvoicePreset = {
  id: string
  inn_id: string
  name: string
  price: number
  sort_order: number
  created_at: string
}

export type BlockedDate = {
  id: string
  inn_id: string
  date: string
  room_id: string | null
  reason: string | null
  created_at: string
}

export type PricingConfig = {
  inn_id: string
  adult_price: number
  child_price: number
  breakfast_price: number
  lunch_price: number
  dinner_price: number
  child_breakfast_price: number
  child_lunch_price: number
  child_dinner_price: number
  updated_at: string
}

export type Kondate = {
  id: string
  inn_id: string
  date: string
  content: string
  updated_at: string
}

export type TaxPeriod = {
  id: string
  inn_id: string
  rate_percent: number
  threshold: number
  effective_from: string
  effective_to: string | null
  notes: string | null
  created_at: string
}
