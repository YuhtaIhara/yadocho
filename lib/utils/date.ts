import { format, eachDayOfInterval, parseISO, differenceInCalendarDays } from 'date-fns'
import { ja } from 'date-fns/locale'

export function formatDateJP(dateStr: string): string {
  return format(parseISO(dateStr), 'M月d日（E）', { locale: ja })
}

export function formatDateFull(dateStr: string): string {
  return format(parseISO(dateStr), 'yyyy年M月d日', { locale: ja })
}

export function toDateStr(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function nightCount(checkin: string, checkout: string): number {
  return differenceInCalendarDays(parseISO(checkout), parseISO(checkin))
}

export function getDatesInRange(checkin: string, checkout: string): string[] {
  return eachDayOfInterval({
    start: parseISO(checkin),
    end: parseISO(checkout),
  }).map(d => toDateStr(d))
}

export function getTimeSlots(startHour = 5, endHour = 23): string[] {
  const slots: string[] = []
  for (let h = startHour; h <= endHour; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    if (h < endHour) slots.push(`${String(h).padStart(2, '0')}:30`)
  }
  return slots
}
