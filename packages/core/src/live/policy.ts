import type {
  LiveAccessStatus,
  LiveOccurrence,
  LiveParticipation,
  LiveSpeakingMode,
  LiveSupervisionStatus,
} from './contracts'

export function lessonAccess(
  startsAt: string,
  endsAt: string,
  now: Date,
  revoked = false,
): LiveAccessStatus {
  if (revoked) return 'revoked'
  const start = Date.parse(startsAt)
  const end = Date.parse(endsAt)
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start >= end ||
    !Number.isFinite(now.getTime())
  )
    throw new RangeError('Invalid access interval')
  if (now.getTime() < start) return 'scheduled'
  return now.getTime() < end ? 'available' : 'expired'
}

/** Civil-day arithmetic, retaining the local clock across DST transitions. */
export function addCalendarDays(instant: string, days: number, timeZone: string): string {
  if (!Number.isInteger(days) || days < 1 || days > 366) throw new RangeError('Invalid access days')
  const date = new Date(instant)
  if (!Number.isFinite(date.getTime())) throw new RangeError('Invalid instant')
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const civil = (value: Date): number => {
    const parts = formatter.formatToParts(value)
    const n = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((p) => p.type === type)?.value)
    return Date.UTC(
      n('year'),
      n('month') - 1,
      n('day'),
      n('hour'),
      n('minute'),
      n('second'),
      date.getUTCMilliseconds(),
    )
  }
  const target = civil(date) + days * 86_400_000
  let candidate = date.getTime() + days * 86_400_000
  for (let i = 0; i < 4; i++) {
    const delta = target - civil(new Date(candidate))
    if (delta === 0) return new Date(candidate).toISOString()
    candidate += delta
  }
  // A nonexistent local clock must be rescheduled explicitly, never silently shifted.
  throw new RangeError('The resulting local time does not exist in this timezone')
}

export function supervisionStatus(
  teachers: Record<string, string>,
  now: Date,
): LiveSupervisionStatus {
  const age = Math.min(...Object.values(teachers).map((at) => now.getTime() - Date.parse(at)))
  if (age >= 0 && age <= 15_000) return 'present'
  if (age >= 0 && age <= 30_000) return 'reconnecting'
  return 'unavailable'
}

export function canPublishMicrophone(
  mode: LiveSpeakingMode,
  participant: LiveParticipation,
  supervised: boolean,
): boolean {
  return (
    supervised &&
    participant.admission === 'admitted' &&
    !participant.microphoneLocked &&
    (mode === 'open' || (mode === 'turns' && participant.turnGranted))
  )
}

export function occurrenceIsOpen(occurrence: LiveOccurrence, now: Date): boolean {
  return (
    occurrence.state === 'live' &&
    now.getTime() >= Date.parse(occurrence.startsAt) &&
    now.getTime() < Date.parse(occurrence.hardEndsAt)
  )
}
