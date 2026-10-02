import { expect, test } from 'bun:test'
import { campaignIsoDate, campaignLocalDate } from '../src/lib/campaign-dates'

test('datas do operador usam Brasília, incluindo virada de dia', () => {
  expect(campaignLocalDate('2026-10-03T01:30:00Z')).toBe('2026-10-02T22:30')
  expect(campaignIsoDate('2026-10-02T22:30')).toBe('2026-10-03T01:30:00.000Z')
  expect(() => campaignIsoDate('2026-02-30T10:00')).toThrow()
  expect(() => campaignIsoDate('2026-10-02')).toThrow()
})
