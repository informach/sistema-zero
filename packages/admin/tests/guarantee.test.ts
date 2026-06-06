import { describe, expect, test } from 'bun:test'
import { computeGuarantee } from '../src/lib/guarantee'

const DAY_MS = 24 * 60 * 60 * 1000
const now = new Date('2026-06-05T12:00:00Z')

describe('computeGuarantee', () => {
  test('sem paidAt, sem dias ou dias ≤ 0 → null', () => {
    expect(computeGuarantee(null, 7, now)).toBeNull()
    expect(computeGuarantee('2026-06-01T00:00:00Z', null, now)).toBeNull()
    expect(computeGuarantee('2026-06-01T00:00:00Z', undefined, now)).toBeNull()
    expect(computeGuarantee('2026-06-01T00:00:00Z', 0, now)).toBeNull()
    expect(computeGuarantee('não-é-data', 7, now)).toBeNull()
  })

  test('dentro da garantia: until correto, daysLeft arredondado p/ cima, expired=false', () => {
    const paidAt = new Date(now.getTime() - 1 * DAY_MS).toISOString()
    const g = computeGuarantee(paidAt, 7, now)
    expect(g).not.toBeNull()
    expect(g?.expired).toBe(false)
    expect(g?.daysLeft).toBe(6)
    expect(g?.guaranteeDays).toBe(7)
    expect(g?.until).toBe(new Date(now.getTime() + 6 * DAY_MS).toISOString())
  })

  test('fora da garantia: expired=true e daysLeft nunca negativo', () => {
    const paidAt = new Date(now.getTime() - 10 * DAY_MS).toISOString()
    const g = computeGuarantee(paidAt, 7, now)
    expect(g?.expired).toBe(true)
    expect(g?.daysLeft).toBe(0)
  })

  test('exatamente no limite (msLeft=0) ainda não expirou', () => {
    const paidAt = new Date(now.getTime() - 7 * DAY_MS).toISOString()
    const g = computeGuarantee(paidAt, 7, now)
    expect(g?.expired).toBe(false)
    expect(g?.daysLeft).toBe(0)
  })
})
