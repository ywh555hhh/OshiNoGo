/**
 * 墙钟边界。
 *
 * kernel 不允许读时钟（purity.test.ts 守着），所以真实时间只能在 app 层取。
 * 这也是唯一允许「在渲染期读时间」的地方——用惰性初始化调用一次，
 * 而不是放进 useMemo（那会在重渲染时重跑，得到一个会飘的值）。
 */

export function wallClockNow(): number {
  return Date.now()
}

/**
 * 本地日历日。
 *
 * 「练了几天 / 连续天数」必须按本地时区算，否则跨零点的时间会被算错。
 * 时区问题留在 app 层，kernel 只接收这个函数作为参数。
 */
export function localDayKey(timestamp: number): string {
  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}
