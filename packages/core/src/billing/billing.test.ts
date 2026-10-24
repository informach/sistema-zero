import { expect, test } from 'bun:test'
import { addUtcCalendarMonths } from '../time/calendar-months'
import { readBillingPeriod, readSubscriptionCycleAccess } from './index'

test('período confirmado é estrito, independente de paidAt e sem compartilhar referência mutável', () => {
  const input = { startsAt: '2026-09-16T12:00:00.000Z', endsAt: '2026-10-16T12:00:00.000Z' }
  const proof = readSubscriptionCycleAccess({ version: 1, kind: 'VERIFIED_PERIOD', period: input })
  input.endsAt = '2099-01-01T00:00:00.000Z'
  expect(proof).toMatchObject({ period: { endsAt: '2026-10-16T12:00:00.000Z' } })
  expect(readSubscriptionCycleAccess(null)).toBeNull()
  expect(
    readSubscriptionCycleAccess({
      version: 1,
      kind: 'REVIEW_REQUIRED',
      reason: 'PERIOD_UNAVAILABLE',
    })?.kind,
  ).toBe('REVIEW_REQUIRED')
})

test.each([
  { startsAt: '2026-09-16', endsAt: '2026-10-16T00:00:00.000Z' },
  { startsAt: '2026-09-16T00:00:00.000Z', endsAt: '2026-09-15T00:00:00.000Z' },
  { startsAt: '2026-09-16T00:00:00.000Z', endsAt: '2099-09-16T00:00:00.000Z' },
  { startsAt: '2026-09-16T00:00:00.000Z', endsAt: '2026-10-16T00:00:00.000Z', paidAt: 'forged' },
])('recusa datas ou campos que não representam um período conhecido', (input) => {
  expect(() => readBillingPeriod(input)).toThrow()
})

test('aritmética canônica conserva regras existentes de mês-calendário e ano bissexto', () => {
  const original = new Date('2024-01-31T12:30:01.123Z')
  expect(addUtcCalendarMonths(original, 1).toISOString()).toBe('2024-02-29T12:30:01.123Z')
  expect(addUtcCalendarMonths(new Date('2025-01-31T12:30:01.123Z'), 1).toISOString()).toBe(
    '2025-02-28T12:30:01.123Z',
  )
  expect(original.toISOString()).toBe('2024-01-31T12:30:01.123Z')
})
