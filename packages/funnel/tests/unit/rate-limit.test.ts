import { beforeEach, describe, expect, test } from 'bun:test'
import { rateLimit, resetRateLimit } from '../../src/lib/rate-limit'

describe('rateLimit (janela fixa)', () => {
  beforeEach(() => resetRateLimit())

  test('permite até o limite e bloqueia o excedente', () => {
    const t = 1_000_000
    for (let i = 0; i < 3; i++) {
      expect(rateLimit('ip', 3, 60_000, t).allowed).toBe(true)
    }
    const blocked = rateLimit('ip', 3, 60_000, t)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })

  test('reseta após a janela', () => {
    const t = 1_000_000
    rateLimit('ip', 1, 60_000, t)
    expect(rateLimit('ip', 1, 60_000, t).allowed).toBe(false)
    expect(rateLimit('ip', 1, 60_000, t + 60_000).allowed).toBe(true)
  })

  test('chaves (IPs) independentes', () => {
    const t = 1_000_000
    expect(rateLimit('a', 1, 60_000, t).allowed).toBe(true)
    expect(rateLimit('a', 1, 60_000, t).allowed).toBe(false)
    expect(rateLimit('b', 1, 60_000, t).allowed).toBe(true)
  })
})
