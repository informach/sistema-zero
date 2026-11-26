import { describe, expect, test } from 'bun:test'
import { advertisedDaysFor } from '../../src/domain/entitlement/entitlement-snapshot'

const fixed15 = { mode: 'fixed', durationValue: 15, durationUnit: 'days' } as const

describe('prazo divulgado na concessão', () => {
  test('grava o fim divulgado a partir do fim real desta concessão', () => {
    const expiresAt = new Date('2026-12-16T12:00:00.000Z')
    expect(advertisedDaysFor(7, fixed15, expiresAt)).toEqual({
      advertisedAccessDays: 7,
      advertisedEndsAt: '2026-12-08T12:00:00.000Z',
    })
  })

  test('sem fim real, só os dias; prazo em meses ou divulgado não menor que o real: nada', () => {
    expect(advertisedDaysFor(7, fixed15)).toEqual({ advertisedAccessDays: 7 })
    expect(
      advertisedDaysFor(
        7,
        { mode: 'fixed', durationValue: 12, durationUnit: 'months' },
        new Date(),
      ),
    ).toEqual({})
    expect(advertisedDaysFor(15, fixed15, new Date())).toEqual({})
    expect(advertisedDaysFor(undefined, fixed15, new Date())).toEqual({})
  })
})
