import { Temporal } from '@js-temporal/polyfill'
import { type ScheduleSpec, scheduleSpecSchema } from '@sistemazero/agent-core'

export function validateSchedule(raw: unknown): ScheduleSpec {
  const spec = scheduleSpecSchema.parse(raw)
  if (/^[+-]/.test(spec.timezone))
    throw new Error('Schedule requires an IANA time zone, not a fixed offset')
  Temporal.Instant.fromEpochMilliseconds(0).toZonedDateTimeISO(spec.timezone)
  return spec
}
export interface Occurrence {
  key: string
  at: number
  local: string
  timezone: string
}
function onDate(spec: ScheduleSpec, date: Temporal.PlainDate): Occurrence | undefined {
  if (!spec.weekdays.includes(date.dayOfWeek)) return
  const [hourText, minuteText] = spec.time.split(':')
  const hour = Number(hourText),
    minute = Number(minuteText)
  const zoned = Temporal.ZonedDateTime.from(
    { year: date.year, month: date.month, day: date.day, hour, minute, timeZone: spec.timezone },
    { disambiguation: spec.repeatedTime },
  )
  // A nonexistent wall-clock time is skipped, never silently shifted to another time.
  if (zoned.hour !== hour || zoned.minute !== minute || !zoned.toPlainDate().equals(date)) return
  const local = `${date.toString()}T${spec.time}`
  return {
    key: `${local}@${spec.timezone}`,
    local,
    timezone: spec.timezone,
    at: zoned.epochMilliseconds,
  }
}
export function dueOccurrences(raw: ScheduleSpec, after: number, until: number) {
  const spec = validateSchedule(raw)
  if (!Number.isSafeInteger(after) || !Number.isSafeInteger(until))
    throw new Error('Schedule timestamps must be integer milliseconds')
  if (until <= after) return { occurrences: [], omitted: 0, truncated: false }
  const start = Math.max(after, until - 31 * 86400000)
  let date = Temporal.Instant.fromEpochMilliseconds(start)
    .toZonedDateTimeISO(spec.timezone)
    .toPlainDate()
    .subtract({ days: 1 })
  const last = Temporal.Instant.fromEpochMilliseconds(until)
    .toZonedDateTimeISO(spec.timezone)
    .toPlainDate()
    .add({ days: 1 })
  const due: Occurrence[] = []
  for (
    let count = 0;
    Temporal.PlainDate.compare(date, last) <= 0 && count < 35;
    count++, date = date.add({ days: 1 })
  ) {
    const occurrence = onDate(spec, date)
    if (occurrence && occurrence.at > start && occurrence.at <= until) due.push(occurrence)
  }
  const selected =
    spec.missed === 'skip'
      ? due.filter((occurrence) => until - occurrence.at < 60000)
      : spec.missed === 'coalesce'
        ? due.slice(-1)
        : due.slice(-spec.maxCatchUp)
  return {
    occurrences: selected,
    omitted: due.length - selected.length,
    truncated: start !== after,
  }
}
export function nextOccurrence(raw: ScheduleSpec, after: number): Occurrence {
  const spec = validateSchedule(raw)
  let date = Temporal.Instant.fromEpochMilliseconds(after)
    .toZonedDateTimeISO(spec.timezone)
    .toPlainDate()
  for (let count = 0; count < 15; count++, date = date.add({ days: 1 })) {
    const occurrence = onDate(spec, date)
    if (occurrence && occurrence.at > after) return occurrence
  }
  throw new Error('No occurrence within the next 15 days')
}
