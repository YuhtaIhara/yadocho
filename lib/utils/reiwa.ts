/**
 * 西暦→令和変換ユーティリティ
 * 令和元年 = 2019年
 */
export function toReiwa(year: number): number {
  return year - 2018
}

export function toReiwaLabel(year: number, month: number): string {
  const r = toReiwa(year)
  return `令和${r}年${month}月`
}

export function toReiwaDateLabel(year: number, month: number, day: number): string {
  const r = toReiwa(year)
  return `令和${r}年${month}月${day}日`
}
