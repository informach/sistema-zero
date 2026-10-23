export function budgetDay(now: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}
/** Elapsed-hour cadence; timezone controls the daily allowance and display.
 * Missed cycles coalesce instead of replaying a backlog after an outage. */
export function nextCollection(now: Date, intervalHours: number) {
  return new Date(now.getTime() + intervalHours * 3_600_000)
}
export function nextBudgetDay(now: Date, timeZone: string) {
  const today = budgetDay(now, timeZone)
  let low = now.getTime(),
    high = low + 48 * 3_600_000
  while (high - low > 1000) {
    const mid = Math.floor((low + high) / 2)
    if (budgetDay(new Date(mid), timeZone) === today) low = mid
    else high = mid
  }
  return new Date(high)
}
