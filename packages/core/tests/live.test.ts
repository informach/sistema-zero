import { describe, expect, test } from 'bun:test'
import { addCalendarDays, lessonAccess, supervisionStatus } from '../src/live'

describe('live lesson grants', () => {
  const start = '2026-11-07T17:00:00.000Z'
  const end = '2026-12-07T17:00:00.000Z'
  test('includes release and excludes expiration', () => {
    expect(lessonAccess(start, end, new Date(start))).toBe('available')
    expect(lessonAccess(start, end, new Date(end))).toBe('expired')
    expect(lessonAccess(start, end, new Date('2026-11-07T16:59:59Z'))).toBe('scheduled')
    expect(lessonAccess(start, end, new Date(start), true)).toBe('revoked')
  })
  test('counts calendar days in the cohort timezone', () => {
    expect(addCalendarDays(start, 30, 'America/Sao_Paulo')).toBe(end)
    expect(addCalendarDays('2026-10-31T18:00:00Z', 2, 'America/New_York')).toBe(
      '2026-11-02T19:00:00.000Z',
    )
    expect(() => addCalendarDays(start, 30, 'Invalid/Zone')).toThrow()
  })
  test('a remaining co-teacher preserves supervision', () => {
    const now = new Date('2026-11-07T18:00:00Z')
    expect(supervisionStatus({}, now)).toBe('unavailable')
    expect(supervisionStatus({ a: '2026-11-07T17:59:40Z' }, now)).toBe('reconnecting')
    expect(supervisionStatus({ a: '2026-11-07T17:59:00Z', b: now.toISOString() }, now)).toBe(
      'present',
    )
  })
})
