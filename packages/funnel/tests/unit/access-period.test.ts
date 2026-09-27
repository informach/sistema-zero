import { describe, expect, test } from 'bun:test'
import {
  computeFixedAccessExpiry,
  fixedAccessLabel,
  formatSaoPauloDateTime,
} from '../../src/lib/access-period'

describe('apresentação do prazo fixo', () => {
  test('30 dias são 30 blocos exatos de 24 horas, iguais ao members', () => {
    const paidAt = new Date('2026-09-16T15:30:00.000Z')
    const expiresAt = computeFixedAccessExpiry(paidAt, {
      accessMode: 'fixed',
      accessDurationValue: 30,
      accessDurationUnit: 'days',
    })
    expect(expiresAt.toISOString()).toBe('2026-10-16T15:30:00.000Z')
    expect(
      fixedAccessLabel({
        accessMode: 'fixed',
        accessDurationValue: 30,
        accessDurationUnit: 'days',
      }),
    ).toBe('30 dias')
    expect(formatSaoPauloDateTime(expiresAt)).toContain('16/10/2026')
  })
})
