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

export type RoomType = 'japanese' | 'western' | 'mixed' | 'other'

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  japanese: '和室',
  western: '洋室',
  mixed: '和洋室',
  other: 'その他',
}

export type Room = {
  id: string
  inn_id: string
  name: string
  room_type: RoomType
  capacity: number
  sort_order: number
  created_at: string
}

export type Guest = {
  id: string
  inn_id: string
  name: string
  furigana: string | null
  phone: string | null
  email: string | null
  address: string | null
  company: string | null
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
  pricing_plan_id: string | null
  dinner_price: number
  child_dinner_price: number
  breakfast_price: number
  child_breakfast_price: number
  lunch_price: number
  child_lunch_price: number
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

export type PricingPlan = {
  id: string
  inn_id: string
  name: string
  adult_price: number
  child_price: number
  dinner_price: number
  child_dinner_price: number
  breakfast_price: number
  child_breakfast_price: number
  lunch_price: number
  child_lunch_price: number
  is_default: boolean
  sort_order: number
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

/** @deprecated Use TaxRule + TaxRuleRate instead */
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

// ── New tax system types ──

export type CalcMethod = 'flat' | 'tiered' | 'percentage' | 'inclusive_percentage'

export type TaxRule = {
  id: string
  inn_id: string
  tax_name: string
  tax_type: 'prefecture' | 'municipal'
  calc_method: CalcMethod
  effective_from: string
  effective_to: string | null
  threshold: number
  exempt_school_trips: boolean
  rounding_unit: number          // 端数処理の丸め単位（1=1円未満切捨, 100=100円未満切捨）
  inclusive_pref_tax_rule_id: string | null  // 県税込みpercentage方式: 県税ルールのIDを指定
  notes: string | null
  sort_order: number
  created_at: string
}

export type TaxRuleRate = {
  id: string
  tax_rule_id: string
  bracket_min: number
  bracket_max: number | null
  rate_percent: number | null
  flat_amount: number | null
}

export type TaxResult = {
  taxRuleId: string
  taxName: string
  taxType: 'prefecture' | 'municipal'
  taxable: boolean
  taxAmount: number
  displayRate: string
  exemptReason: string | null
}
