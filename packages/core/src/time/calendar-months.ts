/** Calendar-month arithmetic used by purchased access; never mutates the input. */
export function addUtcCalendarMonths(grantedAt: Date, intervalMonths: number): Date {
  const totalMonths = grantedAt.getUTCFullYear() * 12 + grantedAt.getUTCMonth() + intervalMonths
  const targetMonth = totalMonths % 12
  const targetYear = (totalMonths - targetMonth) / 12
  const targetMonthDays = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  const targetDay = Math.min(grantedAt.getUTCDate(), targetMonthDays)
  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      targetDay,
      grantedAt.getUTCHours(),
      grantedAt.getUTCMinutes(),
      grantedAt.getUTCSeconds(),
      grantedAt.getUTCMilliseconds(),
    ),
  )
}
